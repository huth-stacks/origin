import {
  makeRandomPrivKey,
  privateKeyToAddress,
  signStructuredData,
} from "@stacks/transactions";
import { describe, expect, test } from "vitest";

import {
  assertProofMatchesChallenge,
  normalizeRegistrableDomain,
  parseDomainProofDocument,
} from "../scripts/domain-attester/domain-policy.ts";
import {
  domainProofSip018Values,
  signDomainProof,
  verifyDomainProofSignature,
} from "../scripts/domain-attester/proof-signature.ts";
import { parseStrictJsonObject } from "../scripts/domain-attester/strict-json.ts";
import {
  DOMAIN_CHALLENGE_VERSION,
  DOMAIN_POLICY_VERSION,
  DOMAIN_VERIFICATION_METHOD,
  type DomainChallenge,
} from "../scripts/domain-attester/types.ts";

const attester = "ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0";

function challenge(subject: string): DomainChallenge {
  return {
    version: DOMAIN_CHALLENGE_VERSION,
    domain: "copperline-origin.com",
    subject,
    attester,
    nonce: "11".repeat(32),
    requestId: "22".repeat(32),
    policyVersion: DOMAIN_POLICY_VERSION,
    issuedAt: 1_700_000_000,
    expiresAt: 1_700_000_300,
    claimExpiresAt: 8_000,
    issuerName: "copperline-origin.com",
    role: "Application contract",
    verificationMethod: DOMAIN_VERIFICATION_METHOD,
  };
}

describe(normalizeRegistrableDomain.name, () => {
  test.each(["example.com", "example.co.uk"])(
    "accepts exact ICANN registrable domain %s",
    (domain) => expect(normalizeRegistrableDomain(domain)).toBe(domain),
  );

  test.each(["origin-demo.vercel.app", "origin-demo.github.io"])(
    "accepts exact delegated private-suffix tenant %s",
    (domain) => expect(normalizeRegistrableDomain(domain)).toBe(domain),
  );

  test.each([
    "www.example.com",
    "example.test",
    "127.0.0.1",
    "EXAMPLE.COM",
    " example.com",
    "example.com.",
    "https://example.com",
    "xn--bcher-kva.example",
    "vercel.app",
    "github.io",
    "nested.origin-demo.vercel.app",
    "leather.io",
  ])("rejects noncanonical or ineligible domain %s", (domain) => {
    expect(() => normalizeRegistrableDomain(domain)).toThrow();
  });
});

describe(parseStrictJsonObject.name, () => {
  test("rejects duplicate keys at every object depth", () => {
    expect(() => parseStrictJsonObject('{"a":1,"a":2}')).toThrow(
      "Duplicate JSON key: a",
    );
    expect(() =>
      parseStrictJsonObject('{"outer":{"a":1,"\\u0061":2}}'),
    ).toThrow("Duplicate JSON key: a");
  });

  test.each(["[]", "null", '{"a":01}', '{"a":true} trailing'])(
    "rejects invalid top-level or malformed JSON %s",
    (source) => expect(() => parseStrictJsonObject(source)).toThrow(),
  );
});

describe("domain proof protocol", () => {
  test("builds an exact proof for the subject deployer", () => {
    const privateKey = makeRandomPrivKey();
    const deployer = privateKeyToAddress(privateKey, "testnet");
    const expected = challenge(`${deployer}.copperline-app`);
    expect(signDomainProof(expected, privateKey)).toMatchObject(expected);
  });

  test("verifies the SIP-018 signature from the exact contract deployer", () => {
    const privateKey = makeRandomPrivKey();
    const deployer = privateKeyToAddress(privateKey, "testnet");
    const expected = challenge(`${deployer}.copperline-app`);
    const signature = signStructuredData({
      ...domainProofSip018Values(expected),
      privateKey,
    });
    const proof = parseDomainProofDocument({
      ...expected,
      deployerSignature: signature,
    });

    assertProofMatchesChallenge(proof, expected, expected.issuedAt + 1);
    expect(verifyDomainProofSignature(expected, signature)).toBe(deployer);
  });

  test("rejects wrong signer, stale, altered, and unknown-field proofs", () => {
    const deployerKey = makeRandomPrivKey();
    const wrongKey = makeRandomPrivKey();
    const deployer = privateKeyToAddress(deployerKey, "testnet");
    const expected = challenge(`${deployer}.copperline-app`);
    const wrongSignature = signStructuredData({
      ...domainProofSip018Values(expected),
      privateKey: wrongKey,
    });
    expect(() => verifyDomainProofSignature(expected, wrongSignature)).toThrow(
      "not the subject deployer",
    );
    expect(() =>
      assertProofMatchesChallenge(
        { ...expected, deployerSignature: wrongSignature },
        expected,
        expected.expiresAt,
      ),
    ).toThrow("stale");
    expect(() =>
      assertProofMatchesChallenge(
        {
          ...expected,
          role: "Protocol contract",
          deployerSignature: wrongSignature,
        },
        expected,
        expected.issuedAt + 1,
      ),
    ).toThrow("does not match");
    expect(() =>
      parseDomainProofDocument({
        ...expected,
        deployerSignature: wrongSignature,
        callbackUrl: "https://attacker.example",
      }),
    ).toThrow("Unknown domain proof field");
  });

  test.each([
    { issuerName: "Definitely Leather" },
    { role: "Official contract" },
    { nonce: "00" },
    { requestId: "00" },
    { attester: `${attester}.contract` },
    { policyVersion: "other-policy" },
    { verificationMethod: "dns" },
    { version: 2 },
    { domain: "other.example", issuerName: "other.example" },
    { subject: "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY" },
    { expiresAt: -1 },
    { claimExpiresAt: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects malformed or policy-violating fields %#", (override) => {
    expect(() =>
      parseDomainProofDocument({
        ...challenge(
          "ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.copperline-app",
        ),
        deployerSignature: "33".repeat(65),
        ...override,
      }),
    ).toThrow();
  });
});
