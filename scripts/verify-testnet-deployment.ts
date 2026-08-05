import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  Cl,
  ClarityType,
  fetchCallReadOnlyFunction,
  isClarityType,
} from '@stacks/transactions';

interface ClaimFixture {
  attester: string;
  issuerName: string;
  role: string;
  expiresAt: number;
  txId: string;
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
  registry: { principal: string; txId: string };
  attesters: { trusted: { principal: string }; unrecognized: { principal: string } };
  fixtures: {
    known: ContractFixture & { claim: ClaimFixture };
    unrecognized: ContractFixture & { claim: ClaimFixture };
    lookalike: ContractFixture & { referenceSubject: string };
  };
}

const manifest = JSON.parse(
  await readFile(resolve('deployments/testnet-fixtures.json'), 'utf8')
) as FixtureManifest;
const [registryAddress, registryName] = manifest.registry.principal.split('.');
assert(registryAddress && registryName, 'Invalid registry principal');

async function verifyPublishedSource(subject: string, sourcePath: string, expectedTxId: string) {
  const response = await fetch(`${manifest.apiUrl}/extended/v1/contract/${subject}`);
  assert.equal(response.ok, true, `Contract lookup failed for ${subject}: ${response.status}`);
  const contract = (await response.json()) as { source_code?: string; tx_id?: string };
  assert.equal(contract.source_code, await readFile(resolve(sourcePath), 'utf8'));
  assert.equal(contract.tx_id, expectedTxId);
}

async function readAttestation(attester: string, subject: string) {
  return fetchCallReadOnlyFunction({
    contractAddress: registryAddress,
    contractName: registryName,
    functionName: 'get-attestation',
    functionArgs: [Cl.principal(attester), Cl.principal(subject)],
    senderAddress: registryAddress,
    network: 'testnet',
  });
}

async function verifyClaim(fixture: ContractFixture & { claim: ClaimFixture }) {
  const value = await readAttestation(fixture.claim.attester, fixture.subject);
  assert(isClarityType(value, ClarityType.OptionalSome), `Missing claim for ${fixture.subject}`);
  assert(isClarityType(value.value, ClarityType.Tuple), `Invalid claim for ${fixture.subject}`);
  const claim = value.value.value;
  assert.deepEqual(claim['issuer-name'], Cl.stringAscii(fixture.claim.issuerName));
  assert.deepEqual(claim.role, Cl.stringAscii(fixture.claim.role));
  assert.deepEqual(claim['expires-at'], Cl.uint(fixture.claim.expiresAt));
  assert.deepEqual(claim.revoked, Cl.bool(false));
}

await Promise.all([
  verifyPublishedSource(
    manifest.registry.principal,
    'contracts/origin-registry.clar',
    manifest.registry.txId
  ),
  ...Object.values(manifest.fixtures).map(fixture =>
    verifyPublishedSource(
      fixture.subject,
      'contracts/origin-demo-target.clar',
      fixture.contractTxId
    )
  ),
  verifyClaim(manifest.fixtures.known),
  verifyClaim(manifest.fixtures.unrecognized),
]);

const lookalikeClaim = await readAttestation(
  manifest.attesters.trusted.principal,
  manifest.fixtures.lookalike.subject
);
assert(isClarityType(lookalikeClaim, ClarityType.OptionalNone), 'Lookalike must remain unknown');

const [, referenceName] = manifest.fixtures.lookalike.referenceSubject.split('.');
const [lookalikeDeployer, lookalikeName] = manifest.fixtures.lookalike.subject.split('.');
const [referenceDeployer] = manifest.fixtures.lookalike.referenceSubject.split('.');
assert.equal(lookalikeName, referenceName, 'Lookalike contract names must match');
assert.notEqual(lookalikeDeployer, referenceDeployer, 'Lookalike deployers must differ');

const infoResponse = await fetch(`${manifest.apiUrl}/v2/info`);
assert.equal(infoResponse.ok, true, `Testnet info request failed: ${infoResponse.status}`);
const info = (await infoResponse.json()) as { burn_block_height?: number };
assert(Number.isSafeInteger(info.burn_block_height), 'Testnet returned an invalid burn height');
assert(
  (info.burn_block_height as number) < manifest.fixtures.known.claim.expiresAt,
  'Known claim has expired'
);

console.log(
  `Verified Origin Testnet deployment at burn height ${info.burn_block_height}: ` +
    'four contracts, two claims, and one unknown same-name/different-deployer lookalike.'
);
