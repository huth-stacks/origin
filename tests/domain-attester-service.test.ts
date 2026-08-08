import {
  makeRandomPrivKey,
  privateKeyToAddress,
  signStructuredData,
} from "@stacks/transactions";
import { describe, expect, test, vi } from "vitest";

import { domainProofSip018Values } from "../scripts/domain-attester/proof-signature.ts";
import { DomainAttesterService } from "../scripts/domain-attester/service.ts";
import { DomainAttesterStore } from "../scripts/domain-attester/store.ts";
import type { DomainChallenge } from "../scripts/domain-attester/types.ts";

const attester = "ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0";
const registry = "ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2";

function setup(
  currentClaim: {
    issuedAt: number;
    expiresAt: number;
    revoked: boolean;
  } | null = null,
) {
  const deployerKey = makeRandomPrivKey();
  const deployer = privateKeyToAddress(deployerKey, "testnet");
  const subject = `${deployer}.copperline-app`;
  const store = new DomainAttesterStore();
  let challenge: DomainChallenge | undefined;
  let randomValue = 1;
  const signer = {
    sign: vi.fn(async (authorization) => ({
      requestId: authorization.requestId,
      signerNonce: 9,
      serializedTransaction: "deadbeef",
      txId: "aa".repeat(32),
    })),
  };
  const logger = vi.fn();
  const service = new DomainAttesterService({
    store,
    signer,
    attester,
    registryPrincipal: registry,
    denySubjects: new Set([
      "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
    ]),
    readBurnHeight: async () => 3_100,
    readCurrentClaim: async () => currentClaim,
    nowSeconds: () => 1_700_000_000,
    randomHex: () => (randomValue++).toString(16).padStart(64, "0"),
    logger,
    fetchProof: async () => {
      if (!challenge) throw new Error("Missing test challenge");
      const deployerSignature = signStructuredData({
        ...domainProofSip018Values(challenge),
        privateKey: deployerKey,
      });
      return {
        domain: challenge.domain,
        resolvedAddresses: [{ address: "93.184.216.34", family: 4 as const }],
        pinnedAddress: { address: "93.184.216.34", family: 4 as const },
        responseBytes: 512,
        document: { ...challenge, deployerSignature },
        request: {} as never,
      };
    },
  });
  return {
    service,
    store,
    signer,
    logger,
    subject,
    setChallenge(value: DomainChallenge) {
      challenge = value;
    },
  };
}

describe(DomainAttesterService.name, () => {
  test("requires the exact reviewed v2 registry contract name", () => {
    const context = setup();
    expect(
      () =>
        new DomainAttesterService({
          store: context.store,
          signer: context.signer,
          attester,
          registryPrincipal: `${registry}-evil`,
          denySubjects: new Set(),
          readBurnHeight: async () => 3_100,
          readCurrentClaim: async () => null,
        }),
    ).toThrow("reviewed v2 registry");
    context.store.close();
  });

  test("runs challenge through durable authorization, signing, and confirmation", async () => {
    const context = setup();
    const challenge = await context.service.createChallenge({
      domain: "example.com",
      subject: context.subject,
      role: "Application contract",
      sourceAddress: "8.8.8.8",
    });
    context.setChallenge(challenge);
    const authorization = await context.service.verifyAndAuthorize(
      challenge.requestId,
    );
    expect(authorization).toMatchObject({
      issuerName: "example.com",
      subject: context.subject,
      attester,
      expiresAt: 7_420,
      verifiedBurnHeight: 3_100,
    });
    const signed = await context.service.sign(challenge.requestId);
    expect(signed.txId).toBe("aa".repeat(32));
    expect(await context.service.sign(challenge.requestId)).toEqual(signed);
    expect(context.signer.sign).toHaveBeenCalledTimes(1);
    expect(
      context.service.markBroadcastUnknown(challenge.requestId).state,
    ).toBe("broadcast-unknown");
    expect(context.service.markPending(challenge.requestId).state).toBe(
      "pending",
    );
    expect(context.service.markConfirmed(challenge.requestId).state).toBe(
      "confirmed",
    );
    expect(
      context.store.history(challenge.requestId).map(({ state }) => state),
    ).toEqual([
      "challenge-issued",
      "verified",
      "authorized",
      "signed",
      "broadcast-unknown",
      "pending",
      "confirmed",
    ]);
    expect(context.logger.mock.calls.flat().join(" ")).not.toContain(
      "deployerSignature",
    );
    context.store.close();
  });

  test("allows multiple nonces but stops a second verified authorization", async () => {
    const context = setup();
    const first = await context.service.createChallenge({
      domain: "example.com",
      subject: context.subject,
      role: "Application contract",
      sourceAddress: "8.8.8.8",
    });
    const second = await context.service.createChallenge({
      domain: "example.com",
      subject: context.subject,
      role: "Application contract",
      sourceAddress: "8.8.4.4",
    });
    expect(second.nonce).not.toBe(first.nonce);
    context.setChallenge(first);
    await context.service.verifyAndAuthorize(first.requestId);
    context.setChallenge(second);
    await expect(
      context.service.verifyAndAuthorize(second.requestId),
    ).rejects.toThrow("already in flight");
    context.store.close();
  });

  test("enforces the 80-percent renewal threshold even after revocation", async () => {
    const context = setup({ issuedAt: 3_000, expiresAt: 4_000, revoked: true });
    const challenge = await context.service.createChallenge({
      domain: "example.com",
      subject: context.subject,
      role: "Application contract",
      sourceAddress: "8.8.8.8",
    });
    context.setChallenge(challenge);
    await expect(
      context.service.verifyAndAuthorize(challenge.requestId),
    ).rejects.toThrow("not yet eligible for renewal");
    expect(context.logger).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: challenge.requestId,
        disposition: "verification-rejected",
        detail: "Domain claim is not yet eligible for renewal",
      }),
    );
    expect(context.store.get(challenge.requestId).state).toBe(
      "challenge-issued",
    );
    context.store.close();
  });

  test("denies canonical demo subjects and private source addresses", async () => {
    const context = setup();
    await expect(
      context.service.createChallenge({
        domain: "example.com",
        subject: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
        role: "Application contract",
        sourceAddress: "8.8.8.8",
      }),
    ).rejects.toThrow("denied");
    await expect(
      context.service.createChallenge({
        domain: "example.com",
        subject: context.subject,
        role: "Application contract",
        sourceAddress: "127.0.0.1",
      }),
    ).rejects.toThrow("not public unicast");
    context.store.close();
  });
});
