import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  ClarityType,
  deserializeTransaction,
  makeRandomPrivKey,
  privateKeyToAddress,
} from "@stacks/transactions";
import { describe, expect, test, vi } from "vitest";

import { IsolatedOriginSigner } from "../scripts/domain-attester/isolated-signer.ts";
import {
  validateSignerAuthorization,
  type SignerPolicyConfig,
} from "../scripts/domain-attester/signer-policy.ts";
import {
  DOMAIN_POLICY_VERSION,
  DOMAIN_VERIFICATION_METHOD,
  type DomainIssueAuthorization,
  type LifecycleAuthorization,
} from "../scripts/domain-attester/types.ts";

const registry = "ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2";
const subject = "ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.copperline-app";
const lifecycleSubject =
  "ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM.origin-lifecycle-action";

function config(attester: string): SignerPolicyConfig {
  return {
    attester,
    registryPrincipal: registry,
    allowedKinds: new Set([
      "origin-domain-issue-v1",
      "origin-operator-lifecycle-v1",
    ]),
    fixedFee: 10_000,
    authorizationMaxAgeSeconds: 300,
    denySubjects: new Set([
      "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
    ]),
    lifecycleSubject,
    lifecycleIssuerName: "Origin lifecycle fixture",
    lifecycleRole: "Demo contract",
    lifecycleMaxLifetimeBurnBlocks: 100_000,
  };
}

function domainAuthorization(
  attester: string,
  requestId = "11".repeat(32),
): DomainIssueAuthorization {
  return {
    kind: "origin-domain-issue-v1",
    network: "testnet",
    registryPrincipal: registry,
    attester,
    subject,
    issuerName: "example.com",
    role: "Application contract",
    expiresAt: 5_320,
    requestId,
    policyVersion: DOMAIN_POLICY_VERSION,
    verificationMethod: DOMAIN_VERIFICATION_METHOD,
    verifiedBurnHeight: 1_000,
    authorizedAt: 1_000,
    authorizationExpiresAt: 1_200,
    fee: 10_000,
  };
}

function lifecycleAuthorization(
  attester: string,
  action: LifecycleAuthorization["action"],
): LifecycleAuthorization {
  return {
    kind: "origin-operator-lifecycle-v1",
    network: "testnet",
    registryPrincipal: registry,
    attester,
    action,
    subject: lifecycleSubject,
    ...(action === "revoke"
      ? {}
      : {
          issuerName: "Origin lifecycle fixture",
          role: "Demo contract",
          expiresAt: 11_000,
          verifiedBurnHeight: 1_000,
        }),
    requestId: (action === "issue"
      ? "21"
      : action === "revoke"
        ? "22"
        : "23"
    ).repeat(32),
    operatorApprovalId: `day4-${action}-approved`,
    authorizedAt: 1_000,
    authorizationExpiresAt: 1_200,
    fee: 10_000,
  };
}

describe(validateSignerAuthorization.name, () => {
  const attester = "ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0";
  const policy = config(attester);

  test("derives the only allowed domain contract call", () => {
    const call = validateSignerAuthorization(
      domainAuthorization(attester),
      policy,
      1_001,
    );
    expect(call).toMatchObject({
      contractAddress: registry.split(".")[0],
      contractName: "origin-registry-v2",
      functionName: "issue-attestation",
      fee: 10_000n,
    });
    expect(call.functionArgs).toHaveLength(5);
    expect(call.functionArgs[0]?.type).toBe(ClarityType.PrincipalContract);
  });

  test.each([
    { field: "network", value: "mainnet" },
    { field: "registryPrincipal", value: `${attester}.other-registry` },
    { field: "attester", value: "ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC" },
    { field: "fee", value: 10_001 },
    { field: "policyVersion", value: "other" },
    { field: "verificationMethod", value: "dns" },
    { field: "issuerName", value: "leather.io" },
    { field: "role", value: "Official contract" },
    { field: "expiresAt", value: 5_321 },
    {
      field: "subject",
      value: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action",
    },
  ])("rejects altered domain authorization $field", ({ field, value }) => {
    expect(() =>
      validateSignerAuthorization(
        { ...domainAuthorization(attester), [field]: value },
        policy,
        1_001,
      ),
    ).toThrow();
  });

  test("rejects arbitrary function and stale authorization fields", () => {
    expect(() =>
      validateSignerAuthorization(
        {
          ...domainAuthorization(attester),
          functionName: "revoke-attestation",
        },
        policy,
        1_001,
      ),
    ).toThrow("Unknown signer authorization field");
    expect(() =>
      validateSignerAuthorization(domainAuthorization(attester), policy, 1_200),
    ).toThrow("stale");
  });

  test("derives narrow issue, revoke, and immediate reissue lifecycle calls", () => {
    expect(
      validateSignerAuthorization(
        lifecycleAuthorization(attester, "issue"),
        policy,
        1_001,
      ).functionName,
    ).toBe("issue-attestation");
    expect(
      validateSignerAuthorization(
        lifecycleAuthorization(attester, "revoke"),
        policy,
        1_001,
      ).functionName,
    ).toBe("revoke-attestation");
    expect(
      validateSignerAuthorization(
        lifecycleAuthorization(attester, "reissue"),
        policy,
        1_001,
      ).functionName,
    ).toBe("issue-attestation");
  });

  test("rejects lifecycle display drift, wrong subject, and excess expiry", () => {
    for (const authorization of [
      { ...lifecycleAuthorization(attester, "reissue"), issuerName: "Acme" },
      { ...lifecycleAuthorization(attester, "reissue"), subject },
      { ...lifecycleAuthorization(attester, "reissue"), expiresAt: 101_001 },
      { ...lifecycleAuthorization(attester, "revoke"), role: "Demo contract" },
    ])
      expect(() =>
        validateSignerAuthorization(authorization, policy, 1_001),
      ).toThrow();
  });
});

