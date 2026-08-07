import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ClarityVersion,
  broadcastTransaction,
  fetchNonce,
  makeContractDeploy,
} from "@stacks/transactions";
import { fetchWithTimeout } from "../demo/src/fetch-with-timeout.ts";

import {
  loadPublicTestnetAccounts,
  loadTestnetAccount,
} from "./testnet-account-utils.ts";
import {
  classifyDeploymentPreflight,
  readDeploymentPreflightEvidence,
} from "./testnet-deployment-preflight.ts";
import {
  acceptedTxId,
  hasPreparedTransaction,
  isExplicitTestnetBroadcast,
  persistPreparedTransaction,
} from "./testnet-transaction-utils.ts";

const broadcast = isExplicitTestnetBroadcast(process.argv);

const apiUrl = "https://api.testnet.hiro.so";
const publicAccounts = await loadPublicTestnetAccounts();

const deployments = [
  {
    role: "registry_deployer",
    contractName: "origin-registry-v2",
    sourcePath: "contracts/origin-registry-v2.clar",
    fee: 30_000n,
  },
  {
    role: "proof_deployer",
    contractName: "origin-domain-proof",
    sourcePath: "contracts/origin-domain-proof.clar",
    fee: 10_000n,
  },
  {
    role: "lifecycle_deployer",
    contractName: "origin-lifecycle-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
  {
    role: "expiry_deployer",
    contractName: "origin-expiry-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
] as const;

const nextNonceByAddress = new Map<string, bigint>();

for (const deployment of deployments) {
  const publicAccount = publicAccounts[deployment.role];
  if (!publicAccount) throw new Error(`Missing ${deployment.role} account`);
  const address = publicAccount.address;
  const principal = `${address}.${deployment.contractName}`;
  const codeBody = await readFile(resolve(deployment.sourcePath), "utf8");
  const sourceSha256 = createHash("sha256").update(codeBody).digest("hex");
  const existingContract = await fetchWithTimeout(
    fetch,
    `${apiUrl}/extended/v1/contract/${principal}`,
    undefined,
    8_000,
  );
  if (existingContract.ok) {
    const existing = (await existingContract.json()) as {
      source_code?: unknown;
      tx_id?: unknown;
    };
    if (existing.source_code !== codeBody)
      throw new Error(`Confirmed contract source mismatch for ${principal}`);
    if (
      broadcast &&
      (typeof existing.tx_id !== "string" ||
        !(await hasPreparedTransaction(existing.tx_id.replace(/^0x/, ""))))
    )
      throw new Error(
        `Confirmed contract ${principal} does not match a local prepared transaction`,
      );
    console.log(
      JSON.stringify({
        state: "confirmed",
        principal,
        txId: existing.tx_id,
      }),
    );
    continue;
  }
  if (existingContract.status !== 404)
    throw new Error(
      `Contract preflight failed for ${principal}: ${existingContract.status}`,
    );

  const nonce =
    nextNonceByAddress.get(address) ??
    (await fetchNonce({ address, network: "testnet" }));
  const intent = {
    state: broadcast ? "ready-to-sign" : "dry-run",
    role: deployment.role,
    principal,
    nonce: nonce.toString(),
    fee: deployment.fee.toString(),
    sourcePath: deployment.sourcePath,
    sourceSha256,
  };
  if (!broadcast) {
    console.log(JSON.stringify(intent));
    continue;
  }
  const signer = await loadTestnetAccount(deployment.role);
  const transaction = await makeContractDeploy({
    clarityVersion: ClarityVersion.Clarity5,
    codeBody,
    contractName: deployment.contractName,
    fee: deployment.fee,
    network: "testnet",
    nonce,
    senderKey: signer.account.stxPrivateKey,
  });
  const plannedTxId = transaction.txid();
  const evidence = await readDeploymentPreflightEvidence({
    apiUrl,
    principal,
    sender: address,
  });
  const preflight = classifyDeploymentPreflight({
    planned: {
      txId: plannedTxId,
      sender: address,
      nonce: Number(nonce),
      principal,
      sourceSha256,
      previouslyJournaled: await hasPreparedTransaction(plannedTxId),
    },
    ...evidence,
  });
  if (preflight.action !== "broadcast")
    throw new Error(
      `Deployment preflight ${preflight.action}: ${preflight.reason} for ${principal}`,
    );
  const prepared = await persistPreparedTransaction(transaction, intent);
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  const txId = acceptedTxId(result, `Deployment of ${deployment.contractName}`);
  if (txId.replace(/^0x/, "") !== prepared.txId.replace(/^0x/, ""))
    throw new Error(`Broadcast transaction ID mismatch for ${principal}`);

  nextNonceByAddress.set(address, nonce + 1n);
  console.log(
    JSON.stringify({
      principal,
      txId,
    }),
  );
}
