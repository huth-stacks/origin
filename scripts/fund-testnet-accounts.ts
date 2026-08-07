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
  fundingJournalKey,
  fundingJournalPrefix,
  orderFundingJournals,
  planFundingTopUp,
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
  findPreparedTransactionsByJournalKeyPrefix,
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
      journalPrefix: fundingJournalPrefix(deployerAddress, address),
    };
  });
const journaledByRecipient = new Map(
  await Promise.all(
    recipients.map(
      async (recipient) =>
        [
          recipient.address,
          orderFundingJournals(
            await findPreparedTransactionsByJournalKeyPrefix(
              `${recipient.journalPrefix}:`,
            ),
            recipient.journalPrefix,
          ),
        ] as const,
    ),
  ),
);
const reservedNonces = new Set(
  [...journaledByRecipient.values()].flat().map(readJournaledNonce),
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
  const journals = journaledByRecipient.get(recipient.address) ?? [];
  for (const [sequence, journaled] of journals.entries()) {
    const nonce = readJournaledNonce(journaled);
    const journalKey = fundingJournalKey(
      deployerAddress,
      recipient.address,
      sequence,
    );
    const amount = readJournaledFundingAmount(journaled.intent, journalKey);
    if (broadcast) {
      const deployer = await loadTestnetAccount("registry_deployer");
      const transaction = await makeSTXTokenTransfer({
        recipient: recipient.address,
        amount,
        nonce,
        senderKey: deployer.account.stxPrivateKey,
        network: "testnet",
        memo: `Origin ${recipient.role}`,
      });
      if (journaled.txId !== transaction.txid())
        throw new Error(`Journaled funding mismatch for ${recipient.role}`);
    }
    const preflight = classifyTransactionPreflight({
      planned: {
        txId: journaled.txId,
        sender: deployerAddress,
        nonce: Number(nonce),
        previouslyJournaled: true,
      },
      ...(await readTransactionPreflightEvidence({
        apiUrl,
        txId: journaled.txId,
        sender: deployerAddress,
      })),
    });
    if (preflight.action !== "continue")
      throw new Error(
        `Funding preflight ${preflight.action}: ${preflight.reason} for ${recipient.role}`,
      );
    console.log(
      JSON.stringify({
        state: "confirmed",
        recipientRole: recipient.role,
        txId: journaled.txId,
      }),
    );
  }

  const topUp = planFundingTopUp(
    deployerAddress,
    recipient.address,
    await readStxBalance({ apiUrl, address: recipient.address }),
    journals.length,
  );
  if (!topUp) {
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
  const { amount, journalKey } = topUp;
  const nonce = allocateNonce();
  const intent = {
    journalKey,
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
