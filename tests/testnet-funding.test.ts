import { describe, expect, test } from "vitest";

import {
  fundingAmountForBalance,
  fundingJournalKey,
  readJournaledFundingAmount,
  readStxBalance,
} from "../scripts/testnet-funding";

describe(fundingAmountForBalance.name, () => {
  test.each([
    [0n, 10_000_000n],
    [4_000_000n, 6_000_000n],
    [10_000_000n, 0n],
    [20_000_000n, 0n],
  ])("tops %s up by %s", (balance, expected) => {
    expect(fundingAmountForBalance(balance)).toBe(expected);
  });
});

describe(readStxBalance.name, () => {
  test("uses a bounded account-balance lookup", async () => {
    let observedSignal: AbortSignal | undefined;
    const balance = await readStxBalance({
      apiUrl: "https://api.test",
      address: "STRECIPIENT",
      fetchFn(_, init) {
        observedSignal = init?.signal ?? undefined;
        return Promise.resolve(Response.json({ balance: "123" }));
      },
    });

    expect(balance).toBe(123n);
    expect(observedSignal).toBeInstanceOf(AbortSignal);
  });

  test("times out a hanging balance lookup", async () => {
    await expect(
      readStxBalance({
        apiUrl: "https://api.test",
        address: "STRECIPIENT",
        requestTimeoutMs: 5,
        fetchFn: () => new Promise(() => undefined),
      }),
    ).rejects.toThrow("Fetch deadline exceeded");
  });
});

describe(readJournaledFundingAmount.name, () => {
  test("recovers the exact amount from the semantic funding key", () => {
    const key = fundingJournalKey("STSENDER", "STRECIPIENT");
    expect(
      readJournaledFundingAmount({ journalKey: key, amount: "7000000" }, key),
    ).toBe(7_000_000n);
  });

  test("rejects a journal for another recipient", () => {
    expect(() =>
      readJournaledFundingAmount(
        { journalKey: "other", amount: "7000000" },
        fundingJournalKey("STSENDER", "STRECIPIENT"),
      ),
    ).toThrow("Invalid funding journal");
  });
});
