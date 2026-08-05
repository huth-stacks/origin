import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import {
  generateNewAccount,
  generateWallet,
  getStxAddress,
  randomSeedPhrase,
} from '@stacks/wallet-sdk';

const settingsPath = resolve('settings/Testnet.toml');
const publicAccountsPath = resolve('deployments/testnet-accounts.local.json');

const accountRoles = [
  'deployer',
  'trusted_attester',
  'unrecognized_issuer',
  'lookalike_deployer',
] as const;

const mnemonic = randomSeedPhrase();
let wallet = await generateWallet({ secretKey: mnemonic, password: '' });

while (wallet.accounts.length < accountRoles.length) wallet = generateNewAccount(wallet);

const publicAccounts = Object.fromEntries(
  accountRoles.map((role, index) => [
    role,
    {
      address: getStxAddress({ account: wallet.accounts[index], network: 'testnet' }),
      derivation: `m/44'/5757'/0'/0/${index}`,
    },
  ])
);

const accountSettings = accountRoles
  .map(
    (role, index) => `[accounts.${role}]
mnemonic = "${mnemonic}"
derivation = "m/44'/5757'/0'/0/${index}"`
  )
  .join('\n\n');

const testnetSettings = `[network]
name = "testnet"
stacks_node_rpc_address = "https://api.testnet.hiro.so"
deployment_fee_rate = 10

${accountSettings}
`;

await mkdir(dirname(settingsPath), { recursive: true });
await mkdir(dirname(publicAccountsPath), { recursive: true });
await writeFile(settingsPath, testnetSettings, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
await chmod(settingsPath, 0o600);
await writeFile(publicAccountsPath, `${JSON.stringify(publicAccounts, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
});

console.log(`Created ignored Testnet settings at ${settingsPath}`);
console.log(`Created public account manifest at ${publicAccountsPath}`);
console.log(JSON.stringify(publicAccounts, null, 2));
