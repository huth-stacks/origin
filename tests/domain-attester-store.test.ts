import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { DomainAttesterStore } from "../scripts/domain-attester/store.ts";
import {
  DOMAIN_CHALLENGE_VERSION,
  DOMAIN_POLICY_VERSION,
  DOMAIN_VERIFICATION_METHOD,
  type DomainChallenge,
  type DomainIssueAuthorization,
} from "../scripts/domain-attester/types.ts";

const attester = "ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0";
const subject = "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.copperline-app";

function challenge(index: number, overrides: Partial<DomainChallenge> = {}) {
  return {
    version: DOMAIN_CHALLENGE_VERSION,
    domain: `copperline-${index}.com`,
    subject,
    attester,
    nonce: index.toString(16).padStart(64, "0"),
    requestId: (index + 100).toString(16).padStart(64, "0"),
    policyVersion: DOMAIN_POLICY_VERSION,
    issuedAt: 1_000,
    expiresAt: 1_300,
    claimExpiresAt: 5_000,
    issuerName: `copperline-${index}.com`,
    role: "Application contract",
    verificationMethod: DOMAIN_VERIFICATION_METHOD,
    ...overrides,
  } satisfies DomainChallenge;
}

function authorization(value: DomainChallenge): DomainIssueAuthorization {
  return {
    kind: "origin-domain-issue-v1",
    network: "testnet",
    registryPrincipal:
      "ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2",
    attester,
    subject: value.subject,
    issuerName: value.domain,
    role: value.role,
    expiresAt: value.claimExpiresAt,
    requestId: value.requestId,
    policyVersion: DOMAIN_POLICY_VERSION,
    verificationMethod: DOMAIN_VERIFICATION_METHOD,
    verifiedBurnHeight: 1_000,
    authorizedAt: 1_001,
    authorizationExpiresAt: 1_300,
    fee: 10_000,
  };
}

