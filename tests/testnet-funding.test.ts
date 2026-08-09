import { describe, expect, test } from "vitest";

import {
  assertSequencedFundingJournalKeys,
  fundingAmountForBalance,
  fundingJournalKey,
  fundingJournalPrefix,
  orderFundingJournals,
  planFundingTopUp,
  readJournaledFundingAmount,
  readJournaledFundingFee,
  readStxBalance,
} from "../scripts/testnet-funding";

describe(assertSequencedFundingJournalKeys.name, () => {
  const record = (journalKey: string) => ({
    state: "signed" as const,
    txId: "tx-id",
    serializedTransaction: "00",
    intent: { journalKey, nonce: "0" },
    path: "journal.local.json",
  });

  test("accepts the sequenced funding journal format", () => {
    expect(() =>
      assertSequencedFundingJournalKeys([
        record("fund:STSENDER:STRECIPIENT:0"),
      ]),
    ).not.toThrow();
  });

  test("fails loudly on a legacy unsequenced funding journal", () => {
    expect(() =>
      assertSequencedFundingJournalKeys([record("fund:STSENDER:STRECIPIENT")]),
    ).toThrow("reconcile it before funding");
  });
});

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

describe(planFundingTopUp.name, () => {
  test("opens a new journal sequence for a post-fee shortfall", () => {
    expect(planFundingTopUp("STSENDER", "STRECIPIENT", 9_000_000n, 1)).toEqual({
      journalKey: "fund:STSENDER:STRECIPIENT:1",
      amount: 1_000_000n,
      fee: 1_000n,
    });
  });

  test("does not open another sequence at the target balance", () => {
    expect(
      planFundingTopUp("STSENDER", "STRECIPIENT", 10_000_000n, 1),
    ).toBeUndefined();
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
    const response = Response.json({ balance: "0" });
    response.json = () => new Promise(() => undefined);
    await expect(
      readStxBalance({
        apiUrl: "https://api.test",
        address: "STRECIPIENT",
        requestTimeoutMs: 5,
        fetchFn: () => Promise.resolve(response),
      }),
    ).rejects.toThrow("Fetch deadline exceeded");
  });
});

describe(readJournaledFundingAmount.name, () => {
  test("recovers the exact amount from the semantic funding key", () => {
    const key = fundingJournalKey("STSENDER", "STRECIPIENT", 0);
    expect(
      readJournaledFundingAmount({ journalKey: key, amount: "7000000" }, key),
    ).toBe(7_000_000n);
  });

  test("rejects a journal for another recipient", () => {
    expect(() =>
      readJournaledFundingAmount(
        { journalKey: "other", amount: "7000000" },
        fundingJournalKey("STSENDER", "STRECIPIENT", 0),
      ),
    ).toThrow("Invalid funding journal");
  });
});

describe(readJournaledFundingFee.name, () => {
  test("recovers the exact fixed fee from the semantic funding key", () => {
    const key = fundingJournalKey("STSENDER", "STRECIPIENT", 0);
    expect(readJournaledFundingFee({ journalKey: key, fee: "1000" }, key)).toBe(
      1_000n,
    );
  });

  test("rejects a funding journal without its reviewed fee", () => {
    const key = fundingJournalKey("STSENDER", "STRECIPIENT", 0);
    expect(() => readJournaledFundingFee({ journalKey: key }, key)).toThrow(
      "Invalid funding fee",
    );
  });
});

describe(orderFundingJournals.name, () => {
  const prefix = fundingJournalPrefix("STSENDER", "STRECIPIENT");
  const record = (sequence: number) => ({
    state: "signed" as const,
    txId: `tx-${sequence}`,
    serializedTransaction: "00",
    intent: {
      journalKey: `${prefix}:${sequence}`,
      nonce: String(sequence),
    },
    path: `${sequence}.json`,
  });

  test("orders a contiguous top-up sequence", () => {
    expect(orderFundingJournals([record(1), record(0)], prefix)).toEqual([
      record(0),
      record(1),
    ]);
  });

  test("rejects a missing prior top-up journal", () => {
    expect(() => orderFundingJournals([record(1)], prefix)).toThrow(
      "Funding journal sequence gap",
    );
  });
});
