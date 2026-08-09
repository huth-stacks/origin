import { describe, expect, test, vi } from "vitest";

import {
  domainAttesterOperatorHelp,
  parseDomainAttesterOperatorCommand,
  runDomainAttesterOperatorCommand,
} from "../scripts/domain-attester/operator.ts";

const requestId = "11".repeat(32);

describe(parseDomainAttesterOperatorCommand.name, () => {
  test("parses the four local-only operator actions", () => {
    expect(
      parseDomainAttesterOperatorCommand([
        "challenge",
        "--domain",
        "example.com",
        "--subject",
        "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.example",
        "--role",
        "Application contract",
        "--source-address",
        "8.8.8.8",
      ]),
    ).toMatchObject({ kind: "challenge", domain: "example.com" });
    for (const kind of ["verify", "sign", "status"] as const)
      expect(
        parseDomainAttesterOperatorCommand([kind, "--request-id", requestId]),
      ).toEqual({ kind, requestId });
    expect(parseDomainAttesterOperatorCommand(["--help"])).toEqual({
      kind: "help",
    });
    expect(domainAttesterOperatorHelp()).toContain("never broadcasts");
  });

  test.each([
    ["broadcast", "--request-id", requestId],
    ["sign", "--request-id", requestId, "--broadcast", "true"],
    ["status", "--request-id", "short"],
    ["challenge", "--domain", "example.com"],
  ])("rejects unsupported or incomplete action %#", (...args) => {
    expect(() => parseDomainAttesterOperatorCommand(args)).toThrow();
  });
});

describe(runDomainAttesterOperatorCommand.name, () => {
  test("returns reviewable results without exposing signed bytes", async () => {
    const challenge = {
      requestId,
      domain: "example.com",
      subject: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.example",
    };
    const authorization = { requestId, kind: "origin-domain-issue-v1" };
    const service = {
      createChallenge: vi.fn().mockResolvedValue(challenge),
      verifyAndAuthorize: vi.fn().mockResolvedValue(authorization),
      sign: vi.fn().mockResolvedValue({
        requestId,
        signerNonce: 7,
        serializedTransaction: "deadbeef",
        txId: "aa".repeat(32),
      }),
    };
    const store = {
      expireStale: vi.fn(),
      get: vi.fn().mockReturnValue({
        requestId,
        state: "signed",
        domain: "example.com",
        subject: challenge.subject,
        attester: "ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0",
        challenge: { expiresAt: 1_300, claimExpiresAt: 5_000 },
        signerNonce: 7,
        txId: "aa".repeat(32),
        createdAt: 1_000,
        updatedAt: 1_002,
      }),
    };

    await expect(
      runDomainAttesterOperatorCommand(
        {
          kind: "challenge",
          domain: "example.com",
          subject: challenge.subject,
          role: "Application contract",
          sourceAddress: "8.8.8.8",
        },
        service as never,
        store as never,
      ),
    ).resolves.toEqual({ state: "challenge-issued", challenge });
    await expect(
      runDomainAttesterOperatorCommand(
        { kind: "verify", requestId },
        service as never,
        store as never,
      ),
    ).resolves.toEqual({ state: "authorized", authorization });
    const signed = await runDomainAttesterOperatorCommand(
      { kind: "sign", requestId },
      service as never,
      store as never,
    );
    expect(signed).toEqual({
      state: "signed",
      requestId,
      signerNonce: 7,
      txId: "aa".repeat(32),
    });
    expect(JSON.stringify(signed)).not.toContain("deadbeef");
    await expect(
      runDomainAttesterOperatorCommand(
        { kind: "status", requestId },
        service as never,
        store as never,
      ),
    ).resolves.toMatchObject({ state: "signed", requestId });
    expect(store.expireStale).toHaveBeenCalledOnce();
  });
});
