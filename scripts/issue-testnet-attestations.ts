import {
  Cl,
  broadcastTransaction,
  fetchNonce,
  makeContractCall,
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

const publicAccounts = await loadPublicTestnetAccounts();
const registryAddress = publicAccounts.deployer.address;

const networkInfoResponse = await fetch("https://api.testnet.hiro.so/v2/info");
if (!networkInfoResponse.ok)
  throw new Error(`Testnet info request failed: ${networkInfoResponse.status}`);
const networkInfo = (await networkInfoResponse.json()) as {
  burn_block_height?: unknown;
};
if (!Number.isSafeInteger(networkInfo.burn_block_height))
  throw new Error("Testnet returned an invalid burn height");
const expiresAt = (networkInfo.burn_block_height as number) + 100_000;

const issuances = [
  {
    role: "trusted_attester",
    subject: `${publicAccounts.deployer?.address}.acme-action`,
    issuerName: "Acme",
    contractRole: "Demo contract",
  },
  {
    role: "unrecognized_issuer",
    subject: `${publicAccounts.unrecognized_issuer?.address}.claimed-action`,
    issuerName: "Definitely Acme",
    contractRole: "Official contract",
  },
] as const;

for (const issuance of issuances) {
  const publicAccount = publicAccounts[issuance.role];
  if (!publicAccount || issuance.subject.startsWith("undefined."))
    throw new Error(`Missing ${issuance.role} account`);
  const signer = await loadTestnetAccount(issuance.role);

  const transaction = await makeContractCall({
    contractAddress: registryAddress,
    contractName: "origin-registry",
    functionName: "issue-attestation",
    functionArgs: [
      Cl.principal(issuance.subject),
      Cl.stringAscii(issuance.issuerName),
      Cl.stringAscii(issuance.contractRole),
      Cl.uint(expiresAt),
    ],
    nonce: await fetchNonce({ address: signer.address, network: "testnet" }),
    senderKey: signer.account.stxPrivateKey,
    network: "testnet",
  });
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  const txId = acceptedTxId(result, `Issuance from ${issuance.role}`);
  console.log(
    JSON.stringify({
      attester: signer.address,
      subject: issuance.subject,
      expiresAt,
      txId,
    }),
  );
}
