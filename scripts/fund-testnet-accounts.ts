import {
  broadcastTransaction,
  fetchNonce,
  makeSTXTokenTransfer,
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
const deployer = await loadTestnetAccount("deployer");

const recipients = Object.entries(publicAccounts).filter(
  ([role]) => role !== "deployer",
);
const firstNonce = await fetchNonce({
  address: deployer.address,
  network: "testnet",
});

for (const [index, [role, account]] of recipients.entries()) {
  const transaction = await makeSTXTokenTransfer({
    recipient: account.address,
    amount: 10_000_000n,
    nonce: firstNonce + BigInt(index),
    senderKey: deployer.account.stxPrivateKey,
    network: "testnet",
    memo: `Origin ${role}`,
  });
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  console.log(`${role}: ${acceptedTxId(result, `Funding ${role}`)}`);
}
