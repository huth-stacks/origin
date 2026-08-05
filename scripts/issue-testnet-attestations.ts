import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  Cl,
  broadcastTransaction,
  fetchNonce,
  makeContractCall,
} from '@stacks/transactions';
import {
  generateNewAccount,
  generateWallet,
  getStxAddress,
} from '@stacks/wallet-sdk';

interface PublicAccount {
  address: string;
  derivation: string;
}

type PublicAccounts = Record<string, PublicAccount>;

const registryAddress = 'ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY';
const settingsPath = resolve('settings/Testnet.toml');
const publicAccountsPath = resolve('deployments/testnet-accounts.local.json');
const settings = await readFile(settingsPath, 'utf8');
const mnemonic = settings.match(/^mnemonic = "([^"]+)"$/m)?.[1];
if (!mnemonic) throw new Error(`No mnemonic found in ${settingsPath}`);

const publicAccounts = JSON.parse(await readFile(publicAccountsPath, 'utf8')) as PublicAccounts;
let wallet = await generateWallet({ secretKey: mnemonic, password: '' });
while (wallet.accounts.length < 3) wallet = generateNewAccount(wallet);

const networkInfoResponse = await fetch('https://api.testnet.hiro.so/v2/info');
if (!networkInfoResponse.ok)
  throw new Error(`Testnet info request failed: ${networkInfoResponse.status}`);
const networkInfo = (await networkInfoResponse.json()) as { burn_block_height?: unknown };
if (!Number.isSafeInteger(networkInfo.burn_block_height))
  throw new Error('Testnet returned an invalid burn height');
const expiresAt = (networkInfo.burn_block_height as number) + 100_000;

const issuances = [
  {
    role: 'trusted_attester',
    accountIndex: 1,
    subject: `${publicAccounts.deployer?.address}.acme-action`,
    issuerName: 'Acme',
    contractRole: 'Demo contract',
  },
  {
    role: 'unrecognized_issuer',
    accountIndex: 2,
    subject: `${publicAccounts.unrecognized_issuer?.address}.claimed-action`,
    issuerName: 'Definitely Acme',
    contractRole: 'Official contract',
  },
] as const;

for (const issuance of issuances) {
  const publicAccount = publicAccounts[issuance.role];
  if (!publicAccount || issuance.subject.startsWith('undefined.'))
    throw new Error(`Missing ${issuance.role} account`);
  const account = wallet.accounts[issuance.accountIndex];
  const address = getStxAddress({ account, network: 'testnet' });
  if (address !== publicAccount.address)
    throw new Error(`${issuance.role} does not match the generated public manifest`);

  const transaction = await makeContractCall({
    contractAddress: registryAddress,
    contractName: 'origin-registry',
    functionName: 'issue-attestation',
    functionArgs: [
      Cl.principal(issuance.subject),
      Cl.stringAscii(issuance.issuerName),
      Cl.stringAscii(issuance.contractRole),
      Cl.uint(expiresAt),
    ],
    nonce: await fetchNonce({ address, network: 'testnet' }),
    senderKey: account.stxPrivateKey,
    network: 'testnet',
  });
  const result = await broadcastTransaction({ transaction, network: 'testnet' });
  if (!('txid' in result))
    throw new Error(`Issuance from ${issuance.role} failed: ${JSON.stringify(result)}`);
  console.log(
    JSON.stringify({
      attester: address,
      subject: issuance.subject,
      expiresAt,
      txId: result.txid,
    })
  );
}
