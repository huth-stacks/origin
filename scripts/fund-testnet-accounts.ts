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
  fundingAmountForBalance,
  fundingJournalKey,
  readJournaledFundingAmount,
  readStxBalance,
  testnetRoleTargetBalance,
} from "./testnet-funding.ts";
import {
  classifyTransactionPreflight,
  readTransactionPreflightEvidence,
} from "./testnet-transaction-preflight.ts";
import {
  acceptedTxId,
  findPreparedTransactionByJournalKey,
  hasPreparedTransaction,
  isExplicitTestnetBroadcast,
  persistPreparedTransaction,
  readJournaledNonce,
} from "./testnet-transaction-utils.ts";

const broadcast = isExplicitTestnetBroadcast(process.argv);
const apiUrl = "https://api.testnet.hiro.so";
const publicAccounts = await loadPublicTestnetAccounts();
const deployerAddress = publicAccounts.registry_deployer.address;

const recipients = testnetAccountRoles
  .filter((role) => role !== "registry_deployer")
  .map((role) => {
    const address = publicAccounts[role].address;
    return {
      role,
      address,
      journalKey: fundingJournalKey(deployerAddress, address),
    };
  });
const journaledByKey = new Map(
  await Promise.all(
    recipients.map(
      async (recipient) =>
        [
          recipient.journalKey,
          await findPreparedTransactionByJournalKey(recipient.journalKey),
        ] as const,
    ),
  ),
);
const reservedNonces = new Set(
  [...journaledByKey.values()]
    .filter((record) => record !== undefined)
    .map(readJournaledNonce),
);
let nextNonce = await fetchNonce({
  address: deployerAddress,
  network: "testnet",
});

function allocateNonce() {
  while (reservedNonces.has(nextNonce)) nextNonce += 1n;
  const nonce = nextNonce;
  nextNonce += 1n;
  return nonce;
}

for (const recipient of recipients) {
  const journaled = journaledByKey.get(recipient.journalKey);
  const amount = journaled
    ? readJournaledFundingAmount(journaled.intent, recipient.journalKey)
    : fundingAmountForBalance(
        await readStxBalance({ apiUrl, address: recipient.address }),
      );
  if (amount === 0n) {
    console.log(
      JSON.stringify({
        state: "sufficient-balance",
        recipientRole: recipient.role,
        recipient: recipient.address,
        targetBalance: testnetRoleTargetBalance.toString(),
      }),
    );
    continue;
  }
  const nonce = journaled ? readJournaledNonce(journaled) : allocateNonce();
  const intent = {
    journalKey: recipient.journalKey,
    sender: deployerAddress,
    recipientRole: recipient.role,
    recipient: recipient.address,
    targetBalance: testnetRoleTargetBalance.toString(),
    amount: amount.toString(),
    nonce: nonce.toString(),
  };
  if (!broadcast) {
    console.log(JSON.stringify({ state: "dry-run", ...intent }));
    continue;
  }
  const deployer = await loadTestnetAccount("registry_deployer");
  const transaction = await makeSTXTokenTransfer({
    recipient: recipient.address,
    amount,
    nonce,
    senderKey: deployer.account.stxPrivateKey,
    network: "testnet",
    memo: `Origin ${recipient.role}`,
  });
  const plannedTxId = transaction.txid();
  if (journaled && journaled.txId !== plannedTxId)
    throw new Error(`Journaled funding mismatch for ${recipient.role}`);
  const preflight = classifyTransactionPreflight({
    planned: {
      txId: plannedTxId,
      sender: deployerAddress,
      nonce: Number(nonce),
      previouslyJournaled:
        journaled !== undefined || (await hasPreparedTransaction(plannedTxId)),
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