describe(IsolatedOriginSigner.name, () => {
  test("journals deterministic bytes and allocates exclusive nonces", async () => {
    const privateKey = makeRandomPrivKey();
    const attester = privateKeyToAddress(privateKey, "testnet");
    const readNetworkNonce = vi.fn().mockResolvedValue(7n);
    const signer = new IsolatedOriginSigner({
      privateKey,
      policy: config(attester),
      readNetworkNonce,
      nowSeconds: () => 1_001,
      dailyLimit: 3,
    });
    const firstAuthorization = domainAuthorization(attester);
    const first = await signer.sign(firstAuthorization);
    expect(await signer.sign(firstAuthorization)).toEqual(first);
    expect(readNetworkNonce).toHaveBeenCalledTimes(1);
    const second = await signer.sign(
      domainAuthorization(attester, "12".repeat(32)),
    );
    expect(first.signerNonce).toBe(7);
    expect(second.signerNonce).toBe(8);
    expect(second.txId).not.toBe(first.txId);
    const transaction = deserializeTransaction(first.serializedTransaction);
    expect(transaction.txid()).toBe(first.txId);

    await expect(
      signer.sign({ ...firstAuthorization, verifiedBurnHeight: 1_001 }),
    ).rejects.toThrow("replayed with altered authorization");
    signer.close();
  });

  test("coalesces concurrent retries of the same authorization", async () => {
    const privateKey = makeRandomPrivKey();
    const attester = privateKeyToAddress(privateKey, "testnet");
    const readNetworkNonce = vi.fn().mockResolvedValue(7n);
    const signer = new IsolatedOriginSigner({
      privateKey,
      policy: config(attester),
      readNetworkNonce,
      nowSeconds: () => 1_001,
    });
    const value = domainAuthorization(attester);
    const [first, retry] = await Promise.all([
      signer.sign(value),
      signer.sign(value),
    ]);
    expect(retry).toEqual(first);
    signer.close();
  });

  test("enforces the kill switch, key binding, and daily ceiling", async () => {
    const privateKey = makeRandomPrivKey();
    const attester = privateKeyToAddress(privateKey, "testnet");
    expect(
      () =>
        new IsolatedOriginSigner({
          privateKey,
          policy: config("ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0"),
          readNetworkNonce: async () => 0n,
        }),
    ).toThrow("key does not match");

    let stopped = true;
    const signer = new IsolatedOriginSigner({
      privateKey,
      policy: config(attester),
      readNetworkNonce: async () => 0n,
      nowSeconds: () => 1_001,
      dailyLimit: 1,
      killSwitch: () => stopped,
    });
    await expect(signer.sign(domainAuthorization(attester))).rejects.toThrow(
      "kill switch",
    );
    stopped = false;
    await signer.sign(domainAuthorization(attester));
    await expect(
      signer.sign(domainAuthorization(attester, "12".repeat(32))),
    ).rejects.toThrow("daily issuance ceiling");
    signer.close();
  });

  test("keeps the signer journal and live SQLite sidecars mode-0600", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "origin-signer-journal-"));
    const journalPath = resolve(directory, "signer.local.sqlite");
    const privateKey = makeRandomPrivKey();
    const attester = privateKeyToAddress(privateKey, "testnet");
    const signer = new IsolatedOriginSigner({
      privateKey,
      journalPath,
      policy: config(attester),
      readNetworkNonce: async () => 0n,
      nowSeconds: () => 1_001,
    });
    await signer.sign(domainAuthorization(attester));
    for (const name of readdirSync(directory))
      expect(statSync(resolve(directory, name)).mode & 0o777).toBe(0o600);
    signer.close();
  });
});
