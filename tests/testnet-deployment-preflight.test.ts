import { describe, expect, test } from "vitest";

import {
  classifyDeploymentPreflight,
  readDeploymentPreflightEvidence,
} from "../scripts/testnet-deployment-preflight";

const planned = {
  txId: "0xplanned",
  sender: "ST123",
  nonce: 7,
  principal: "ST123.origin-registry-v2",
  sourceSha256: "source",
  previouslyJournaled: false,
};
const absent = { state: "absent" } as const;
const emptyMempool = { state: "available", transactions: [] } as const;
const matchingNonce = {
  state: "available",
  possibleNextNonce: 7,
} as const;

describe(classifyDeploymentPreflight.name, () => {
  test("continues only for the exact confirmed transaction and source", () => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed: {
          state: "present",
          txId: "planned",
          sourceSha256: "source",
        },
        mempool: { state: "unavailable" },
        nonce: { state: "unavailable" },
      }),
    ).toEqual({ action: "continue", reason: "exact-confirmed" });
  });

  test.each([
    [
      "source",
      { state: "present", txId: "planned", sourceSha256: "different" } as const,
      "confirmed-source-mismatch",
    ],
    [
      "transaction",
      { state: "present", txId: "different", sourceSha256: "source" } as const,
      "confirmed-transaction-mismatch",
    ],
  ])("stops on a confirmed %s mismatch", (_, confirmed, reason) => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed,
        mempool: emptyMempool,
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "stop", reason });
  });

  test("waits for the exact pending transaction", () => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed: absent,
        mempool: {
          state: "available",
          transactions: [
            { txId: "planned", sender: planned.sender, nonce: planned.nonce },
          ],
        },
        nonce: { state: "available", possibleNextNonce: 8 },
      }),
    ).toEqual({ action: "wait", reason: "exact-pending" });
  });

  test.each([
    [
      "same nonce",
      { txId: "different", sender: planned.sender, nonce: planned.nonce },
    ],
    [
      "same principal",
      {
        txId: "different",
        sender: planned.sender,
        nonce: planned.nonce + 1,
        contractPrincipal: planned.principal,
      },
    ],
  ])("stops for a pending deployment with the %s", (_, transaction) => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed: absent,
        mempool: { state: "available", transactions: [transaction] },
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "stop", reason: "conflicting-pending" });
  });

  test("requires operator reconciliation for a journaled attempt absent everywhere", () => {
    expect(
      classifyDeploymentPreflight({
        planned: { ...planned, previouslyJournaled: true },
        confirmed: absent,
        mempool: emptyMempool,
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "reconcile", reason: "prior-attempt-absent" });
  });

  test.each([
    [
      "confirmed data",
      { confirmed: { state: "unavailable" } as const },
      "confirmed-unavailable",
    ],
    [
      "mempool data",
      { mempool: { state: "unavailable" } as const },
      "mempool-unavailable",
    ],
    [
      "nonce data",
      { nonce: { state: "unavailable" } as const },
      "nonce-unavailable",
    ],
  ])("stops when %s is unavailable", (_, override, reason) => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed: absent,
        mempool: emptyMempool,
        nonce: matchingNonce,
        ...override,
      }),
    ).toEqual({ action: "stop", reason });
  });

  test("stops when the possible next nonce differs", () => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed: absent,
        mempool: emptyMempool,
        nonce: { state: "available", possibleNextNonce: 8 },
      }),
    ).toEqual({ action: "stop", reason: "nonce-mismatch" });
  });

  test("broadcasts only when every evidence source is clear", () => {
    expect(
      classifyDeploymentPreflight({
        planned,
        confirmed: absent,
        mempool: emptyMempool,
        nonce: matchingNonce,
      }),
    ).toEqual({ action: "broadcast", reason: "ready" });
  });
});

describe(readDeploymentPreflightEvidence.name, () => {
  test("fails all three evidence sources closed at their deadlines", async () => {
    const response = Response.json({});
    response.json = () => new Promise(() => undefined);
    const result = await readDeploymentPreflightEvidence({
      apiUrl: "https://api.test",
      principal: planned.principal,
      sender: planned.sender,
      requestTimeoutMs: 5,
      fetchFn: () => Promise.resolve(response),
    });

    expect(result).toEqual({
      confirmed: { state: "unavailable" },
      mempool: { state: "unavailable" },
      nonce: { state: "unavailable" },
    });
  });
});