describe(DomainAttesterStore.name, () => {
  test("allows concurrent challenges but only one authorization per attester/subject", () => {
    const store = new DomainAttesterStore();
    const first = challenge(1);
    const second = challenge(2);
    store.issueChallenge(first, "8.8.8.8", 1_000);
    store.issueChallenge(second, "8.8.4.4", 1_000);

    store.authorize(first.requestId, authorization(first), 1_001);
    expect(() =>
      store.authorize(second.requestId, authorization(second), 1_001),
    ).toThrow("already in flight");
    expect(store.get(second.requestId).state).toBe("challenge-issued");
    store.close();
  });

  test("enforces durable request, nonce, signer nonce, and transaction uniqueness", () => {
    const store = new DomainAttesterStore();
    const first = challenge(1);
    const duplicateNonce = challenge(2, { nonce: first.nonce });
    store.issueChallenge(first, "8.8.8.8", 1_000);
    expect(() =>
      store.issueChallenge(duplicateNonce, "8.8.4.4", 1_000),
    ).toThrow();
    store.authorize(first.requestId, authorization(first), 1_001);
    const signed = {
      requestId: first.requestId,
      signerNonce: 7,
      serializedTransaction: "deadbeef",
      txId: "aa".repeat(32),
    };
    expect(store.recordSigned(first.requestId, signed, 1_002).state).toBe(
      "signed",
    );
    expect(store.recordSigned(first.requestId, signed, 1_003)).toMatchObject({
      state: "signed",
      txId: signed.txId,
    });
    expect(() =>
      store.recordSigned(
        first.requestId,
        { ...signed, serializedTransaction: "altered" },
        1_003,
      ),
    ).toThrow("journal conflict");
    store.close();
  });

  test("persists every crash-recovery transition before broadcast", () => {
    const store = new DomainAttesterStore();
    const value = challenge(1);
    store.issueChallenge(value, "8.8.8.8", 1_000);
    store.authorize(value.requestId, authorization(value), 1_001);
    store.recordSigned(
      value.requestId,
      {
        requestId: value.requestId,
        signerNonce: 7,
        serializedTransaction: "deadbeef",
        txId: "aa".repeat(32),
      },
      1_002,
    );
    store.transition(value.requestId, "broadcast-unknown", 1_003);
    store.transition(value.requestId, "pending", 1_004);
    store.transition(value.requestId, "confirmed", 1_005, "block 123");

    expect(store.history(value.requestId).map(({ state }) => state)).toEqual([
      "challenge-issued",
      "verified",
      "authorized",
      "signed",
      "broadcast-unknown",
      "pending",
      "confirmed",
    ]);
    expect(() => store.transition(value.requestId, "pending", 1_006)).toThrow(
      "confirmed -> pending",
    );
    store.close();
  });

  test("rate-limits by source, domain, subject, and global open work", () => {
    const store = new DomainAttesterStore(":memory:", {
      windowSeconds: 60,
      source: 2,
      domain: 2,
      subject: 2,
      globalOpen: 3,
    });
    store.issueChallenge(challenge(1), "8.8.8.8", 1_000);
    store.issueChallenge(challenge(2), "8.8.8.8", 1_000);
    expect(() =>
      store.issueChallenge(
        challenge(3, { subject: `${subject}-three` }),
        "8.8.8.8",
        1_000,
      ),
    ).toThrow("source rate limit");
    expect(() => store.issueChallenge(challenge(4), "1.1.1.1", 1_000)).toThrow(
      "subject rate limit",
    );
    store.issueChallenge(
      challenge(5, { subject: `${subject}-five` }),
      "1.1.1.1",
      1_000,
    );
    expect(() =>
      store.issueChallenge(
        challenge(6, { subject: `${subject}-six` }),
        "9.9.9.9",
        1_000,
      ),
    ).toThrow("global concurrency");
    store.close();
  });

  test("expires abandoned challenges and stale authorizations", () => {
    const store = new DomainAttesterStore(":memory:", {
      windowSeconds: 60,
      source: 5,
      domain: 5,
      subject: 5,
      globalOpen: 1,
    });
    const abandoned = challenge(1, { expiresAt: 1_010 });
    store.issueChallenge(abandoned, "8.8.8.8", 1_000);
    expect(() =>
      store.issueChallenge(
        challenge(2, { subject: `${subject}-two`, expiresAt: 1_400 }),
        "8.8.4.4",
        1_005,
      ),
    ).toThrow("global concurrency");

    const replacement = challenge(3, {
      subject: `${subject}-three`,
      expiresAt: 1_400,
    });
    store.issueChallenge(replacement, "1.1.1.1", 1_011);
    expect(store.get(abandoned.requestId)).toMatchObject({
      state: "rejected",
      disposition: "challenge-expired",
    });

    const staleAuthorization = authorization(replacement);
    staleAuthorization.authorizationExpiresAt = 1_020;
    store.authorize(replacement.requestId, staleAuthorization, 1_012);
    const next = challenge(4, {
      subject: replacement.subject,
      expiresAt: 1_500,
    });
    store.issueChallenge(next, "9.9.9.9", 1_021);
    store.authorize(next.requestId, authorization(next), 1_021);
    expect(store.get(replacement.requestId)).toMatchObject({
      state: "rejected",
      disposition: "authorization-expired",
    });
    store.close();
  });

  test("rejects malformed signer output before journaling it", () => {
    const store = new DomainAttesterStore();
    const value = challenge(1);
    store.issueChallenge(value, "8.8.8.8", 1_000);
    store.authorize(value.requestId, authorization(value), 1_001);
    expect(() =>
      store.recordSigned(
        value.requestId,
        {
          requestId: value.requestId,
          signerNonce: -1,
          serializedTransaction: "not-hex",
          txId: "short",
        },
        1_002,
      ),
    ).toThrow("invalid transaction data");
    expect(store.get(value.requestId).state).toBe("authorized");
    store.close();
  });

  test("records signer bytes across an authorization-expiry race", () => {
    const store = new DomainAttesterStore();
    const value = challenge(1);
    const authorized = authorization(value);
    authorized.authorizationExpiresAt = 1_010;
    store.issueChallenge(value, "8.8.8.8", 1_000);
    store.authorize(value.requestId, authorized, 1_001);
    store.expireStale(1_010);
    expect(store.get(value.requestId)).toMatchObject({
      state: "rejected",
      disposition: "authorization-expired",
    });

    expect(
      store.recordSigned(
        value.requestId,
        {
          requestId: value.requestId,
          signerNonce: 7,
          serializedTransaction: "deadbeef",
          txId: "aa".repeat(32),
        },
        1_011,
      ),
    ).toMatchObject({ state: "signed", signerNonce: 7 });
    store.close();
  });

  test("uses a mode-0600 SQLite file that survives process restart", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "origin-attester-"));
    const path = resolve(directory, "requests.local.sqlite");
    const value = challenge(1);
    const first = new DomainAttesterStore(path);
    first.issueChallenge(value, "8.8.8.8", 1_000);
    first.close();
    expect(statSync(path).mode & 0o777).toBe(0o600);

    const reopened = new DomainAttesterStore(path);
    expect(reopened.get(value.requestId)).toMatchObject({
      state: "challenge-issued",
      challenge: value,
    });
    reopened.close();
    expect(readFileSync(path).byteLength).toBeGreaterThan(0);
  });
});
