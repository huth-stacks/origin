import { Cl, type ClarityValue } from "@stacks/transactions";
import { describe, expect, test } from "vitest";

const accounts = simnet.getAccounts();

function getAccount(name: string) {
  const account = accounts.get(name);
  if (!account) throw new Error(`Missing Simnet account: ${name}`);
  return account;
}

const deployer = getAccount("deployer");
const attester = getAccount("wallet_1");
const secondAttester = getAccount("wallet_2");
const walletSubject = getAccount("wallet_3");
const contractSubject = Cl.contractPrincipal(deployer, "origin-demo-target");
const secondContractSubject = Cl.contractPrincipal(deployer, "second-target");

function requestId(byte: string) {
  return Cl.bufferFromHex(byte.repeat(32));
}

interface IssueOptions {
  sender?: string;
  subject?: ClarityValue;
  issuerName?: string;
  role?: string;
  expiresAt?: number;
  request?: ClarityValue;
}

function issueAttestation({
  sender = attester,
  subject = contractSubject,
  issuerName = "Acme",
  role = "Demo contract",
  expiresAt = simnet.burnBlockHeight + 100,
  request = requestId("01"),
}: IssueOptions = {}) {
  return simnet.callPublicFn(
    "origin-registry-v2",
    "issue-attestation",
    [
      subject,
      Cl.stringAscii(issuerName),
      Cl.stringAscii(role),
      Cl.uint(expiresAt),
      request,
    ],
    sender,
  );
}

function revokeAttestation(
  request: ClarityValue = requestId("02"),
  subject: ClarityValue = contractSubject,
  sender = attester,
) {
  return simnet.callPublicFn(
    "origin-registry-v2",
    "revoke-attestation",
    [subject, request],
    sender,
  );
}

function getAttestation(
  subject: ClarityValue = contractSubject,
  selectedAttester = attester,
) {
  return simnet.callReadOnlyFn(
    "origin-registry-v2",
    "get-attestation",
    [Cl.principal(selectedAttester), subject],
    deployer,
  );
}

function readPrintEvent(receipt: ReturnType<typeof issueAttestation>) {
  const event = receipt.events.find(
    (candidate) => candidate.event === "print_event",
  );
  if (!event || event.event !== "print_event")
    throw new Error("Missing print event");
  return event.data.value;
}

function expectedRecord({
  issuerName = "Acme",
  role = "Demo contract",
  issuedAt,
  expiresAt,
  revoked = false,
  revokedAt = Cl.none(),
  request = requestId("01"),
}: {
  issuerName?: string;
  role?: string;
  issuedAt: number;
  expiresAt: number;
  revoked?: boolean;
  revokedAt?: ClarityValue;
  request?: ClarityValue;
}) {
  return Cl.tuple({
    "issuer-name": Cl.stringAscii(issuerName),
    role: Cl.stringAscii(role),
    "issued-at": Cl.uint(issuedAt),
    "expires-at": Cl.uint(expiresAt),
    revoked: Cl.bool(revoked),
    "revoked-at": revokedAt,
    "request-id": request,
  });
}

