import { createHash } from "node:crypto";

import { fetchJsonWithTimeout } from "../demo/src/fetch-with-timeout.ts";

interface PlannedDeployment {
  txId: string;
  sender: string;
  nonce: number;
  principal: string;
  sourceSha256: string;
  previouslyJournaled: boolean;
}

type ConfirmedDeployment =
  | { state: "absent" }
  | { state: "unavailable" }
  | {
      state: "present";
      txId: string;
      sourceSha256: string;
    };

type MempoolEvidence =
  | { state: "unavailable" }
  | {
      state: "available";
      transactions: readonly {
        txId: string;
        sender: string;
        nonce: number;
        contractPrincipal?: string;
      }[];
    };

type NonceEvidence =
  { state: "unavailable" } | { state: "available"; possibleNextNonce: number };

export type DeploymentPreflightResult =
  | { action: "broadcast"; reason: "ready" }
  | { action: "wait"; reason: "exact-pending" }
  | { action: "continue"; reason: "exact-confirmed" }
  | {
      action: "stop";
      reason:
        | "confirmed-source-mismatch"
        | "confirmed-transaction-mismatch"
        | "confirmed-unavailable"
        | "conflicting-pending"
        | "mempool-unavailable"
        | "nonce-unavailable"
        | "nonce-mismatch";
    }
  | { action: "reconcile"; reason: "prior-attempt-absent" };

interface ClassifyDeploymentPreflightArgs {
  planned: PlannedDeployment;
  confirmed: ConfirmedDeployment;
  mempool: MempoolEvidence;
  nonce: NonceEvidence;
}

interface ReadDeploymentPreflightEvidenceArgs {
  apiUrl: string;
  principal: string;
  sender: string;
  fetchFn?: typeof fetch;
  requestTimeoutMs?: number;
}

function normalizeTxId(value: string) {
  return value.replace(/^0x/, "").toLowerCase();
}

export function classifyDeploymentPreflight({
  planned,
  confirmed,
  mempool,
  nonce,
}: ClassifyDeploymentPreflightArgs): DeploymentPreflightResult {
  if (confirmed.state === "present") {
    if (confirmed.sourceSha256 !== planned.sourceSha256)
      return { action: "stop", reason: "confirmed-source-mismatch" };
    if (normalizeTxId(confirmed.txId) !== normalizeTxId(planned.txId))
      return { action: "stop", reason: "confirmed-transaction-mismatch" };
    return { action: "continue", reason: "exact-confirmed" };
  }
  if (confirmed.state === "unavailable")
    return { action: "stop", reason: "confirmed-unavailable" };
  if (mempool.state === "unavailable")
    return { action: "stop", reason: "mempool-unavailable" };
  const senderTransactions = mempool.transactions.filter(
    (transaction) => transaction.sender === planned.sender,
  );
  const exactPending = senderTransactions.find(
    (transaction) =>
      normalizeTxId(transaction.txId) === normalizeTxId(planned.txId),
  );
  if (exactPending) return { action: "wait", reason: "exact-pending" };
  const conflictingPending = senderTransactions.find(
    (transaction) =>
      transaction.nonce === planned.nonce ||
      transaction.contractPrincipal === planned.principal,
  );
  if (conflictingPending)
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
  const contractPrincipal =
    value.type === "smart_contract" &&
    isObject(value.smart_contract) &&
    typeof value.smart_contract.contract_id === "string"
      ? value.smart_contract.contract_id
      : undefined;
  return {
    txId: value.tx_id,
    sender: value.sender.address,
    nonce: value.sender.nonce,
    contractPrincipal,
  };
}

export async function readDeploymentPreflightEvidence({
  apiUrl,
  principal,
  sender,
  fetchFn = fetch,
  requestTimeoutMs = 8_000,
}: ReadDeploymentPreflightEvidenceArgs): Promise<{
  confirmed: ConfirmedDeployment;
  mempool: MempoolEvidence;
  nonce: NonceEvidence;
}> {
  const deadlineFetch = (input: Parameters<typeof fetch>[0]) =>
    fetchJsonWithTimeout(fetchFn, input, undefined, requestTimeoutMs);
  const [confirmedResponse, mempoolResponse, nonceResponse] = await Promise.all(
    [
      deadlineFetch(`${apiUrl}/extended/v1/contract/${principal}`).catch(
        () => null,
      ),
      deadlineFetch(
        `${apiUrl}/extended/v3/principals/${sender}/mempool/transactions?limit=50`,
      ).catch(() => null),
      deadlineFetch(`${apiUrl}/extended/v1/address/${sender}/nonces`).catch(
        () => null,
      ),
    ],
  );

  let confirmed: ConfirmedDeployment = { state: "unavailable" };
  if (confirmedResponse?.status === 404) confirmed = { state: "absent" };
  if (confirmedResponse?.ok) {
    const value = confirmedResponse.value;
    if (
      isObject(value) &&
      typeof value.tx_id === "string" &&
      typeof value.source_code === "string"
    )
      confirmed = {
        state: "present",
        txId: value.tx_id,
        sourceSha256: createHash("sha256")
          .update(value.source_code)
          .digest("hex"),
      };
  }

  let mempool: MempoolEvidence = { state: "unavailable" };
  if (mempoolResponse?.ok) {
    const value = mempoolResponse.value;
    if (isObject(value) && Array.isArray(value.results)) {
      const transactions = value.results.map(parseMempoolTransaction);
      if (transactions.every((transaction) => transaction !== null))
        mempool = {
          state: "available",
          transactions: transactions.filter(
            (transaction): transaction is NonNullable<typeof transaction> =>
              transaction !== null,
          ),
        };
    }
  }

  let nonce: NonceEvidence = { state: "unavailable" };
  if (nonceResponse?.ok) {
    const value = nonceResponse.value;
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

  return { confirmed, mempool, nonce };
}
