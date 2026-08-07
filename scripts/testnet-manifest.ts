import assert from "node:assert/strict";

export interface ClaimFixture {
  attester: string;
  issuerName: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  txId: string;
  requestId?: string;
}

export interface ContractFixture {
  subject: string;
  contractTxId: string;
  stacksBlockHeight: number;
  claim?: ClaimFixture;
  referenceSubject?: string;
}

export interface FixtureManifest {
  apiUrl: string;
  compatibility: {
    version: number;
    apiUrl: string;
    registry: { principal: string; schemaVersion: number };
    trustedAttesters: {
      principal: string;
      displayName: string;
      validFromBurnBlock: number;
      validUntilBurnBlock?: number;
      maxClaimLifetimeBurnBlocks: number;
    }[];
    discoveryAttesters: string[];
    referenceContracts: { subject: string }[];
  };
  registry: { principal: string; txId: string };
  attesters: {
    trusted: { principal: string };
    unrecognized: { principal: string };
  };
  fixtures: {
    known: ContractFixture & { claim: ClaimFixture };
    unrecognized: ContractFixture & { claim: ClaimFixture };
    lookalike: ContractFixture & { referenceSubject: string };
    domainProof?: ContractFixture;
    lifecycle?: ContractFixture & { claim: ClaimFixture };
    expiry?: ContractFixture & { claim: ClaimFixture };
  };
}

export function validateFixtureManifest(manifest: FixtureManifest) {
  assert.equal(manifest.compatibility.apiUrl, manifest.apiUrl);
  assert.equal(
    manifest.compatibility.registry.principal,
    manifest.registry.principal,
  );
  const schemaVersion = manifest.compatibility.registry.schemaVersion;
  assert(
    schemaVersion === 1 || schemaVersion === 2,
    `Unsupported registry schema version ${schemaVersion}`,
  );
  assert.equal(manifest.compatibility.trustedAttesters.length, 1);
  const trustedPolicy = manifest.compatibility.trustedAttesters[0];
  assert(trustedPolicy, "Missing trusted-attester compatibility policy");
  assert.equal(trustedPolicy.principal, manifest.attesters.trusted.principal);
  const assertTrustedClaimPolicy = (
    fixtureName: string,
    fixture: ContractFixture & { claim: ClaimFixture },
  ) => {
    assert.equal(
      fixture.claim.attester,
      trustedPolicy.principal,
      `${fixtureName} claim must use the trusted attester`,
    );
    assert(
      trustedPolicy.validFromBurnBlock <= fixture.claim.issuedAt,
      `Trusted-attester interval starts after the ${fixtureName} claim`,
    );
    if (trustedPolicy.validUntilBurnBlock !== undefined)
      assert(
        fixture.claim.issuedAt < trustedPolicy.validUntilBurnBlock,
        `Trusted-attester interval ends at or before the ${fixtureName} claim`,
      );
    assert(
      fixture.claim.expiresAt - fixture.claim.issuedAt <=
        trustedPolicy.maxClaimLifetimeBurnBlocks,
      `${fixtureName} claim exceeds the wallet lifetime policy`,
    );
  };
  assertTrustedClaimPolicy("known", manifest.fixtures.known);
  assert(
    manifest.compatibility.discoveryAttesters.includes(
      manifest.attesters.trusted.principal,
    ),
    "Trusted attester is absent from discovery",
  );
  assert(
    manifest.compatibility.discoveryAttesters.includes(
      manifest.attesters.unrecognized.principal,
    ),
    "Unrecognized fixture issuer is absent from discovery",
  );
  assert.deepEqual(manifest.compatibility.referenceContracts, [
    { subject: manifest.fixtures.known.subject },
  ]);
  assert.equal(
    manifest.attesters.trusted.principal,
    manifest.fixtures.known.claim.attester,
    "Known claim must be issued by the configured trusted attester",
  );
  assert.equal(
    manifest.attesters.unrecognized.principal,
    manifest.fixtures.unrecognized.claim.attester,
    "Unrecognized claim must be issued by its configured fixture attester",
  );
  assert.notEqual(
    manifest.fixtures.unrecognized.claim.attester,
    manifest.attesters.trusted.principal,
    "Unrecognized fixture attester must differ from the trusted attester",
  );
  if (schemaVersion === 2) {
    assert(manifest.fixtures.domainProof, "Missing v2 domain-proof fixture");
    assert(manifest.fixtures.lifecycle, "Missing v2 lifecycle fixture");
    assert(manifest.fixtures.expiry, "Missing v2 expiry fixture");
    assertTrustedClaimPolicy("lifecycle", manifest.fixtures.lifecycle);
    assertTrustedClaimPolicy("expiry", manifest.fixtures.expiry);
    assert(
      manifest.fixtures.expiry.claim.expiresAt <
        manifest.fixtures.known.claim.expiresAt,
      "Expiry fixture is not shorter-lived than the canonical claim",
    );
    for (const fixture of [
      manifest.fixtures.known,
      manifest.fixtures.unrecognized,
      manifest.fixtures.lifecycle,
      manifest.fixtures.expiry,
    ])
      assert(
        fixture.claim.requestId,
        `Missing v2 request ID for ${fixture.subject}`,
      );
  }
  return { schemaVersion, trustedPolicy };
}
