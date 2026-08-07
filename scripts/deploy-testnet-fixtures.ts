import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ClarityVersion,
  broadcastTransaction,
  fetchNonce,
  makeContractDeploy,
} from "@stacks/transactions";

import {
  loadPublicTestnetAccounts,
  loadTestnetAccount,
} from "./testnet-account-utils";
import {
  acceptedTxId,
  requireExplicitTestnetBroadcast,
} from "./testnet-transaction-utils";

requireExplicitTestnetBroadcast(process.argv);

const apiUrl = "https://api.testnet.hiro.so";
const publicAccounts = await loadPublicTestnetAccounts();

const deployments = [
  {
    role: "deployer",
    contractName: "origin-registry",
    sourcePath: "contracts/origin-registry.clar",
    fee: 30_000n,
  },
  {
    role: "deployer",
    contractName: "acme-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
  {
    role: "unrecognized_issuer",
    contractName: "claimed-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
  {
    role: "lookalike_deployer",
    contractName: "acme-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
] as const;

const nextNonceByAddress = new Map<string, bigint>();

for (const deployment of deployments) {
  const publicAccount = publicAccounts[deployment.role];
  if (!publicAccount) throw new Error(`Missing ${deployment.role} account`);
  const signer = await loadTestnetAccount(deployment.role);
  const address = signer.address;
  const principal = `${address}.${deployment.contractName}`;
  const existingContract = await fetch(
    `${apiUrl}/extended/v1/contract/${principal}`,
  );
  if (existingContract.ok)
    throw new Error(`Refusing to redeploy existing contract ${principal}`);
  if (existingContract.status !== 404)
    throw new Error(
      `Contract preflight failed for ${principal}: ${existingContract.status}`,
    );

  const nonce =
    nextNonceByAddress.get(address) ??
    (await fetchNonce({ address, network: "testnet" }));
  const transaction = await makeContractDeploy({
    clarityVersion: ClarityVersion.Clarity5,
    codeBody: await readFile(resolve(deployment.sourcePath), "utf8"),
    contractName: deployment.contractName,
    fee: deployment.fee,
    network: "testnet",
    nonce,
    senderKey: signer.account.stxPrivateKey,
  });
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  const txId = acceptedTxId(result, `Deployment of ${deployment.contractName}`);

  nextNonceByAddress.set(address, nonce + 1n);
  console.log(
    JSON.stringify({
      principal,
      txId,
    }),
  );
}
