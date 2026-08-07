import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  Cl,
  ClarityType,
  fetchCallReadOnlyFunction,
  isClarityType,
} from "@stacks/transactions";
import { fetchWithTimeout } from "../demo/src/fetch-with-timeout.ts";
import {
  type ClaimFixture,
  type ContractFixture,
  type FixtureManifest,
  validateFixtureManifest,
} from "./testnet-manifest.ts";

const manifest = JSON.parse(
  await readFile(resolve("deployments/testnet-fixtures.json"), "utf8"),
) as FixtureManifest;
const { schemaVersion } = validateFixtureManifest(manifest);
const [registryAddress, registryName] = manifest.registry.principal.split(".");
assert(registryAddress && registryName, "Invalid registry principal");

function testnetFetch(input: Parameters<typeof fetch>[0]) {
  return fetchWithTimeout(fetch, input, undefined, 8_000);
}

async function verifyPublishedSource(
  subject: string,
  sourcePath: string,
  expectedTxId: string,
) {
  const response = await testnetFetch(
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
  if (schemaVersion === 2) {
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
  if (schemaVersion === 1) return;
  const value = await fetchCallReadOnlyFunction({
    contractAddress: registryAddress,
    contractName: registryName,
    functionName: "get-schema-version",
    functionArgs: [],
    senderAddress: registryAddress,
    network: "testnet",
  });
  assert.deepEqual(value, Cl.uint(schemaVersion));
}

const sourceChecks = [
  verifyPublishedSource(
    manifest.registry.principal,
    schemaVersion === 1
      ? "contracts/origin-registry.clar"
      : "contracts/origin-registry-v2.clar",
    manifest.registry.txId,
  ),
  verifySchemaVersion(),
  ...[
    manifest.fixtures.known,
    manifest.fixtures.unrecognized,
    manifest.fixtures.lookalike,
  ].map((fixture) =>
    verifyPublishedSource(
      fixture.subject,
      "contracts/origin-demo-target.clar",
      fixture.contractTxId,
    ),
  ),
  verifyClaim(manifest.fixtures.known),
  verifyClaim(manifest.fixtures.unrecognized),
];
if (schemaVersion === 2) {
  const domainProof = manifest.fixtures.domainProof;
  const lifecycle = manifest.fixtures.lifecycle;
  const expiry = manifest.fixtures.expiry;
  assert(domainProof && lifecycle && expiry, "Missing v2 fixtures");
  sourceChecks.push(
    verifyPublishedSource(
      domainProof.subject,
      "contracts/origin-domain-proof.clar",
      domainProof.contractTxId,
    ),
    verifyPublishedSource(
      lifecycle.subject,
      "contracts/origin-demo-target.clar",
      lifecycle.contractTxId,
    ),
    verifyPublishedSource(
      expiry.subject,
      "contracts/origin-demo-target.clar",
      expiry.contractTxId,
    ),
    verifyClaim(lifecycle),
    verifyClaim(expiry),
  );
}
await Promise.all(sourceChecks);

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

const infoResponse = await testnetFetch(`${manifest.apiUrl}/v2/info`);
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
    (schemaVersion === 1
      ? "four contracts, two claims, and one unknown same-name/different-deployer lookalike."
      : "seven contracts, four claims, and one unknown same-name/different-deployer lookalike."),
);
