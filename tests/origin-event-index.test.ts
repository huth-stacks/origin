import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

import {
  buildOriginEventIndex,
  fetchOriginLogPages,
  type OriginContractLog,
} from "../demo/src/origin-event-index";

const registry = "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.origin-registry-v2";
const attester = "ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC";
const subject = "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action";

function txId(character: string) {
  return `0x${character.repeat(64)}`;
}

function createLog(
  value: ClarityValue,
  transactionCharacter: string,
  eventIndex = 0,
  contractId = registry,
): OriginContractLog {
  return {
    eventIndex,
    txId: txId(transactionCharacter),
    contractId,
    topic: "print",
    valueHex: serializeCV(value),
  };
}

function apiLog(log: OriginContractLog) {
  return {
    event_index: log.eventIndex,
    event_type: "smart_contract_log",
    tx_id: log.txId,
    contract_log: {
      contract_id: log.contractId,
      topic: log.topic,
      value: { hex: log.valueHex, repr: "fixture" },
    },
  };
}

function v1Issue(issuerName = "A") {
  return Cl.tuple({
    event: Cl.stringAscii("origin-attestation-issued"),
    attester: Cl.principal(attester),
    subject: Cl.principal(subject),
    "issuer-name": Cl.stringAscii(issuerName),
    role: Cl.stringAscii("Demo contract"),
    "issued-at": Cl.uint(100),
    "expires-at": Cl.uint(200),
  });
}

function v1Revoke() {
  return Cl.tuple({
    event: Cl.stringAscii("origin-attestation-revoked"),
    attester: Cl.principal(attester),
    subject: Cl.principal(subject),
    "revoked-at": Cl.uint(120),
  });
}

function v2Event(kind: "issued" | "revoked", version = 2) {
  const revoked = kind === "revoked";
  return Cl.tuple({
    version: Cl.uint(version),
    event: Cl.stringAscii(`origin-attestation-${kind}`),
    attester: Cl.principal(attester),
    subject: Cl.principal(subject),
    "issuer-name": Cl.stringAscii("example.test"),
    role: Cl.stringAscii("Application contract"),
    "issued-at": Cl.uint(100),
    "expires-at": Cl.uint(200),
    revoked: Cl.bool(revoked),
    "revoked-at": revoked ? Cl.some(Cl.uint(120)) : Cl.none(),
    "request-id": Cl.bufferFromHex((revoked ? "22" : "11").repeat(32)),
  });
}

describe(fetchOriginLogPages.name, () => {
  test("follows the cursor API and preserves newest-first page order", async () => {
    const newest = createLog(v2Event("revoked"), "a");
    const oldest = createLog(v2Event("issued"), "b");
    const urls: URL[] = [];
    const result = await fetchOriginLogPages({
      apiUrl: "https://wallet-owned.example",
      registryPrincipal: registry,
      fetchFn(input) {
        const url =
          input instanceof Request ? new URL(input.url) : new URL(input);
        urls.push(url);
        if (urls.length === 1)
          return Promise.resolve(
            Response.json({
              results: [apiLog(newest)],
              next_cursor: "100:0:0:0",
            }),
          );
        return Promise.resolve(
          Response.json({ results: [apiLog(oldest)], next_cursor: null }),
        );
      },
    });

    expect(result).toEqual({ condition: "complete", logs: [newest, oldest] });
    expect(urls[0]?.pathname).toBe(
      `/extended/v2/smart-contracts/${registry}/logs`,
    );
    expect(urls[1]?.searchParams.get("cursor")).toBe("100:0:0:0");
  });

  test("fails partial when a cursor does not progress", async () => {
    let request = 0;
    const result = await fetchOriginLogPages({
      apiUrl: "https://wallet-owned.example",
      registryPrincipal: registry,
      fetchFn() {
        request += 1;
        return Promise.resolve(
          Response.json({
            results: [],
            next_cursor: request === 1 ? "cursor" : "cursor",
          }),
        );
      },
    });

    expect(result).toEqual({
      condition: "partial",
      logs: [],
      reason: "cursor-non-progress",
    });
  });

  test("fails unavailable on a malformed first page", async () => {
    const result = await fetchOriginLogPages({
      apiUrl: "https://wallet-owned.example",
      registryPrincipal: registry,
      fetchFn: () => Promise.resolve(Response.json({ results: "wrong" })),
    });

    expect(result).toEqual({
      condition: "unavailable",
      logs: [],
      reason: "invalid-response",
    });
  });

  test("fails unavailable when a request exceeds its deadline", async () => {
    const result = await fetchOriginLogPages({
      apiUrl: "https://wallet-owned.example",
      registryPrincipal: registry,
      requestTimeoutMs: 5,
      fetchFn: () => new Promise(() => undefined),
    });

    expect(result).toEqual({
      condition: "unavailable",
      logs: [],
      reason: "network-failure",
    });
  });

  test("enforces one total budget across cursor pages", async () => {
    let now = 0;
    const result = await fetchOriginLogPages({
      apiUrl: "https://wallet-owned.example",
      registryPrincipal: registry,
      totalTimeoutMs: 10,
      nowFn: () => now,
      fetchFn: () => {
        now += 11;
        return Promise.resolve(
          Response.json({ results: [], next_cursor: crypto.randomUUID() }),
        );
      },
    });

    expect(result).toEqual({
      condition: "unavailable",
      logs: [],
      reason: "network-failure",
    });
  });

  test("stops at the configured flood limit", async () => {
    const result = await fetchOriginLogPages({
      apiUrl: "https://wallet-owned.example",
      registryPrincipal: registry,
      maxPages: 2,
      fetchFn: () =>
        Promise.resolve(
          Response.json({ results: [], next_cursor: crypto.randomUUID() }),
        ),
    });

    expect(result).toEqual({
      condition: "partial",
      logs: [],
      reason: "pagination-exhausted",
    });
  });
});

