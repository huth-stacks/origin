import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  Cl,
  broadcastTransaction,
  fetchNonce,
  makeContractCall,
} from "@stacks/transactions";

import {
  loadPublicTestnetAccounts,
  loadTestnetAccount,
  type TestnetAccountRole,
} from "./testnet-account-utils.ts";
import {
  classifyTransactionPreflight,
  readTransactionPreflightEvidence,
} from "./testnet-transaction-preflight.ts";
import {
  acceptedTxId,
  hasPreparedTransaction,
  isExplicitTestnetBroadcast,
  persistPreparedTransaction,
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

function requestId(label: string) {
  return Cl.buffer(createHash("sha256").update(`origin-v2:${label}`).digest());
}

const broadcast = isExplicitTestnetBroadcast(process.argv);
const apiUrl = "https://api.testnet.hiro.so";
const canonicalExpiresAt = readUintArgument("--canonical-expires-at");
const shortExpiresAt = readUintArgument("--short-expires-at");
const publicAccounts = await loadPublicTestnetAccounts();
const currentManifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as CurrentManifest;
const registryAddress = publicAccounts.registry_deployer.address;
const registryName = "origin-registry-v2";

const networkInfoResponse = await fetch("https://api.testnet.hiro.so/v2/info");
if (!networkInfoResponse.ok)
  throw new Error(`Testnet info request failed: ${networkInfoResponse.status}`);
const networkInfo = (await networkInfoResponse.json()) as {
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

const issuances: {
  role: TestnetAccountRole;
  subject: string;
  issuerName: string;
  contractRole: string;
  expiresAt: number;
  request: ReturnType<typeof requestId>;
}[] = [
  {
    role: "canonical_attester",
    subject: currentManifest.fixtures.known.subject,
    issuerName: "Acme",
    contractRole: "Demo contract",
    expiresAt: canonicalExpiresAt,
    request: requestId(`canonical:${currentManifest.fixtures.known.subject}`),
  },
  {
    role: "unrecognized_issuer",
    subject: currentManifest.fixtures.unrecognized.subject,
    issuerName: "Definitely Acme",
    contractRole: "Official contract",
    expiresAt: canonicalExpiresAt,
    request: requestId(
      `unrecognized:${currentManifest.fixtures.unrecognized.subject}`,
    ),
  },
  {
    role: "canonical_attester",
    subject: `${publicAccounts.lifecycle_deployer.address}.origin-lifecycle-action`,
    issuerName: "Origin lifecycle fixture",
    contractRole: "Demo contract",
    expiresAt: canonicalExpiresAt,
    request: requestId("lifecycle"),
  },
  {
    role: "canonical_attester",
    subject: `${publicAccounts.expiry_deployer.address}.origin-expiry-action`,
    issuerName: "Origin expiry fixture",
    contractRole: "Demo contract",
    expiresAt: shortExpiresAt,
    request: requestId("expiry"),
  },
];

const nextNonceByAddress = new Map<string, bigint>();

for (const issuance of issuances) {
  const publicAccount = publicAccounts[issuance.role];
  const nonce =
    nextNonceByAddress.get(publicAccount.address) ??
    (await fetchNonce({ address: publicAccount.address, network: "testnet" }));
  const intent = {
    state: broadcast ? "ready-to-sign" : "dry-run",
    role: issuance.role,
    registry: `${registryAddress}.${registryName}`,
    functionName: "issue-attestation",
    subject: issuance.subject,
    issuerName: issuance.issuerName,
    contractRole: issuance.contractRole,
    expiresAt: issuance.expiresAt,
    requestId: issuance.request.value,
    nonce: nonce.toString(),
  };
  if (!broadcast) {
    console.log(JSON.stringify(intent));
    nextNonceByAddress.set(publicAccount.address, nonce + 1n);
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
    senderKey: signer.account.stxPrivateKey,
    network: "testnet",
  });
  const plannedTxId = transaction.txid();
  const preflight = classifyTransactionPreflight({
    planned: {
      txId: plannedTxId,
      sender: publicAccount.address,
      nonce: Number(nonce),
      previouslyJournaled: await hasPreparedTransaction(plannedTxId),
    },
    ...(await readTransactionPreflightEvidence({
      apiUrl,
      txId: plannedTxId,
      sender: publicAccount.address,
    })),
  });
  if (preflight.action === "continue") {
    nextNonceByAddress.set(publicAccount.address, nonce + 1n);
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
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  const txId = acceptedTxId(result, `Issuance from ${issuance.role}`);
  if (txId.replace(/^0x/, "") !== prepared.txId.replace(/^0x/, ""))
    throw new Error(
      `Broadcast transaction ID mismatch for ${issuance.subject}`,
    );
  nextNonceByAddress.set(publicAccount.address, nonce + 1n);
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
