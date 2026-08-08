import { Cl, type ClarityValue, principalCV } from "@stacks/transactions";

import {
  deployerFromSubject,
  normalizeRegistrableDomain,
  parseDomainRole,
} from "./domain-policy.ts";
import {
  DOMAIN_CLAIM_MAX_LIFETIME_BURN_BLOCKS,
  DOMAIN_POLICY_VERSION,
  DOMAIN_VERIFICATION_METHOD,
  type DomainIssueAuthorization,
  type LifecycleAuthorization,
  type SignerAuthorization,
} from "./types.ts";

interface SignerPolicyConfig {
  attester: string;
  registryPrincipal: string;
  allowedKinds: ReadonlySet<SignerAuthorization["kind"]>;
  fixedFee: number;
  authorizationMaxAgeSeconds: number;
  denySubjects: ReadonlySet<string>;
  lifecycleSubject: string;
  lifecycleIssuerName: string;
  lifecycleRole: string;
  lifecycleMaxLifetimeBurnBlocks: number;
}

export interface ValidatedSignerCall {
  authorization: SignerAuthorization;
  contractAddress: string;
  contractName: string;
  functionName: "issue-attestation" | "revoke-attestation";
  functionArgs: ClarityValue[];
  fee: bigint;
}

const DOMAIN_KEYS = new Set<keyof DomainIssueAuthorization>([
  "kind",
  "network",
  "registryPrincipal",
  "attester",
  "subject",
  "issuerName",
  "role",
  "expiresAt",
  "requestId",
  "policyVersion",
  "verificationMethod",
  "verifiedBurnHeight",
  "authorizedAt",
  "authorizationExpiresAt",
  "fee",
]);

const LIFECYCLE_BASE_KEYS = new Set<keyof LifecycleAuthorization>([
  "kind",
  "network",
  "registryPrincipal",
  "attester",
  "action",
  "subject",
  "requestId",
  "operatorApprovalId",
  "authorizedAt",
  "authorizationExpiresAt",
  "fee",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: ReadonlySet<string>,
) {
  const actual = Object.keys(value);
  const unknown = actual.find((key) => !expected.has(key));
  const missing = [...expected].find((key) => !(key in value));
  if (unknown)
    throw new Error(`Unknown signer authorization field: ${unknown}`);
  if (missing)
    throw new Error(`Missing signer authorization field: ${missing}`);
}

function assertSafeInteger(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new Error(`Invalid signer authorization ${field}`);
  return value;
}

function assertString(value: unknown, field: string, maxLength: number) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    /[\u0000-\u001f\u007f-\u009f]/.test(value)
  )
    throw new Error(`Invalid signer authorization ${field}`);
  return value;
}

function assertHex(value: unknown, field: string, bytes: number) {
  const source = assertString(value, field, bytes * 2);
  if (!new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(source))
    throw new Error(`Invalid signer authorization ${field}`);
  return source;
}

function registryParts(value: string) {
  const separator = value.indexOf(".");
  if (separator <= 0 || separator !== value.lastIndexOf("."))
    throw new Error("Invalid signer registry principal");
  return {
    contractAddress: value.slice(0, separator),
    contractName: value.slice(separator + 1),
  };
}

function assertCommon(
  authorization: Record<string, unknown>,
  config: SignerPolicyConfig,
  nowSeconds: number,
) {
  if (authorization.network !== "testnet")
    throw new Error("Signer accepts Testnet only");
  if (authorization.registryPrincipal !== config.registryPrincipal)
    throw new Error("Signer registry is not allowed");
  if (authorization.attester !== config.attester)
    throw new Error("Signer attester does not match its isolated key");
  if (authorization.fee !== config.fixedFee)
    throw new Error("Signer fee does not match the fixed policy fee");
  const authorizedAt = assertSafeInteger(
    authorization.authorizedAt,
    "authorization time",
  );
  const expiresAt = assertSafeInteger(
    authorization.authorizationExpiresAt,
    "authorization expiration",
  );
  if (
    nowSeconds < authorizedAt ||
    nowSeconds >= expiresAt ||
    expiresAt - authorizedAt > config.authorizationMaxAgeSeconds
  )
    throw new Error("Signer authorization is stale");
  assertHex(authorization.requestId, "request ID", 32);
  assertString(authorization.subject, "subject", 128);
  try {
    principalCV(authorization.subject as string);
  } catch {
    throw new Error("Signer subject is invalid");
  }
}

