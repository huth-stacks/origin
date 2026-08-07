import {
  broadcastTransaction,
  fetchNonce,
  makeSTXTokenTransfer,
} from "@stacks/transactions";
import {
  loadPublicTestnetAccounts,
  loadTestnetAccount,
  testnetAccountRoles,
} from "./testnet-account-utils.ts";
import {
  classifyTransactionPreflight,
  readTransactionPreflightEvidence,
} from "./testnet-transaction-preflight.ts";
import {
  acceptedTxId,
  hasPreparedTransaction,
  isExplicitTestnetBroadcast,
  persistPreparedTransaction,
} from "./testnet-transaction-utils.ts";

const broadcast = isExplicitTestnetBroadcast(process.argv);
const apiUrl = "https://api.testnet.hiro.so";
const publicAccounts = await loadPublicTestnetAccounts();
const deployerAddress = publicAccounts.registry_deployer.address;

const recipients = testnetAccountRoles
  .filter((role) => role !== "registry_deployer")
  .map((role) => ({ role, address: publicAccounts[role].address }));
const firstNonce = await fetchNonce({
  address: deployerAddress,
  network: "testnet",
});

for (const [index, recipient] of recipients.entries()) {
  const nonce = firstNonce + BigInt(index);
  const intent = {
    state: broadcast ? "ready-to-sign" : "dry-run",
    sender: deployerAddress,
    recipientRole: recipient.role,
    recipient: recipient.address,
    amount: "10000000",
    nonce: nonce.toString(),
  };
  if (!broadcast) {
    console.log(JSON.stringify(intent));
    continue;
  }
  const deployer = await loadTestnetAccount("registry_deployer");
  const transaction = await makeSTXTokenTransfer({
    recipient: recipient.address,
    amount: 10_000_000n,
    nonce,
    senderKey: deployer.account.stxPrivateKey,
    network: "testnet",
    memo: `Origin ${recipient.role}`,
  });
  const plannedTxId = transaction.txid();
  const preflight = classifyTransactionPreflight({
    planned: {
      txId: plannedTxId,
      sender: deployerAddress,
      nonce: Number(nonce),
      previouslyJournaled: await hasPreparedTransaction(plannedTxId),
    },
    ...(await readTransactionPreflightEvidence({
      apiUrl,
      txId: plannedTxId,
      sender: deployerAddress,
    })),
  });
  if (preflight.action === "continue") {
    console.log(
      JSON.stringify({
        state: "confirmed",
        recipientRole: recipient.role,
        txId: plannedTxId,
      }),
    );
    continue;
  }
  if (preflight.action !== "broadcast")
    throw new Error(
      `Funding preflight ${preflight.action}: ${preflight.reason} for ${recipient.role}`,
    );
  const prepared = await persistPreparedTransaction(transaction, intent);
  const result = await broadcastTransaction({
    transaction,
    network: "testnet",
  });
  const txId = acceptedTxId(result, `Funding ${recipient.role}`);
  if (txId.replace(/^0x/, "") !== prepared.txId.replace(/^0x/, ""))
    throw new Error(`Broadcast transaction ID mismatch for ${recipient.role}`);
  console.log(`${recipient.role}: ${txId}`);
}
