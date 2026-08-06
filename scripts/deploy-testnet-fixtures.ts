import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ClarityVersion,
  broadcastTransaction,
  fetchNonce,
  makeContractDeploy,
} from "@stacks/transactions";
import {
  generateNewAccount,
  generateWallet,
  getStxAddress,
} from "@stacks/wallet-sdk";

interface PublicAccount {
  address: string;
  derivation: string;
}

type PublicAccounts = Record<string, PublicAccount>;

const settingsPath = resolve("settings/Testnet.toml");
const publicAccountsPath = resolve("deployments/testnet-accounts.local.json");
const settings = await readFile(settingsPath, "utf8");
const mnemonic = settings.match(/^mnemonic = "([^"]+)"$/m)?.[1];
if (!mnemonic) throw new Error(`No mnemonic found in ${settingsPath}`);

const publicAccounts = JSON.parse(
  await readFile(publicAccountsPath, "utf8"),
) as PublicAccounts;
let wallet = await generateWallet({ secretKey: mnemonic, password: "" });
while (wallet.accounts.length < 4) wallet = generateNewAccount(wallet);

const deployments = [
  {
    role: "deployer",
    accountIndex: 0,
    contractName: "origin-registry",
    sourcePath: "contracts/origin-registry.clar",
    fee: 30_000n,
  },
  {
    role: "deployer",
    accountIndex: 0,
    contractName: "acme-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
  {
    role: "unrecognized_issuer",
    accountIndex: 2,
    contractName: "claimed-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
  {
    role: "lookalike_deployer",
    accountIndex: 3,
    contractName: "acme-action",
    sourcePath: "contracts/origin-demo-target.clar",
    fee: 10_000n,
  },
] as const;

const nextNonceByAddress = new Map<string, bigint>();

for (const deployment of deployments) {
  const publicAccount = publicAccounts[deployment.role];
  if (!publicAccount) throw new Error(`Missing ${deployment.role} account`);
  const account = wallet.accounts[deployment.accountIndex];
  const address = getStxAddress({ account, network: "testnet" });
  if (address !== publicAccount.address)
    throw new Error(
      `${deployment.role} does not match the generated public manifest`,
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
    senderKey: account.stxPrivateKey,
  });
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  if (!("txid" in result))
    throw new Error(
      `Deployment of ${deployment.contractName} failed: ${JSON.stringify(result)}`,
    );

  nextNonceByAddress.set(address, nonce + 1n);
  console.log(
    JSON.stringify({
      principal: `${address}.${deployment.contractName}`,
      txId: result.txid,
    }),
  );
}
