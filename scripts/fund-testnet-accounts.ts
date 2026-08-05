import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  broadcastTransaction,
  fetchNonce,
  makeSTXTokenTransfer,
} from '@stacks/transactions';
import { generateWallet } from '@stacks/wallet-sdk';

interface PublicAccount {
  address: string;
  derivation: string;
}

type PublicAccounts = Record<string, PublicAccount>;

const settingsPath = resolve('settings/Testnet.toml');
const publicAccountsPath = resolve('deployments/testnet-accounts.local.json');
const settings = await readFile(settingsPath, 'utf8');
const mnemonic = settings.match(/^mnemonic = "([^"]+)"$/m)?.[1];
if (!mnemonic) throw new Error(`No mnemonic found in ${settingsPath}`);

const publicAccounts = JSON.parse(await readFile(publicAccountsPath, 'utf8')) as PublicAccounts;
const deployer = publicAccounts.deployer;
if (!deployer) throw new Error(`No deployer found in ${publicAccountsPath}`);

const recipients = Object.entries(publicAccounts).filter(([role]) => role !== 'deployer');
const wallet = await generateWallet({ secretKey: mnemonic, password: '' });
const firstNonce = await fetchNonce({ address: deployer.address, network: 'testnet' });

for (const [index, [role, account]] of recipients.entries()) {
  const transaction = await makeSTXTokenTransfer({
    recipient: account.address,
    amount: 10_000_000n,
    nonce: firstNonce + BigInt(index),
    senderKey: wallet.accounts[0].stxPrivateKey,
    network: 'testnet',
    memo: `Origin ${role}`,
  });
  const result = await broadcastTransaction({ transaction, network: 'testnet' });
  if (!('txid' in result)) throw new Error(`Funding ${role} failed: ${JSON.stringify(result)}`);
  console.log(`${role}: ${result.txid}`);
}
