import { describe, expect, test } from "vitest";

import {
  buildOriginEvidenceClaims,
  filterOriginEvidenceClaims,
  sanitizeEvidenceText,
} from "../demo/src/origin-evidence-model";
import type { OriginCurrentLookup } from "../demo/src/origin-current-state";
import type { OriginLifecycleEvent } from "../demo/src/origin-event-index";

const trusted = "ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC";
const hostile = "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0";
const subject = "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action";

function event(overrides: Partial<OriginLifecycleEvent> = {}) {
  return {
    schemaVersion: 2,
    kind: "issued",
    attester: trusted,
    subject,
    issuerName: "Acme",
    role: "Demo contract",
    issuedAt: 100,
    expiresAt: 200,
    revoked: false,
    requestId: "11".repeat(32),
    txId: `0x${"a".repeat(64)}`,
    eventIndex: 0,
    complete: true,
    ...overrides,
  } satisfies OriginLifecycleEvent;
}

function lookup(
  overrides: Partial<NonNullable<OriginCurrentLookup["claim"]>> = {},
): OriginCurrentLookup {
  return {
    attester: trusted,
    subject,
    claim: {
      attester: trusted,
      subject,
      issuerName: "Acme",
      role: "Demo contract",
      issuedAt: 100,
      expiresAt: 200,
      revoked: false,
      ...overrides,
    },
  };
}

describe(buildOriginEvidenceClaims.name, () => {
  test("derives active, expired, revoked, and missing only from current state", () => {
    const states = [
      { expected: "active", current: lookup() },
      { expected: "expired", current: lookup({ expiresAt: 150 }) },
      { expected: "revoked", current: lookup({ revoked: true }) },
      { expected: "missing", current: { ...lookup(), claim: null } },
    ] as const;

    for (const state of states) {
      expect(
        buildOriginEvidenceClaims({
          events: [event()],
          lookups: [state.current],
          burnBlockHeight: 150,
          trustedAttesters: [trusted],
        })[0]?.status,
      ).toBe(state.expected);
    }
  });

  test("never promotes hostile claim text into recognized identity", () => {
    const hostileSubject = `${hostile}.claimed-action`;
    const claims = buildOriginEvidenceClaims({
      events: [
        event({
          attester: hostile,
          subject: hostileSubject,
          issuerName: "\u0000Definitely Acme",
          role: "Official\u0007 contract",
        }),
      ],
      lookups: [
        {
          attester: hostile,
          subject: hostileSubject,
          claim: {
            attester: hostile,
            subject: hostileSubject,
            issuerName: "\u0000Definitely Acme",
            role: "Official\u0007 contract",
            issuedAt: 100,
            expiresAt: 200,
            revoked: false,
          },
        },
      ],
      burnBlockHeight: 150,
      trustedAttesters: [trusted],
    });

    expect(claims[0]).toMatchObject({
      recognized: false,
      issuerName: "Definitely Acme",
      role: "Official contract",
    });
  });
});

describe(filterOriginEvidenceClaims.name, () => {
  const claims = buildOriginEvidenceClaims({
    events: [event()],
    lookups: [lookup()],
    burnBlockHeight: 150,
    trustedAttesters: [trusted],
  });

  test("matches exact subject, attester, or registry transaction only", () => {
    expect(filterOriginEvidenceClaims(claims, subject)).toHaveLength(1);
    expect(filterOriginEvidenceClaims(claims, trusted)).toHaveLength(1);
    expect(
      filterOriginEvidenceClaims(claims, `0x${"a".repeat(64)}`),
    ).toHaveLength(1);
    expect(filterOriginEvidenceClaims(claims, "Acme")).toHaveLength(0);
    expect(
      filterOriginEvidenceClaims(claims, subject.slice(0, -4)),
    ).toHaveLength(0);
  });
});

describe(sanitizeEvidenceText.name, () => {
  test("caps untrusted display text by Unicode code point", () => {
    expect(sanitizeEvidenceText("🧪🧪🧪", 2)).toBe("🧪…");
  });
});
