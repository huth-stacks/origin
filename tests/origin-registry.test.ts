import { Cl } from '@stacks/transactions';
import { describe, expect, test } from 'vitest';

const accounts = simnet.getAccounts();

function getAccount(name: string) {
  const account = accounts.get(name);
  if (!account) throw new Error(`Missing Simnet account: ${name}`);
  return account;
}

const deployer = getAccount('deployer');
const attesterA = getAccount('wallet_1');
const attesterB = getAccount('wallet_2');
const walletSubject = getAccount('wallet_3');
const contractSubject = Cl.contractPrincipal(deployer, 'origin-demo-target');

function issueAttestation(
  attester: string,
  subject:
    ReturnType<typeof Cl.principal> | ReturnType<typeof Cl.contractPrincipal>,
  issuerName = 'Acme',
  role = 'Demo contract',
  expiresAt = simnet.burnBlockHeight + 100,
) {
  return simnet.callPublicFn(
    'origin-registry',
    'issue-attestation',
    [
      subject,
      Cl.stringAscii(issuerName),
      Cl.stringAscii(role),
      Cl.uint(expiresAt),
    ],
    attester,
  );
}

function getAttestation(
  attester: string,
  subject:
    ReturnType<typeof Cl.principal> | ReturnType<typeof Cl.contractPrincipal>,
) {
  return simnet.callReadOnlyFn(
    'origin-registry',
    'get-attestation',
    [Cl.principal(attester), subject],
    deployer,
  );
}

describe('origin-registry', () => {
  test('stores a seven-field attestation under the sender and exact contract subject', () => {
    const receipt = issueAttestation(attesterA, contractSubject);

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(receipt.events).toHaveLength(1);
    expect(receipt.events.map((event) => event.event)).toEqual(['print_event']);
    expect(getAttestation(attesterA, contractSubject).result).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Acme'),
        role: Cl.stringAscii('Demo contract'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
      }),
    );
  });

  test('keeps independent attester namespaces for the same subject', () => {
    issueAttestation(attesterA, contractSubject, 'Acme');
    issueAttestation(attesterB, contractSubject, 'Impostor');

    expect(getAttestation(attesterA, contractSubject).result).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Acme'),
        role: Cl.stringAscii('Demo contract'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
      }),
    );
    expect(getAttestation(attesterB, contractSubject).result).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Impostor'),
        role: Cl.stringAscii('Demo contract'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
      }),
    );
  });

  test('lets the same attester replace only its own record', () => {
    issueAttestation(attesterA, contractSubject, 'Acme', 'Old role');
    simnet.callPublicFn(
      'origin-registry',
      'revoke-attestation',
      [contractSubject],
      attesterA,
    );
    issueAttestation(attesterA, contractSubject, 'Acme', 'Current role');

    const record = getAttestation(attesterA, contractSubject).result;
    expect(record).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Acme'),
        role: Cl.stringAscii('Current role'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
      }),
    );
  });

  test('revokes only the sender namespace', () => {
    issueAttestation(attesterA, contractSubject, 'Acme');
    issueAttestation(attesterB, contractSubject, 'Other');

    const receipt = simnet.callPublicFn(
      'origin-registry',
      'revoke-attestation',
      [contractSubject],
      attesterA,
    );

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(receipt.events).toHaveLength(1);
    expect(receipt.events.map((event) => event.event)).toEqual(['print_event']);
    const attesterARecord = getAttestation(attesterA, contractSubject).result;
    const attesterBRecord = getAttestation(attesterB, contractSubject).result;
    expect(attesterARecord).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Acme'),
        role: Cl.stringAscii('Demo contract'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(true),
      }),
    );
    expect(attesterBRecord).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Other'),
        role: Cl.stringAscii('Demo contract'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
      }),
    );
  });

  test('rejects expiration heights that are not in the future', () => {
    const receipt = issueAttestation(
      attesterA,
      contractSubject,
      'Acme',
      'Demo contract',
      simnet.burnBlockHeight,
    );

    expect(receipt.result).toBeErr(Cl.uint(400));
    expect(getAttestation(attesterA, contractSubject).result).toBeNone();
  });

  test('retains an expired record for consumers to evaluate against burn height', () => {
    const issuedAt = simnet.burnBlockHeight;
    issueAttestation(
      attesterA,
      contractSubject,
      'Acme',
      'Demo contract',
      issuedAt + 1,
    );
    simnet.mineEmptyBlocks(1);

    expect(getAttestation(attesterA, contractSubject).result).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Acme'),
        role: Cl.stringAscii('Demo contract'),
        'issued-at': Cl.uint(issuedAt),
        'expires-at': Cl.uint(issuedAt + 1),
        revoked: Cl.bool(false),
      }),
    );
  });

  test('returns not found when the sender has no record to revoke', () => {
    const receipt = simnet.callPublicFn(
      'origin-registry',
      'revoke-attestation',
      [contractSubject],
      attesterA,
    );

    expect(receipt.result).toBeErr(Cl.uint(404));
  });

  test('accepts wallet principals as subjects', () => {
    const walletPrincipal = Cl.principal(walletSubject);
    issueAttestation(attesterA, walletPrincipal, 'Acme', 'Treasury');

    expect(getAttestation(attesterA, walletPrincipal).result).toBeSome(
      Cl.tuple({
        'issuer-name': Cl.stringAscii('Acme'),
        role: Cl.stringAscii('Treasury'),
        'issued-at': Cl.uint(simnet.burnBlockHeight),
        'expires-at': Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
      }),
    );
  });
});