describe("origin-registry-v2", () => {
  test("publishes an explicit schema version", () => {
    expect(
      simnet.callReadOnlyFn(
        "origin-registry-v2",
        "get-schema-version",
        [],
        deployer,
      ).result,
    ).toBeUint(2);
  });

  test("stores the complete active record and versioned issuance event", () => {
    const issuedAt = simnet.burnBlockHeight;
    const request = requestId("11");
    const receipt = issueAttestation({ request });

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(getAttestation().result).toBeSome(
      expectedRecord({
        issuedAt,
        expiresAt: issuedAt + 100,
        request,
      }),
    );
    expect(readPrintEvent(receipt)).toEqual(
      Cl.tuple({
        version: Cl.uint(2),
        event: Cl.stringAscii("origin-attestation-issued"),
        attester: Cl.principal(attester),
        subject: contractSubject,
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(issuedAt),
        "expires-at": Cl.uint(issuedAt + 100),
        revoked: Cl.bool(false),
        "revoked-at": Cl.none(),
        "request-id": request,
      }),
    );
  });

  test("persists revocation time and emits the complete versioned record", () => {
    const issuedAt = simnet.burnBlockHeight;
    issueAttestation({ request: requestId("21") });
    simnet.mineEmptyBlocks(1);
    const revokedAt = simnet.burnBlockHeight;
    const revokeRequest = requestId("22");
    const receipt = revokeAttestation(revokeRequest);

    expect(receipt.result).toBeOk(Cl.bool(true));
    expect(getAttestation().result).toBeSome(
      expectedRecord({
        issuedAt,
        expiresAt: issuedAt + 100,
        revoked: true,
        revokedAt: Cl.some(Cl.uint(revokedAt)),
        request: revokeRequest,
      }),
    );
    expect(readPrintEvent(receipt)).toEqual(
      Cl.tuple({
        version: Cl.uint(2),
        event: Cl.stringAscii("origin-attestation-revoked"),
        attester: Cl.principal(attester),
        subject: contractSubject,
        "issuer-name": Cl.stringAscii("Acme"),
        role: Cl.stringAscii("Demo contract"),
        "issued-at": Cl.uint(issuedAt),
        "expires-at": Cl.uint(issuedAt + 100),
        revoked: Cl.bool(true),
        "revoked-at": Cl.some(Cl.uint(revokedAt)),
        "request-id": revokeRequest,
      }),
    );
  });

  test("keeps independent attester namespaces for one subject", () => {
    const issuedAt = simnet.burnBlockHeight;
    issueAttestation({ request: requestId("31") });
    issueAttestation({
      sender: secondAttester,
      issuerName: "Other",
      request: requestId("31"),
    });

    expect(getAttestation().result).toBeSome(
      expectedRecord({
        issuedAt,
        expiresAt: issuedAt + 100,
        request: requestId("31"),
      }),
    );
    expect(getAttestation(contractSubject, secondAttester).result).toBeSome(
      expectedRecord({
        issuerName: "Other",
        issuedAt,
        expiresAt: issuedAt + 100,
        request: requestId("31"),
      }),
    );
  });

  test("stores multiple subjects for one attester", () => {
    issueAttestation({ request: requestId("41") });
    issueAttestation({
      subject: secondContractSubject,
      request: requestId("42"),
    });

    expect(getAttestation().result).toBeSome(expect.anything());
    expect(getAttestation(secondContractSubject).result).toBeSome(
      expect.anything(),
    );
  });

  test("accepts a standard wallet principal as subject", () => {
    issueAttestation({
      subject: Cl.principal(walletSubject),
      request: requestId("51"),
    });

    expect(getAttestation(Cl.principal(walletSubject)).result).toBeSome(
      expect.anything(),
    );
  });

  test("direct active issuance replaces the prior record", () => {
    issueAttestation({ role: "Old role", request: requestId("61") });
    simnet.mineEmptyBlocks(1);
    const reissuedAt = simnet.burnBlockHeight;
    const request = requestId("62");
    issueAttestation({ role: "Current role", request });

    expect(getAttestation().result).toBeSome(
      expectedRecord({
        role: "Current role",
        issuedAt: reissuedAt,
        expiresAt: reissuedAt + 100,
        request,
      }),
    );
  });

  test("reissuance clears revocation state", () => {
    issueAttestation({ role: "Old role", request: requestId("71") });
    revokeAttestation(requestId("72"));
    simnet.mineEmptyBlocks(1);
    const reissuedAt = simnet.burnBlockHeight;
    const request = requestId("73");
    issueAttestation({ role: "Current role", request });

    expect(getAttestation().result).toBeSome(
      expectedRecord({
        role: "Current role",
        issuedAt: reissuedAt,
        expiresAt: reissuedAt + 100,
        request,
      }),
    );
  });

  test("retains an expired lifecycle record for consumers", () => {
    const issuedAt = simnet.burnBlockHeight;
    const request = requestId("81");
    expect(
      issueAttestation({ expiresAt: issuedAt + 1, request }).result,
    ).toBeOk(Cl.bool(true));
    simnet.mineEmptyBlocks(1);

    expect(getAttestation().result).toBeSome(
      expectedRecord({ issuedAt, expiresAt: issuedAt + 1, request }),
    );
  });

  test("rejects an expiration at the current height", () => {
    const request = requestId("91");
    expect(
      issueAttestation({ expiresAt: simnet.burnBlockHeight, request }).result,
    ).toBeErr(Cl.uint(400));
    expect(getAttestation().result).toBeNone();
    expect(issueAttestation({ request }).result).toBeOk(Cl.bool(true));
  });

  test("returns not found without consuming a revoke request", () => {
    const request = requestId("a1");
    expect(revokeAttestation(request).result).toBeErr(Cl.uint(404));
    expect(issueAttestation({ request }).result).toBeOk(Cl.bool(true));
  });

  test("does not emit or consume a request for repeated revocation", () => {
    issueAttestation({ request: requestId("b1") });
    expect(revokeAttestation(requestId("b2")).result).toBeOk(Cl.bool(true));

    const repeatedRequest = requestId("b3");
    const receipt = revokeAttestation(repeatedRequest);

    expect(receipt.result).toBeOk(Cl.bool(false));
    expect(receipt.events).toHaveLength(0);
    expect(
      issueAttestation({
        subject: secondContractSubject,
        request: repeatedRequest,
      }).result,
    ).toBeOk(Cl.bool(true));
  });

  test.each([
    ["issuer name", "", "Demo contract"],
    ["role", "Acme", ""],
  ])("rejects an empty %s", (_, issuerName, role) => {
    const receipt = issueAttestation({
      issuerName,
      role,
      request: requestId("c1"),
    });

    expect(receipt.result).toBeErr(Cl.uint(422));
    expect(getAttestation().result).toBeNone();
  });

  test("requires an exact 32-byte request ID", () => {
    expect(
      issueAttestation({ request: Cl.bufferFromHex("01".repeat(31)) }).result,
    ).toBeErr(Cl.uint(423));
    expect(getAttestation().result).toBeNone();
  });

  test("rejects reuse of a request ID within one attester namespace", () => {
    const request = requestId("d1");
    expect(issueAttestation({ request }).result).toBeOk(Cl.bool(true));

    expect(
      issueAttestation({ subject: secondContractSubject, request }).result,
    ).toBeErr(Cl.uint(409));
    expect(getAttestation(secondContractSubject).result).toBeNone();
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
        requestId("e1"),
      ],
      attester,
    );

    expect(receipt.result).toBeErr(Cl.uint(403));
    expect(getAttestation().result).toBeNone();
  });

  test("rejects revoke calls forwarded by another contract", () => {
    const issuedAt = simnet.burnBlockHeight;
    const request = requestId("f1");
    issueAttestation({ request });
    const receipt = simnet.callPublicFn(
      "origin-registry-caller",
      "revoke-v2",
      [contractSubject, requestId("f2")],
      attester,
    );

    expect(receipt.result).toBeErr(Cl.uint(403));
    expect(getAttestation().result).toBeSome(
      expectedRecord({ issuedAt, expiresAt: issuedAt + 100, request }),
    );
  });
});
