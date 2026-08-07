import {
  broadcastTransaction,
  fetchNonce,
  makeSTXTokenTransfer,
} from "@stacks/transactions";
import {
  loadTestnetAccount,
  testnetAccountRoles,
} from "./testnet-account-utils";
import {
  acceptedTxId,
  requireExplicitTestnetBroadcast,
} from "./testnet-transaction-utils";

requireExplicitTestnetBroadcast(process.argv);

const deployer = await loadTestnetAccount("deployer");

const recipients = await Promise.all(
  testnetAccountRoles
    .filter((role) => role !== "deployer")
    .map(async (role) => {
      const account = await loadTestnetAccount(role);
      return { role, address: account.address };
    }),
);
const firstNonce = await fetchNonce({
  address: deployer.address,
  network: "testnet",
});

for (const [index, recipient] of recipients.entries()) {
  const transaction = await makeSTXTokenTransfer({
    recipient: recipient.address,
    amount: 10_000_000n,
    nonce: firstNonce + BigInt(index),
    senderKey: deployer.account.stxPrivateKey,
    network: "testnet",
    memo: `Origin ${recipient.role}`,
  });
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  console.log(
    `${recipient.role}: ${acceptedTxId(result, `Funding ${recipient.role}`)}`,
  );
}
