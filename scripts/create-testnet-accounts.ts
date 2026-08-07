import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  generateWallet,
  getStxAddress,
  randomSeedPhrase,
} from "@stacks/wallet-sdk";

import {
  privateAccountPath,
  testnetAccountRoles,
} from "./testnet-account-utils.ts";

const publicAccountsPath = resolve(
  "deployments/testnet-v2-accounts.local.json",
);

async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const outputPaths = [
  publicAccountsPath,
  ...testnetAccountRoles.map(privateAccountPath),
];
const existingPath = (
  await Promise.all(
    outputPaths.map(async (path) => ({ path, exists: await pathExists(path) })),
  )
).find(({ exists }) => exists)?.path;
if (existingPath) throw new Error(`Refusing to overwrite ${existingPath}`);

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

await mkdir(dirname(privateAccountPath(testnetAccountRoles[0])), {
  recursive: true,
});
await mkdir(dirname(publicAccountsPath), { recursive: true });
for (const { role, mnemonic, derivation } of generatedAccounts) {
  const path = privateAccountPath(role);
  await writeFile(
    path,
    `${JSON.stringify({ role, mnemonic, derivation }, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    },
  );
  await chmod(path, 0o600);
}
await writeFile(
  publicAccountsPath,
  `${JSON.stringify(publicAccounts, null, 2)}\n`,
  {
    encoding: "utf8",
    flag: "wx",
  },
);

console.log("Created one ignored private Testnet file per account role");
console.log(`Created public account manifest at ${publicAccountsPath}`);
console.log(JSON.stringify(publicAccounts, null, 2));
