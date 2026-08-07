import { Cl } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

const accounts = simnet.getAccounts();

function getAccount(name: string) {
  const account = accounts.get(name);
  if (!account) throw new Error(`Missing Simnet account: ${name}`);
  return account;
}

const deployer = getAccount("deployer");
const attester = getAccount("wallet_1");
const contractSubject = Cl.contractPrincipal(deployer, "origin-demo-target");

function issueAttestation(role = "Demo contract") {
  return simnet.callPublicFn(
    "origin-registry-v2",
    "issue-attestation",
    [
      contractSubject,
      Cl.stringAscii("Acme"),
      Cl.stringAscii(role),
      Cl.uint(simnet.burnBlockHeight + 100),
    ],
    attester,
  );
}

function revokeAttestation() {
  return simnet.callPublicFn(
    "origin-registry-v2",
    "revoke-attestation",
    [contractSubject],
    attester,
  );
}

function getAttestation() {
  return simnet.callReadOnlyFn(
    "origin-registry-v2",
    "get-attestation",
    [Cl.principal(attester), contractSubject],
    deployer,
  );
}

function readPrintEvent(receipt: ReturnType<typeof issueAttestation>) {
  const event = receipt.events.find((event) => event.event === "print_event");
  if (!event || event.event !== "print_event")
    throw new Error("Missing print event");
  return event.data.value;
}

describe("origin-registry-v2", () => {
  test("stores the complete active lifecycle record and issuance event", () => {
    const issuedAt = simnet.burnBlockHeight;
    const receipt = issueAttestation();

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(getAttestation().result).toBeSome(
      Cl.tuple({
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(issuedAt),
        "expires-at": Cl.uint(issuedAt + 100),
        revoked: Cl.bool(false),
        "revoked-at": Cl.none(),
      }),
    );
    expect(readPrintEvent(receipt)).toEqual(
      Cl.tuple({
        event: Cl.stringAscii("origin-attestation-issued"),
        attester: Cl.principal(attester),
        subject: contractSubject,
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(issuedAt),
        "expires-at": Cl.uint(issuedAt + 100),
        revoked: Cl.bool(false),
        "revoked-at": Cl.none(),
      }),
    );
  });

  test("persists revocation time and emits enough prior record data to index it", () => {
    issueAttestation();
    simnet.mineEmptyBlocks(1);
    const revokedAt = simnet.burnBlockHeight;
    const receipt = revokeAttestation();

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(getAttestation().result).toBeSome(
      Cl.tuple({
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(revokedAt - 1),
        "expires-at": Cl.uint(revokedAt + 99),
        revoked: Cl.bool(true),
        "revoked-at": Cl.some(Cl.uint(revokedAt)),
      }),
    );
    expect(readPrintEvent(receipt)).toEqual(
      Cl.tuple({
        event: Cl.stringAscii("origin-attestation-revoked"),
        attester: Cl.principal(attester),
        subject: contractSubject,
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(revokedAt - 1),
        "expires-at": Cl.uint(revokedAt + 99),
        revoked: Cl.bool(true),
        "revoked-at": Cl.some(Cl.uint(revokedAt)),
      }),
    );
  });

  test("reissuance replaces the record and explicitly clears revocation state", () => {
    issueAttestation("Old role");
    revokeAttestation();
    simnet.mineEmptyBlocks(1);
    const reissuedAt = simnet.burnBlockHeight;
    issueAttestation("Current role");

    expect(getAttestation().result).toBeSome(
      Cl.tuple({
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Current role"),
        "issued-at": Cl.uint(reissuedAt),
        "expires-at": Cl.uint(reissuedAt + 100),
        revoked: Cl.bool(false),
        "revoked-at": Cl.none(),
      }),
    );
  });

  test("rejects issue calls forwarded by another contract", () => {
    const receipt = simnet.callPublicFn(
      "origin-registry-caller",
      "issue-v2",
      [
        contractSubject,
        Cl.stringAscii("Acme"),
        Cl.stringAscii("Demo contract"),
        Cl.uint(simnet.burnBlockHeight + 100),
      ],
      attester,
    );

    expect(receipt.result).toBeErr(Cl.uint(403));
    expect(getAttestation().result).toBeNone();
  });

  test("rejects revoke calls forwarded by another contract", () => {
    issueAttestation();
    const receipt = simnet.callPublicFn(
      "origin-registry-caller",
      "revoke-v2",
      [contractSubject],
      attester,
    );

    expect(receipt.result).toBeErr(Cl.uint(403));
    expect(getAttestation().result).toBeSome(
      Cl.tuple({
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(simnet.burnBlockHeight),
        "expires-at": Cl.uint(simnet.burnBlockHeight + 100),
        revoked: Cl.bool(false),
        "revoked-at": Cl.none(),
      }),
    );
  });
});