describe(buildOriginEventIndex.name, () => {
  test("backfills a v1 revoke only from its preceding issue", () => {
    const replacement = createLog(v1Issue("B"), "c");
    const revoke = createLog(v1Revoke(), "b");
    const original = createLog(v1Issue("A"), "a");

    const index = buildOriginEventIndex({
      registryPrincipal: registry,
      schemaVersion: 1,
      newestFirstLogs: [replacement, revoke, original],
    });

    expect(index.condition).toBe("complete");
    expect(index.events.map((event) => event.kind)).toEqual([
      "issued",
      "revoked",
      "issued",
    ]);
    expect(index.events[1]).toMatchObject({
      kind: "revoked",
      issuerName: "A",
      issuedAt: 100,
      complete: true,
    });
    expect(index.events[2]).toMatchObject({ kind: "issued", issuerName: "B" });
  });

  test("keeps a v1 revoke explicitly partial without a preceding issue", () => {
    const index = buildOriginEventIndex({
      registryPrincipal: registry,
      schemaVersion: 1,
      newestFirstLogs: [createLog(v1Revoke(), "a")],
    });

    expect(index.events[0]).toEqual({
      schemaVersion: 1,
      kind: "revoked",
      attester,
      subject,
      issuerName: undefined,
      role: undefined,
      issuedAt: undefined,
      expiresAt: undefined,
      revoked: true,
      revokedAt: 120,
      txId: txId("a"),
      eventIndex: 0,
      complete: false,
    });
  });

  test("decodes complete versioned v2 lifecycle records", () => {
    const index = buildOriginEventIndex({
      registryPrincipal: registry,
      schemaVersion: 2,
      newestFirstLogs: [
        createLog(v2Event("revoked"), "b"),
        createLog(v2Event("issued"), "a"),
      ],
    });

    expect(index.condition).toBe("complete");
    expect(index.events).toMatchObject([
      {
        schemaVersion: 2,
        kind: "issued",
        issuerName: "example.test",
        role: "Application contract",
        requestId: "11".repeat(32),
        revoked: false,
      },
      {
        schemaVersion: 2,
        kind: "revoked",
        requestId: "22".repeat(32),
        revoked: true,
        revokedAt: 120,
      },
    ]);
  });

  test("deduplicates by transaction and event index", () => {
    const log = createLog(v2Event("issued"), "a", 4);
    const index = buildOriginEventIndex({
      registryPrincipal: registry,
      schemaVersion: 2,
      newestFirstLogs: [log, log],
    });

    expect(index.events).toHaveLength(1);
    expect(index.rejectedEvents).toBe(0);
  });

  test.each([
    [
      "foreign contract",
      createLog(v2Event("issued"), "a", 0, `${attester}.other`),
    ],
    ["foreign topic", { ...createLog(v2Event("issued"), "a"), topic: "other" }],
    ["wrong version", createLog(v2Event("issued", 1), "a")],
  ])("quarantines a %s event", (_, log) => {
    const index = buildOriginEventIndex({
      registryPrincipal: registry,
      schemaVersion: 2,
      newestFirstLogs: [log],
    });

    expect(index).toEqual({
      events: [],
      rejectedEvents: 1,
      condition: "partial",
    });
  });

  test("preserves canonical same-page order after reversing newest-first input", () => {
    const index = buildOriginEventIndex({
      registryPrincipal: registry,
      schemaVersion: 2,
      newestFirstLogs: [
        createLog(v2Event("revoked"), "a", 1),
        createLog(v2Event("issued"), "a", 0),
      ],
    });

    expect(index.events.map((event) => event.eventIndex)).toEqual([0, 1]);
  });
});
