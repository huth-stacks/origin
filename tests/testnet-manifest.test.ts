import currentManifest from "../deployments/testnet-fixtures.json";
import { describe, expect, test } from "vitest";

import {
  type FixtureManifest,
  validateFixtureManifest,
} from "../scripts/testnet-manifest";

function cloneCurrentManifest() {
  return structuredClone(currentManifest) as FixtureManifest;
}

function v2Manifest() {
  const manifest = cloneCurrentManifest();
  manifest.compatibility.registry.schemaVersion = 2;
  const requestId = "11".repeat(32);
  manifest.fixtures.known.claim.requestId = requestId;
  manifest.fixtures.unrecognized.claim.requestId = "22".repeat(32);
  manifest.fixtures.domainProof = {
    subject: "STPROOF.origin-domain-proof",
    contractTxId: "proof-tx",
    stacksBlockHeight: 10,
    claim: {
      attester: manifest.attesters.domain!.principal,
      issuerName: "origin-demo.vercel.app",
      role: "Protocol contract",
      issuedAt: manifest.fixtures.known.claim.issuedAt,
      expiresAt: manifest.fixtures.known.claim.issuedAt + 4_320,
      requestId: "55".repeat(32),
      txId: "domain-claim-tx",
    },
  };
  manifest.fixtures.lifecycle = {
    subject: "STLIFE.origin-lifecycle-action",
    contractTxId: "life-tx",
    stacksBlockHeight: 10,
    claim: {
      ...manifest.fixtures.known.claim,
      requestId: "33".repeat(32),
    },
  };
  manifest.fixtures.expiry = {
    subject: "STEXPIRY.origin-expiry-action",
    contractTxId: "expiry-tx",
    stacksBlockHeight: 10,
    claim: {
      ...manifest.fixtures.known.claim,
      expiresAt: manifest.fixtures.known.claim.expiresAt - 1,
      requestId: "44".repeat(32),
    },
  };
  return manifest;
}

describe(validateFixtureManifest.name, () => {
  test("accepts the current v2 compatibility record", () => {
    expect(validateFixtureManifest(cloneCurrentManifest()).schemaVersion).toBe(
      2,
    );
  });

  test("accepts a complete v2 candidate", () => {
    expect(validateFixtureManifest(v2Manifest()).schemaVersion).toBe(2);
  });

  test("rejects an unsupported schema version", () => {
    const manifest = cloneCurrentManifest();
    manifest.compatibility.registry.schemaVersion = 3;

    expect(() => validateFixtureManifest(manifest)).toThrow(
      "Unsupported registry schema version 3",
    );
  });

  test("rejects a trust interval whose upper bound excludes the claim", () => {
    const manifest = cloneCurrentManifest();
    manifest.compatibility.trustedAttesters[0]!.validUntilBurnBlock =
      manifest.fixtures.known.claim.issuedAt;

    expect(() => validateFixtureManifest(manifest)).toThrow(
      "Trusted-attester interval ends at or before the known claim",
    );
  });

  test("rejects a v2 candidate missing any v2-only fixture", () => {
    const manifest = v2Manifest();
    delete manifest.fixtures.expiry;

    expect(() => validateFixtureManifest(manifest)).toThrow(
      "Missing v2 expiry fixture",
    );
  });

  test("rejects a domain trust interval that excludes its claim", () => {
    const manifest = v2Manifest();
    const domainPolicy = manifest.compatibility.trustedAttesters.find(
      ({ principal }) => principal === manifest.attesters.domain!.principal,
    )!;
    domainPolicy.validUntilBurnBlock =
      manifest.fixtures.domainProof!.claim.issuedAt;

    expect(() => validateFixtureManifest(manifest)).toThrow(
      "Domain-attester interval ends at or before the domain-proof claim",
    );
  });
});
