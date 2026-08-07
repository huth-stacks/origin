import { fetchWithTimeout } from "../demo/src/fetch-with-timeout.ts";

export const testnetRoleTargetBalance = 10_000_000n;

export function fundingJournalKey(sender: string, recipient: string) {
  return `fund:${sender}:${recipient}`;
}

export function fundingAmountForBalance(
  balance: bigint,
  target = testnetRoleTargetBalance,
) {
  return balance >= target ? 0n : target - balance;
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
  const response = await fetchWithTimeout(
    fetchFn,
    `${apiUrl}/extended/v1/address/${address}/stx`,
    undefined,
    requestTimeoutMs,
  );
  if (!response.ok)
    throw new Error(`Balance lookup failed for ${address}: ${response.status}`);
  const value: unknown = await response.json();
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
