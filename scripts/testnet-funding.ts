import { fetchJsonWithTimeout } from "../demo/src/fetch-with-timeout.ts";
import type { PreparedTransactionRecord } from "./testnet-transaction-utils.ts";

export const testnetRoleTargetBalance = 10_000_000n;

export function fundingJournalPrefix(sender: string, recipient: string) {
  return `fund:${sender}:${recipient}`;
}

export function fundingJournalKey(
  sender: string,
  recipient: string,
  sequence: number,
) {
  if (!Number.isSafeInteger(sequence) || sequence < 0)
    throw new Error("Invalid funding sequence");
  return `${fundingJournalPrefix(sender, recipient)}:${sequence}`;
}

export function assertSequencedFundingJournalKeys(
  records: readonly PreparedTransactionRecord[],
) {
  for (const record of records) {
    const journalKey =
      typeof record.intent === "object" &&
      record.intent !== null &&
      "journalKey" in record.intent &&
      typeof record.intent.journalKey === "string"
        ? record.intent.journalKey
        : undefined;
    if (
      journalKey === undefined ||
      !/^fund:[^:]+:[^:]+:(0|[1-9]\d*)$/.test(journalKey)
    )
      throw new Error(
        `Unsupported funding journal key${journalKey ? `: ${journalKey}` : ""}; reconcile it before funding`,
      );
  }
}

export function orderFundingJournals(
  records: readonly PreparedTransactionRecord[],
  prefix: string,
) {
  const ordered = records
    .map((record) => {
      if (
        typeof record.intent !== "object" ||
        record.intent === null ||
        !("journalKey" in record.intent) ||
        typeof record.intent.journalKey !== "string" ||
        !record.intent.journalKey.startsWith(`${prefix}:`)
      )
        throw new Error(`Invalid funding journal sequence for ${prefix}`);
      const suffix = record.intent.journalKey.slice(prefix.length + 1);
      if (!/^(0|[1-9]\d*)$/.test(suffix))
        throw new Error(`Invalid funding journal sequence for ${prefix}`);
      return { sequence: Number(suffix), record };
    })
    .sort((left, right) => left.sequence - right.sequence);
  for (const [index, entry] of ordered.entries())
    if (entry.sequence !== index)
      throw new Error(`Funding journal sequence gap for ${prefix}`);
  return ordered.map((entry) => entry.record);
}

export function fundingAmountForBalance(
  balance: bigint,
  target = testnetRoleTargetBalance,
) {
  return balance >= target ? 0n : target - balance;
}

export function planFundingTopUp(
  sender: string,
  recipient: string,
  balance: bigint,
  completedSequenceCount: number,
) {
  const amount = fundingAmountForBalance(balance);
  if (amount === 0n) return undefined;
  return {
    journalKey: fundingJournalKey(sender, recipient, completedSequenceCount),
    amount,
  };
}

interface ReadStxBalanceArgs {
  apiUrl: string;
  address: string;
  fetchFn?: typeof fetch;
  requestTimeoutMs?: number;
}

export async function readStxBalance({
  apiUrl,
  address,
  fetchFn = fetch,
  requestTimeoutMs = 8_000,
}: ReadStxBalanceArgs) {
  const response = await fetchJsonWithTimeout(
    fetchFn,
    `${apiUrl}/extended/v1/address/${address}/stx`,
    undefined,
    requestTimeoutMs,
  );
  if (!response.ok)
    throw new Error(`Balance lookup failed for ${address}: ${response.status}`);
  const value = response.value;
  if (
    typeof value !== "object" ||
    value === null ||
    !("balance" in value) ||
    typeof value.balance !== "string" ||
    !/^\d+$/.test(value.balance)
  )
    throw new Error(`Invalid balance response for ${address}`);
  return BigInt(value.balance);
}

export function readJournaledFundingAmount(
  intent: unknown,
  expectedJournalKey: string,
) {
  if (
    typeof intent !== "object" ||
    intent === null ||
    !("journalKey" in intent) ||
    intent.journalKey !== expectedJournalKey ||
    !("amount" in intent) ||
    typeof intent.amount !== "string" ||
    !/^\d+$/.test(intent.amount)
  )
    throw new Error(`Invalid funding journal for ${expectedJournalKey}`);
  const amount = BigInt(intent.amount);
  if (amount <= 0n)
    throw new Error(`Invalid funding amount for ${expectedJournalKey}`);
  return amount;
}
