import { describe, expect, test } from "vitest";

import {
  classifyTransactionPreflight,
  readTransactionPreflightEvidence,
} from "../scripts/testnet-transaction-preflight";

const planned = {
  txId: "0x" + "11".repeat(32),
  sender: "STTEST",
  nonce: 7,
  previouslyJournaled: false,
};

const absent = { state: "absent" } as const;
const emptyMempool = { state: "available", transactions: [] } as const;
const matchingNonce = { state: "available", possibleNextNonce: 7 } as const;

describe(classifyTransactionPreflight.name, () => {
  test("continues an exact confirmed transaction", () => {
    expect(
      classifyTransactionPreflight({
        planned,
        transaction: { state: "confirmed" },
        mempool: emptyMempool,
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "continue", reason: "exact-confirmed" });
  });

  test("waits for the exact pending transaction", () => {
    expect(
      classifyTransactionPreflight({
        planned,
        transaction: absent,
        mempool: {
          state: "available",
          transactions: [
            { txId: planned.txId, sender: planned.sender, nonce: 7 },
          ],
        },
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "wait", reason: "exact-pending" });
  });

  test("stops for a different pending transaction at the nonce", () => {
    expect(
      classifyTransactionPreflight({
        planned,
        transaction: absent,
        mempool: {
          state: "available",
          transactions: [
            { txId: "0x" + "22".repeat(32), sender: planned.sender, nonce: 7 },
          ],
        },
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "stop", reason: "conflicting-pending" });
  });

  test("reconciles a journaled transaction that is absent", () => {
    expect(
      classifyTransactionPreflight({
        planned: { ...planned, previouslyJournaled: true },
        transaction: absent,
        mempool: emptyMempool,
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "reconcile", reason: "prior-attempt-absent" });
  });

  test.each([
    [
      "rejected transaction",
      { state: "rejected" },
      emptyMempool,
      matchingNonce,
      "exact-rejected",
    ],
    [
      "transaction outage",
      { state: "unavailable" },
      emptyMempool,
      matchingNonce,
      "transaction-unavailable",
    ],
    [
      "mempool outage",
      absent,
      { state: "unavailable" },
      matchingNonce,
      "mempool-unavailable",
    ],
    [
      "nonce outage",
      absent,
      emptyMempool,
      { state: "unavailable" },
      "nonce-unavailable",
    ],
    [
      "nonce mismatch",
      absent,
      emptyMempool,
      { state: "available", possibleNextNonce: 8 },
      "nonce-mismatch",
    ],
  ] as const)("stops for %s", (_, transaction, mempool, nonce, reason) => {
    expect(
      classifyTransactionPreflight({ planned, transaction, mempool, nonce }),
    ).toEqual({ action: "stop", reason });
  });

  test("broadcasts only from a clean state", () => {
    expect(
      classifyTransactionPreflight({
        planned,
        transaction: absent,
        mempool: emptyMempool,
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "broadcast", reason: "ready" });
  });
});

describe(readTransactionPreflightEvidence.name, () => {
  test("parses the named Hiro evidence sources", async () => {
    const requests: string[] = [];
    const result = await readTransactionPreflightEvidence({
      apiUrl: "https://api.test",
      txId: planned.txId,
      sender: planned.sender,
      fetchFn(input) {
        const url = String(input);
        requests.push(url);
        if (url.includes("/tx/"))
          return Promise.resolve(
            Response.json({ tx_status: "success", is_unanchored: false }),
          );
        if (url.includes("/mempool/"))
          return Promise.resolve(Response.json({ results: [] }));
        return Promise.resolve(Response.json({ possible_next_nonce: 7 }));
      },
    });

    expect(result).toEqual({
      transaction: { state: "confirmed" },
      mempool: emptyMempool,
      nonce: matchingNonce,
    });
    expect(requests).toHaveLength(3);
  });

  test("fails all three evidence sources closed at their deadlines", async () => {
    const response = Response.json({});
    response.json = () => new Promise(() => undefined);
    const result = await readTransactionPreflightEvidence({
      apiUrl: "https://api.test",
      txId: planned.txId,
      sender: planned.sender,
      requestTimeoutMs: 5,
      fetchFn: () => Promise.resolve(response),
    });

    expect(result).toEqual({
      transaction: { state: "unavailable" },
      mempool: { state: "unavailable" },
      nonce: { state: "unavailable" },
    });
  });
});
