import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  Cl,
  broadcastTransaction,
  fetchNonce,
  makeContractCall,
} from "@stacks/transactions";
import { fetchJsonWithTimeout } from "../demo/src/fetch-with-timeout.ts";

import {
  loadPublicTestnetAccounts,
  loadTestnetAccount,
  type TestnetAccountRole,
} from "./testnet-account-utils.ts";
import { prepareIssuanceIntent } from "./testnet-issuance-intent.ts";
import {
  classifyTransactionPreflight,
  readTransactionPreflightEvidence,
} from "./testnet-transaction-preflight.ts";
import {
  acceptedTxId,
  canPrepareSequencedNonce,
  findPreparedTransactionByJournalKey,
  isExplicitTestnetBroadcast,
  isExplicitTestnetPrepare,
  markPreparedTransactionBroadcastAttempted,
  persistPreparedTransaction,
  readJournaledNonce,
  wasPreparedTransactionBroadcastAttempted,
} from "./testnet-transaction-utils.ts";

interface CurrentManifest {
  fixtures: {
    known: { subject: string };
    unrecognized: { subject: string };
  };
}

function readUintArgument(name: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || !/^\d+$/.test(value))
    throw new Error(`Missing required ${name} integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid ${name} integer`);
  return parsed;
}

function readStringArgument(name: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing required ${name} value`);
  return value;
}

const broadcast = isExplicitTestnetBroadcast(process.argv);
const prepare = isExplicitTestnetPrepare(process.argv);
const shouldSign = prepare || broadcast;
const issuanceIntentId = readStringArgument("--intent-id");
const apiUrl = "https://api.testnet.hiro.so";
const canonicalExpiresAt = readUintArgument("--canonical-expires-at");
const shortExpiresAt = readUintArgument("--short-expires-at");
const publicAccounts = await loadPublicTestnetAccounts();
const currentManifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as CurrentManifest;
const registryAddress = publicAccounts.registry_deployer.address;
const registryName = "origin-registry-v2";
const issuanceFee = 10_000n;

const networkInfoResponse = await fetchJsonWithTimeout(
  fetch,
  "https://api.testnet.hiro.so/v2/info",
  undefined,
  8_000,
);
if (!networkInfoResponse.ok)
  throw new Error(`Testnet info request failed: ${networkInfoResponse.status}`);
const networkInfo = networkInfoResponse.value as {
  burn_block_height?: unknown;
};
if (!Number.isSafeInteger(networkInfo.burn_block_height))
  throw new Error("Testnet returned an invalid burn height");
const burnBlockHeight = networkInfo.burn_block_height as number;
if (canonicalExpiresAt <= burnBlockHeight)
  throw new Error("Canonical expiry must be above the current burn height");
if (shortExpiresAt <= burnBlockHeight)
  throw new Error("Short expiry must be above the current burn height");
if (shortExpiresAt >= canonicalExpiresAt)
  throw new Error("Short expiry must be below the canonical expiry");

const issuanceTargets: {
  role: TestnetAccountRole;
  subject: string;
  issuerName: string;
  contractRole: string;
  expiresAt: number;
}[] = [
  {
    role: "canonical_attester",
    subject: currentManifest.fixtures.known.subject,
    issuerName: "Acme",
    contractRole: "Demo contract",
    expiresAt: canonicalExpiresAt,
  },
  {
    role: "unrecognized_issuer",
    subject: currentManifest.fixtures.unrecognized.subject,
    issuerName: "Definitely Acme",
    contractRole: "Official contract",
    expiresAt: canonicalExpiresAt,
  },
  {
    role: "canonical_attester",
    subject: `${publicAccounts.lifecycle_deployer.address}.origin-lifecycle-action`,
    issuerName: "Origin lifecycle fixture",
    contractRole: "Demo contract",
    expiresAt: canonicalExpiresAt,
  },
  {
    role: "canonical_attester",
    subject: `${publicAccounts.expiry_deployer.address}.origin-expiry-action`,
    issuerName: "Origin expiry fixture",
    contractRole: "Demo contract",
    expiresAt: shortExpiresAt,
  },
];

const preparedIntent = await prepareIssuanceIntent({
  intentId: issuanceIntentId,
  targets: issuanceTargets.map((issuance) => ({
    attesterRole: issuance.role,
    subject: issuance.subject,
    issuerName: issuance.issuerName,
    contractRole: issuance.contractRole,
    expiresAt: issuance.expiresAt,
  })),
});
const issuances = preparedIntent.issuances.map((issuance) => ({
  role: issuance.attesterRole as TestnetAccountRole,
  subject: issuance.subject,
  issuerName: issuance.issuerName,
  contractRole: issuance.contractRole,
  expiresAt: issuance.expiresAt,
  request: Cl.bufferFromHex(issuance.requestId),
  journalKey: `issue:${issuanceIntentId}:${issuance.attesterRole}:${issuance.subject}`,
}));

const journaledByKey = new Map(
  await Promise.all(
    issuances.map(
      async (issuance) =>
        [
          issuance.journalKey,
          await findPreparedTransactionByJournalKey(issuance.journalKey),
        ] as const,
    ),
  ),
);
const reservedNoncesByAddress = new Map<string, Set<bigint>>();
for (const issuance of issuances) {
  const journaled = journaledByKey.get(issuance.journalKey);
  if (!journaled) continue;
  const address = publicAccounts[issuance.role].address;
  const reserved = reservedNoncesByAddress.get(address) ?? new Set<bigint>();
  reserved.add(readJournaledNonce(journaled));
  reservedNoncesByAddress.set(address, reserved);
}
const nextNonceByAddress = new Map<string, bigint>();

function allowContiguousPreparationNonce<
  T extends Awaited<ReturnType<typeof readTransactionPreflightEvidence>>,
>(address: string, evidence: T, plannedNonce: bigint): T {
  const reserved = reservedNoncesByAddress.get(address) ?? new Set<bigint>();
  if (
    !prepare ||
    evidence.nonce.state !== "available" ||
    !canPrepareSequencedNonce(
      evidence.nonce.possibleNextNonce,
      plannedNonce,
      reserved,
    )
  )
    return evidence;
  return {
    ...evidence,
    nonce: { state: "available", possibleNextNonce: Number(plannedNonce) },
  };
}

function reservePreparedNonce(address: string, nonce: bigint) {
  const reserved = reservedNoncesByAddress.get(address) ?? new Set<bigint>();
  reserved.add(nonce);
  reservedNoncesByAddress.set(address, reserved);
}

async function allocateNonce(address: string) {
  let nonce =
    nextNonceByAddress.get(address) ??
    (await fetchNonce({ address, network: "testnet" }));
  const reserved = reservedNoncesByAddress.get(address);
  while (reserved?.has(nonce)) nonce += 1n;
  nextNonceByAddress.set(address, nonce + 1n);
  return nonce;
}

for (const issuance of issuances) {
  const publicAccount = publicAccounts[issuance.role];
  const journaled = journaledByKey.get(issuance.journalKey);
  const nonce = journaled
    ? readJournaledNonce(journaled)
    : await allocateNonce(publicAccount.address);
  const intent = {
    journalKey: issuance.journalKey,
    issuanceIntentId,
    role: issuance.role,
    registry: `${registryAddress}.${registryName}`,
    functionName: "issue-attestation",
    subject: issuance.subject,
    issuerName: issuance.issuerName,
    contractRole: issuance.contractRole,
    expiresAt: issuance.expiresAt,
    requestId: issuance.request.value,
    nonce: nonce.toString(),
    fee: issuanceFee.toString(),
  };
  if (!shouldSign) {
    console.log(JSON.stringify({ state: "dry-run", ...intent }));
    continue;
  }

  const signer = await loadTestnetAccount(issuance.role);
  const transaction = await makeContractCall({
    contractAddress: registryAddress,
    contractName: registryName,
    functionName: "issue-attestation",
    functionArgs: [
      Cl.principal(issuance.subject),
      Cl.stringAscii(issuance.issuerName),
      Cl.stringAscii(issuance.contractRole),
      Cl.uint(issuance.expiresAt),
      issuance.request,
    ],
    nonce,
    fee: issuanceFee,
    senderKey: signer.account.stxPrivateKey,
    network: "testnet",
  });
  const plannedTxId = transaction.txid();
  if (journaled && journaled.txId !== plannedTxId)
    throw new Error(`Journaled issuance mismatch for ${issuance.subject}`);
  const evidence = allowContiguousPreparationNonce(
    publicAccount.address,
    await readTransactionPreflightEvidence({
      apiUrl,
      txId: plannedTxId,
      sender: publicAccount.address,
    }),
    nonce,
  );
  const preflight = classifyTransactionPreflight({
    planned: {
      txId: plannedTxId,
      sender: publicAccount.address,
      nonce: Number(nonce),
      previouslyJournaled:
        journaled?.state === "broadcast-attempted" ||
        (await wasPreparedTransactionBroadcastAttempted(plannedTxId)),
    },
    ...evidence,
  });
  if (preflight.action === "continue") {
    console.log(
      JSON.stringify({
        state: "confirmed",
        attester: publicAccount.address,
        subject: issuance.subject,
        txId: plannedTxId,
      }),
    );
    continue;
  }
  if (preflight.action !== "broadcast")
    throw new Error(
      `Issuance preflight ${preflight.action}: ${preflight.reason} for ${issuance.subject}`,
    );
  const prepared = await persistPreparedTransaction(transaction, intent);
  reservePreparedNonce(publicAccount.address, nonce);
  if (prepare) {
    console.log(
      JSON.stringify({
        state: "prepared",
        attester: publicAccount.address,
        subject: issuance.subject,
        txId: prepared.txId,
      }),
    );
    continue;
  }
  await markPreparedTransactionBroadcastAttempted(prepared.txId);
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  const txId = acceptedTxId(result, `Issuance from ${issuance.role}`);
  if (txId.replace(/^0x/, "") !== prepared.txId.replace(/^0x/, ""))
    throw new Error(
      `Broadcast transaction ID mismatch for ${issuance.subject}`,
    );
  console.log(
    JSON.stringify({
      attester: signer.address,
      subject: issuance.subject,
      expiresAt: issuance.expiresAt,
      requestId: issuance.request.value,
      txId,
    }),
  );
}
