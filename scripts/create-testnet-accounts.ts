import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  generateWallet,
  getStxAddress,
  randomSeedPhrase,
} from "@stacks/wallet-sdk";

import { testnetAccountRoles } from "./testnet-account-utils";

const settingsPath = resolve("settings/Testnet.toml");
const publicAccountsPath = resolve("deployments/testnet-accounts.local.json");

const generatedAccounts = await Promise.all(
  testnetAccountRoles.map(async (role) => {
    const mnemonic = randomSeedPhrase();
    const wallet = await generateWallet({ secretKey: mnemonic, password: "" });
    const derivation = "m/44'/5757'/0'/0/0";
    return {
      role,
      mnemonic,
      derivation,
      address: getStxAddress({
        account: wallet.accounts[0],
        network: "testnet",
      }),
    };
  }),
);
if (
  new Set(generatedAccounts.map((account) => account.mnemonic)).size !==
  generatedAccounts.length
)
  throw new Error("Testnet account generation produced a duplicate seed");

const publicAccounts = Object.fromEntries(
  generatedAccounts.map(({ role, address, derivation }) => [
    role,
    { address, derivation },
  ]),
);

const accountSettings = generatedAccounts
  .map(
    ({ role, mnemonic, derivation }) => `[accounts.${role}]
mnemonic = "${mnemonic}"
derivation = "${derivation}"`,
  )
  .join("\n\n");

const testnetSettings = `[network]
name = "testnet"
stacks_node_rpc_address = "https://api.testnet.hiro.so"
deployment_fee_rate = 10

${accountSettings}
`;

await mkdir(dirname(settingsPath), { recursive: true });
await mkdir(dirname(publicAccountsPath), { recursive: true });
await writeFile(settingsPath, testnetSettings, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});
await chmod(settingsPath, 0o600);
await writeFile(
  publicAccountsPath,
  `${JSON.stringify(publicAccounts, null, 2)}\n`,
  {
    encoding: "utf8",
    flag: "wx",
  },
);

console.log(`Created ignored Testnet settings at ${settingsPath}`);
console.log(`Created public account manifest at ${publicAccountsPath}`);
console.log(JSON.stringify(publicAccounts, null, 2));
