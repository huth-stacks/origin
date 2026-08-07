import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  Cl,
  ClarityType,
  fetchCallReadOnlyFunction,
  isClarityType,
} from "@stacks/transactions";

interface ClaimFixture {
  attester: string;
  issuerName: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
  txId: string;
  requestId?: string;
}

interface ContractFixture {
  subject: string;
  contractTxId: string;
  stacksBlockHeight: number;
  claim?: ClaimFixture;
  referenceSubject?: string;
}

interface FixtureManifest {
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
  };
}

const manifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as FixtureManifest;
const [registryAddress, registryName] = manifest.registry.principal.split(".");
assert(registryAddress && registryName, "Invalid registry principal");
assert.equal(manifest.compatibility.apiUrl, manifest.apiUrl);
assert.equal(
  manifest.compatibility.registry.principal,
  manifest.registry.principal,
);
assert.equal(manifest.compatibility.registry.schemaVersion, 1);
assert.equal(manifest.compatibility.trustedAttesters.length, 1);
const trustedPolicy = manifest.compatibility.trustedAttesters[0];
assert(trustedPolicy, "Missing trusted-attester compatibility policy");
assert.equal(trustedPolicy.principal, manifest.attesters.trusted.principal);
assert(
  trustedPolicy.validFromBurnBlock <= manifest.fixtures.known.claim.issuedAt,
  "Trusted-attester interval starts after the known claim",
);
assert(
  manifest.fixtures.known.claim.expiresAt -
    manifest.fixtures.known.claim.issuedAt <=
    trustedPolicy.maxClaimLifetimeBurnBlocks,
  "Known claim exceeds the wallet lifetime policy",
);
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

async function verifyPublishedSource(
  subject: string,
  sourcePath: string,
  expectedTxId: string,
) {
  const response = await fetch(
    `${manifest.apiUrl}/extended/v1/contract/${subject}`,
  );
  assert.equal(
    response.ok,
    true,
    `Contract lookup failed for ${subject}: ${response.status}`,
  );
  const contract = (await response.json()) as {
    source_code?: string;
    tx_id?: string;
  };
  assert.equal(
    contract.source_code,
    await readFile(resolve(sourcePath), "utf8"),
  );
  assert.equal(contract.tx_id, expectedTxId);
}

async function readAttestation(attester: string, subject: string) {
  return fetchCallReadOnlyFunction({
    contractAddress: registryAddress,
    contractName: registryName,
    functionName: "get-attestation",
    functionArgs: [Cl.principal(attester), Cl.principal(subject)],
    senderAddress: registryAddress,
    network: "testnet",
  });
}

async function verifyClaim(fixture: ContractFixture & { claim: ClaimFixture }) {
  const value = await readAttestation(fixture.claim.attester, fixture.subject);
  assert(
    isClarityType(value, ClarityType.OptionalSome),
    `Missing claim for ${fixture.subject}`,
  );
  assert(
    isClarityType(value.value, ClarityType.Tuple),
    `Invalid claim for ${fixture.subject}`,
  );
  const claim = value.value.value;
  assert.deepEqual(
    claim["issuer-name"],
    Cl.stringAscii(fixture.claim.issuerName),
  );
  assert.deepEqual(claim.role, Cl.stringAscii(fixture.claim.role));
  assert.deepEqual(claim["issued-at"], Cl.uint(fixture.claim.issuedAt));
  assert.deepEqual(claim["expires-at"], Cl.uint(fixture.claim.expiresAt));
  assert.deepEqual(claim.revoked, Cl.bool(false));
  if (manifest.compatibility.registry.schemaVersion === 2) {
    assert.deepEqual(claim["revoked-at"], Cl.none());
    assert(
      fixture.claim.requestId,
      `Missing v2 request ID for ${fixture.subject}`,
    );
    assert.deepEqual(
      claim["request-id"],
      Cl.bufferFromHex(fixture.claim.requestId),
    );
  }
}

async function verifySchemaVersion() {
  if (manifest.compatibility.registry.schemaVersion === 1) return;
  const value = await fetchCallReadOnlyFunction({
    contractAddress: registryAddress,
    contractName: registryName,
    functionName: "get-schema-version",
    functionArgs: [],
    senderAddress: registryAddress,
    network: "testnet",
  });
  assert.deepEqual(
    value,
    Cl.uint(manifest.compatibility.registry.schemaVersion),
  );
}

await Promise.all([
  verifyPublishedSource(
    manifest.registry.principal,
    manifest.compatibility.registry.schemaVersion === 1
      ? "contracts/origin-registry.clar"
      : "contracts/origin-registry-v2.clar",
    manifest.registry.txId,
  ),
  verifySchemaVersion(),
  ...Object.values(manifest.fixtures).map((fixture) =>
    verifyPublishedSource(
      fixture.subject,
      "contracts/origin-demo-target.clar",
      fixture.contractTxId,
    ),
  ),
  verifyClaim(manifest.fixtures.known),
  verifyClaim(manifest.fixtures.unrecognized),
]);

const lookalikeClaim = await readAttestation(
  manifest.attesters.trusted.principal,
  manifest.fixtures.lookalike.subject,
);
assert(
  isClarityType(lookalikeClaim, ClarityType.OptionalNone),
  "Lookalike must remain unknown",
);

const trustedClaimOnUnrecognizedFixture = await readAttestation(
  manifest.attesters.trusted.principal,
  manifest.fixtures.unrecognized.subject,
);
assert(
  isClarityType(trustedClaimOnUnrecognizedFixture, ClarityType.OptionalNone),
  "Unrecognized fixture must not have a trusted claim",
);

const [, referenceName] =
  manifest.fixtures.lookalike.referenceSubject.split(".");
const [lookalikeDeployer, lookalikeName] =
  manifest.fixtures.lookalike.subject.split(".");
const [referenceDeployer] =
  manifest.fixtures.lookalike.referenceSubject.split(".");
assert.equal(
  lookalikeName,
  referenceName,
  "Lookalike contract names must match",
);
assert.notEqual(
  lookalikeDeployer,
  referenceDeployer,
  "Lookalike deployers must differ",
);

const infoResponse = await fetch(`${manifest.apiUrl}/v2/info`);
assert.equal(
  infoResponse.ok,
  true,
  `Testnet info request failed: ${infoResponse.status}`,
);
const info = (await infoResponse.json()) as { burn_block_height?: number };
assert(
  Number.isSafeInteger(info.burn_block_height),
  "Testnet returned an invalid burn height",
);
assert(
  (info.burn_block_height as number) < manifest.fixtures.known.claim.expiresAt,
  "Known claim has expired",
);
assert(
  (info.burn_block_height as number) <
    manifest.fixtures.unrecognized.claim.expiresAt,
  "Unrecognized claim has expired",
);

console.log(
  `Verified Origin Testnet deployment at burn height ${info.burn_block_height}: ` +
    "four contracts, two claims, and one unknown same-name/different-deployer lookalike.",
);
