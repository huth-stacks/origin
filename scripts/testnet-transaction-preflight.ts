interface PlannedTransaction {
  txId: string;
  sender: string;
  nonce: number;
  previouslyJournaled: boolean;
}

type TransactionEvidence =
  | { state: "absent" }
  | { state: "unavailable" }
  | { state: "pending" }
  | { state: "confirmed" }
  | { state: "rejected" };

type MempoolEvidence =
  | { state: "unavailable" }
  | {
      state: "available";
      transactions: readonly {
        txId: string;
        sender: string;
        nonce: number;
      }[];
    };

type NonceEvidence =
  { state: "unavailable" } | { state: "available"; possibleNextNonce: number };

export type TransactionPreflightResult =
  | { action: "broadcast"; reason: "ready" }
  | { action: "wait"; reason: "exact-pending" }
  | { action: "continue"; reason: "exact-confirmed" }
  | {
      action: "stop";
      reason:
        | "exact-rejected"
        | "transaction-unavailable"
        | "conflicting-pending"
        | "mempool-unavailable"
        | "nonce-unavailable"
        | "nonce-mismatch";
    }
  | { action: "reconcile"; reason: "prior-attempt-absent" };

interface ClassifyTransactionPreflightArgs {
  planned: PlannedTransaction;
  transaction: TransactionEvidence;
  mempool: MempoolEvidence;
  nonce: NonceEvidence;
}

interface ReadTransactionPreflightEvidenceArgs {
  apiUrl: string;
  txId: string;
  sender: string;
  fetchFn?: typeof fetch;
}

function normalizeTxId(value: string) {
  return value.replace(/^0x/, "").toLowerCase();
}

export function classifyTransactionPreflight({
  planned,
  transaction,
  mempool,
  nonce,
}: ClassifyTransactionPreflightArgs): TransactionPreflightResult {
  if (transaction.state === "confirmed")
    return { action: "continue", reason: "exact-confirmed" };
  if (transaction.state === "pending")
    return { action: "wait", reason: "exact-pending" };
  if (transaction.state === "rejected")
    return { action: "stop", reason: "exact-rejected" };
  if (transaction.state === "unavailable")
    return { action: "stop", reason: "transaction-unavailable" };
  if (mempool.state === "unavailable")
    return { action: "stop", reason: "mempool-unavailable" };
  const senderTransactions = mempool.transactions.filter(
    (candidate) => candidate.sender === planned.sender,
  );
  if (
    senderTransactions.some(
      (candidate) =>
        normalizeTxId(candidate.txId) === normalizeTxId(planned.txId),
    )
  )
    return { action: "wait", reason: "exact-pending" };
  if (senderTransactions.some((candidate) => candidate.nonce === planned.nonce))
    return { action: "stop", reason: "conflicting-pending" };
  if (planned.previouslyJournaled)
    return { action: "reconcile", reason: "prior-attempt-absent" };
  if (nonce.state === "unavailable")
    return { action: "stop", reason: "nonce-unavailable" };
  if (nonce.possibleNextNonce !== planned.nonce)
    return { action: "stop", reason: "nonce-mismatch" };
  return { action: "broadcast", reason: "ready" };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMempoolTransaction(value: unknown) {
  if (
    !isObject(value) ||
    typeof value.tx_id !== "string" ||
    !isObject(value.sender) ||
    typeof value.sender.address !== "string" ||
    !Number.isSafeInteger(value.sender.nonce) ||
    typeof value.sender.nonce !== "number"
  )
    return null;
  return {
    txId: value.tx_id,
    sender: value.sender.address,
    nonce: value.sender.nonce,
  };
}

function parseTransactionEvidence(value: unknown): TransactionEvidence {
  if (!isObject(value) || typeof value.tx_status !== "string")
    return { state: "unavailable" };
  if (value.tx_status === "pending" || value.is_unanchored === true)
    return { state: "pending" };
  if (value.tx_status === "success") return { state: "confirmed" };
  if (
    value.tx_status === "abort_by_response" ||
    value.tx_status === "abort_by_post_condition"
  )
    return { state: "rejected" };
  return { state: "unavailable" };
}

export async function readTransactionPreflightEvidence({
  apiUrl,
  txId,
  sender,
  fetchFn = fetch,
}: ReadTransactionPreflightEvidenceArgs): Promise<{
  transaction: TransactionEvidence;
  mempool: MempoolEvidence;
  nonce: NonceEvidence;
}> {
  const [transactionResponse, mempoolResponse, nonceResponse] =
    await Promise.all([
      fetchFn(`${apiUrl}/extended/v1/tx/${txId}?unanchored=true`).catch(
        () => null,
      ),
      fetchFn(
        `${apiUrl}/extended/v3/principals/${sender}/mempool/transactions?limit=50`,
      ).catch(() => null),
      fetchFn(`${apiUrl}/extended/v1/address/${sender}/nonces`).catch(
        () => null,
      ),
    ]);

  let transaction: TransactionEvidence = { state: "unavailable" };
  if (transactionResponse?.status === 404) transaction = { state: "absent" };
  if (transactionResponse?.ok)
    transaction = parseTransactionEvidence(
      await transactionResponse.json().catch(() => null),
    );

  let mempool: MempoolEvidence = { state: "unavailable" };
  if (mempoolResponse?.ok) {
    const value: unknown = await mempoolResponse.json().catch(() => null);
    if (isObject(value) && Array.isArray(value.results)) {
      const transactions = value.results.map(parseMempoolTransaction);
      if (transactions.every((candidate) => candidate !== null))
        mempool = {
          state: "available",
          transactions: transactions.filter(
            (candidate): candidate is NonNullable<typeof candidate> =>
              candidate !== null,
          ),
        };
    }
  }

  let nonce: NonceEvidence = { state: "unavailable" };
  if (nonceResponse?.ok) {
    const value: unknown = await nonceResponse.json().catch(() => null);
    if (
      isObject(value) &&
      Number.isSafeInteger(value.possible_next_nonce) &&
      typeof value.possible_next_nonce === "number"
    )
      nonce = {
        state: "available",
        possibleNextNonce: value.possible_next_nonce,
      };
  }

  return { transaction, mempool, nonce };
}