function validateDomainAuthorization(
  value: Record<string, unknown>,
  config: SignerPolicyConfig,
  nowSeconds: number,
): ValidatedSignerCall {
  assertExactKeys(value, DOMAIN_KEYS);
  assertCommon(value, config, nowSeconds);
  const authorization = value as unknown as DomainIssueAuthorization;
  deployerFromSubject(authorization.subject);
  if (config.denySubjects.has(authorization.subject))
    throw new Error("Signer subject is denied by domain policy");
  if (authorization.policyVersion !== DOMAIN_POLICY_VERSION)
    throw new Error("Signer domain policy version is not allowed");
  if (authorization.verificationMethod !== DOMAIN_VERIFICATION_METHOD)
    throw new Error("Signer verification method is not allowed");
  if (
    normalizeRegistrableDomain(authorization.issuerName) !==
    authorization.issuerName
  )
    throw new Error("Signer issuer name is not its canonical domain");
  parseDomainRole(authorization.role);
  const verifiedBurnHeight = assertSafeInteger(
    authorization.verifiedBurnHeight,
    "verified burn height",
  );
  const expiresAt = assertSafeInteger(
    authorization.expiresAt,
    "claim expiration",
  );
  if (
    expiresAt <= verifiedBurnHeight ||
    expiresAt > verifiedBurnHeight + DOMAIN_CLAIM_MAX_LIFETIME_BURN_BLOCKS
  )
    throw new Error("Signer claim expiration exceeds domain policy");
  return {
    authorization,
    ...registryParts(authorization.registryPrincipal),
    functionName: "issue-attestation",
    functionArgs: [
      Cl.principal(authorization.subject),
      Cl.stringAscii(authorization.issuerName),
      Cl.stringAscii(authorization.role),
      Cl.uint(authorization.expiresAt),
      Cl.bufferFromHex(authorization.requestId),
    ],
    fee: BigInt(authorization.fee),
  };
}

function validateLifecycleAuthorization(
  value: Record<string, unknown>,
  config: SignerPolicyConfig,
  nowSeconds: number,
): ValidatedSignerCall {
  const action = value.action;
  if (action !== "issue" && action !== "revoke" && action !== "reissue")
    throw new Error("Signer lifecycle action is not allowed");
  const expected = new Set(LIFECYCLE_BASE_KEYS);
  if (action !== "revoke") {
    expected.add("issuerName");
    expected.add("role");
    expected.add("expiresAt");
    expected.add("verifiedBurnHeight");
  }
  assertExactKeys(value, expected);
  assertCommon(value, config, nowSeconds);
  const authorization = value as unknown as LifecycleAuthorization;
  if (authorization.subject !== config.lifecycleSubject)
    throw new Error("Signer lifecycle subject is not allowed");
  if (!/^[a-z0-9][a-z0-9-]{5,63}$/.test(authorization.operatorApprovalId))
    throw new Error("Signer operator approval ID is invalid");
  const common = {
    authorization,
    ...registryParts(authorization.registryPrincipal),
    fee: BigInt(authorization.fee),
  };
  if (action === "revoke")
    return {
      ...common,
      functionName: "revoke-attestation",
      functionArgs: [
        Cl.principal(authorization.subject),
        Cl.bufferFromHex(authorization.requestId),
      ],
    };
  if (
    authorization.issuerName !== config.lifecycleIssuerName ||
    authorization.role !== config.lifecycleRole
  )
    throw new Error("Signer lifecycle display fields are not allowed");
  const expiresAt = assertSafeInteger(
    authorization.expiresAt,
    "lifecycle expiration",
  );
  const verifiedBurnHeight = assertSafeInteger(
    authorization.verifiedBurnHeight,
    "lifecycle verified burn height",
  );
  if (
    expiresAt <= verifiedBurnHeight ||
    expiresAt > verifiedBurnHeight + config.lifecycleMaxLifetimeBurnBlocks
  )
    throw new Error("Signer lifecycle expiration exceeds policy");
  return {
    ...common,
    functionName: "issue-attestation",
    functionArgs: [
      Cl.principal(authorization.subject),
      Cl.stringAscii(authorization.issuerName),
      Cl.stringAscii(authorization.role),
      Cl.uint(expiresAt),
      Cl.bufferFromHex(authorization.requestId),
    ],
  };
}

export function validateSignerAuthorization(
  value: unknown,
  config: SignerPolicyConfig,
  nowSeconds: number,
) {
  if (!isObject(value))
    throw new Error("Signer authorization must be an object");
  if (
    typeof value.kind !== "string" ||
    !config.allowedKinds.has(value.kind as SignerAuthorization["kind"])
  )
    throw new Error("Signer authorization kind is not enabled");
  if (value.kind === "origin-domain-issue-v1")
    return validateDomainAuthorization(value, config, nowSeconds);
  if (value.kind === "origin-operator-lifecycle-v1")
    return validateLifecycleAuthorization(value, config, nowSeconds);
  throw new Error("Signer authorization kind is not allowed");
}

export type { SignerPolicyConfig };
