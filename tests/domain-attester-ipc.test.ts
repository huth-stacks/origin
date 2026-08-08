import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import {
  closeSignerIpcServer,
  parseSignerIpcRequest,
  parseSignerIpcResponse,
  signOverIpc,
  startSignerIpcServer,
} from "../scripts/domain-attester/signer-ipc.ts";
import {
  DOMAIN_POLICY_VERSION,
  DOMAIN_VERIFICATION_METHOD,
  type DomainIssueAuthorization,
} from "../scripts/domain-attester/types.ts";

const token = "ab".repeat(32);
const authorization: DomainIssueAuthorization = {
  kind: "origin-domain-issue-v1",
  network: "testnet",
  registryPrincipal:
    "ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2",
  attester: "ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0",
  subject: "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.copperline-app",
  issuerName: "example.com",
  role: "Application contract",
  expiresAt: 5_320,
  requestId: "11".repeat(32),
  policyVersion: DOMAIN_POLICY_VERSION,
  verificationMethod: DOMAIN_VERIFICATION_METHOD,
  verifiedBurnHeight: 1_000,
  authorizedAt: 1_000,
  authorizationExpiresAt: 1_200,
  fee: 10_000,
};

describe(parseSignerIpcRequest.name, () => {
  test("accepts one exact authenticated operation", () => {
    expect(
      parseSignerIpcRequest(
        JSON.stringify({
          version: 1,
          operation: "sign",
          token,
          authorization,
        }),
        token,
      ),
    ).toEqual(authorization);
  });

  test.each([
    JSON.stringify({
      version: 1,
      operation: "sign",
      token: "00",
      authorization,
    }),
    JSON.stringify({
      version: 1,
      operation: "broadcast",
      token,
      authorization,
    }),
    JSON.stringify({
      version: 1,
      operation: "sign",
      token,
      authorization,
      functionName: "arbitrary",
    }),
    `{"version":1,"operation":"sign","token":"${token}","token":"${token}","authorization":{}}`,
  ])("rejects unauthenticated or expanded IPC request", (source) => {
    expect(() => parseSignerIpcRequest(source, token)).toThrow();
  });
});

describe(parseSignerIpcResponse.name, () => {
  const signed = {
    requestId: authorization.requestId,
    signerNonce: 7,
    serializedTransaction: "deadbeef",
    txId: "aa".repeat(32),
  };

  test("accepts one exact signed-transaction response", () => {
    expect(
      parseSignerIpcResponse(JSON.stringify({ ok: true, signed })),
    ).toEqual(signed);
  });

  test.each([
    JSON.stringify({ ok: false, error: "signer-rejected" }),
    JSON.stringify({ ok: true, signed: { ...signed, signerNonce: -1 } }),
    JSON.stringify({ ok: true, signed: { ...signed, txId: "short" } }),
    JSON.stringify({ ok: true, signed: { ...signed, extra: "field" } }),
    `{"ok":true,"ok":true,"signed":${JSON.stringify(signed)}}`,
  ])("rejects malformed or expanded signer response", (source) => {
    expect(() => parseSignerIpcResponse(source)).toThrow();
  });
});

describe("signer Unix socket", () => {
  test("uses a mode-0600 authenticated socket and returns only signed bytes", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "origin-signer-ipc-"));
    const socketPath = resolve(directory, "signer.sock");
    const signer = {
      sign: vi.fn(async () => ({
        requestId: authorization.requestId,
        signerNonce: 7,
        serializedTransaction: "deadbeef",
        txId: "aa".repeat(32),
      })),
    };
    const logger = vi.fn();
    const server = await startSignerIpcServer({
      socketPath,
      token,
      signer,
      logger,
    });
    expect(statSync(socketPath).mode & 0o777).toBe(0o600);

    await expect(
      signOverIpc({ socketPath, token, authorization }),
    ).resolves.toEqual({
      requestId: authorization.requestId,
      signerNonce: 7,
      serializedTransaction: "deadbeef",
      txId: "aa".repeat(32),
    });
    expect(signer.sign).toHaveBeenCalledExactlyOnceWith(authorization);
    expect(JSON.stringify(logger.mock.calls)).not.toContain(token);
    expect(JSON.stringify(logger.mock.calls)).not.toContain("issuerName");

    await expect(
      signOverIpc({ socketPath, token: "cd".repeat(32), authorization }),
    ).rejects.toThrow("Signer rejected authorization");
    expect(signer.sign).toHaveBeenCalledTimes(1);
    await closeSignerIpcServer(server);
  });
});
