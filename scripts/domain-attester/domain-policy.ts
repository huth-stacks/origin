import { domainToASCII } from "node:url";

import { principalCV } from "@stacks/transactions";
import { parse } from "tldts";

import {
  DOMAIN_CHALLENGE_VERSION,
  DOMAIN_POLICY_VERSION,
  DOMAIN_ROLES,
  DOMAIN_VERIFICATION_METHOD,
  type DomainChallenge,
  type DomainProofDocument,
  type DomainRole,
} from "./types.ts";

const DOMAIN_FIELDS = new Set([
  "version",
  "domain",
  "subject",
  "attester",
  "nonce",
  "requestId",
  "policyVersion",
  "issuedAt",
  "expiresAt",
  "claimExpiresAt",
  "issuerName",
  "role",
  "verificationMethod",
  "deployerSignature",
]);

export const DEFAULT_PROTECTED_DOMAINS = new Set([
  "hiro.so",
  "leather.io",
  "stacks.co",
  "stacks.org",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  value: Record<string, unknown>,
  field: string,
  maxLength: number,
) {
  const fieldValue = value[field];
  if (
    typeof fieldValue !== "string" ||
    fieldValue.length === 0 ||
    fieldValue.length > maxLength ||
    /[\u0000-\u001f\u007f-\u009f]/.test(fieldValue)
  )
    throw new Error(`Invalid domain proof ${field}`);
  return fieldValue;
}

function requireSafeInteger(value: Record<string, unknown>, field: string) {
  const fieldValue = value[field];
  if (
    typeof fieldValue !== "number" ||
    !Number.isSafeInteger(fieldValue) ||
    fieldValue < 0
  )
    throw new Error(`Invalid domain proof ${field}`);
  return fieldValue;
}

function requireHex(
  value: Record<string, unknown>,
  field: string,
  bytes: number,
) {
  const fieldValue = requireString(value, field, bytes * 2);
  if (!new RegExp(`^[0-9a-f]{${bytes * 2}}$`).test(fieldValue))
    throw new Error(`Invalid domain proof ${field}`);
  return fieldValue;
}

export function normalizeRegistrableDomain(
  input: string,
  protectedDomains: ReadonlySet<string> = DEFAULT_PROTECTED_DOMAINS,
) {
  if (
    input.length === 0 ||
    input.length > 253 ||
    input !== input.trim() ||
    !/^[a-z0-9.-]+$/.test(input) ||
    input.includes("..") ||
    input.startsWith(".") ||
    input.endsWith(".") ||
    input.includes("xn--")
  )
    throw new Error("Domain must be canonical lowercase ASCII");
  const ascii = domainToASCII(input);
  if (ascii !== input) throw new Error("Domain is not canonical ASCII");
  const result = parse(ascii, { allowPrivateDomains: true });
  if (
    result.isIp ||
    result.isPrivate ||
    result.isSpecialUse ||
    !result.isIcann ||
    result.domain !== ascii ||
    result.subdomain !== "" ||
    result.publicSuffix === null
  )
    throw new Error("Domain must be an ICANN registrable eTLD+1");
  if (protectedDomains.has(ascii))
    throw new Error("Domain is protected by attester policy");
  return ascii;
}

export function deployerFromSubject(subject: string) {
  const separator = subject.indexOf(".");
  if (separator <= 0 || separator !== subject.lastIndexOf("."))
    throw new Error("Domain proof subject must be a contract principal");
  try {
    principalCV(subject);
  } catch {
    throw new Error("Domain proof subject is invalid");
  }
  return subject.slice(0, separator);
}

export function parseDomainRole(value: string): DomainRole {
  const role = DOMAIN_ROLES.find((candidate) => candidate === value);
  if (!role) throw new Error("Domain proof role is not allowed");
  return role;
}

export function parseDomainProofDocument(value: unknown): DomainProofDocument {
  if (!isObject(value)) throw new Error("Domain proof must be one JSON object");
  for (const key of Object.keys(value))
    if (!DOMAIN_FIELDS.has(key))
      throw new Error(`Unknown domain proof field: ${key}`);
  for (const field of DOMAIN_FIELDS)
    if (!(field in value))
      throw new Error(`Missing domain proof field: ${field}`);
  if (value.version !== DOMAIN_CHALLENGE_VERSION)
    throw new Error("Unsupported domain proof version");
  if (value.policyVersion !== DOMAIN_POLICY_VERSION)
    throw new Error("Unsupported domain proof policy");
  if (value.verificationMethod !== DOMAIN_VERIFICATION_METHOD)
    throw new Error("Unsupported domain proof verification method");
  const domain = normalizeRegistrableDomain(
    requireString(value, "domain", 253),
  );
  const subject = requireString(value, "subject", 128);
  deployerFromSubject(subject);
  const attester = requireString(value, "attester", 64);
  if (attester.includes("."))
    throw new Error("Domain proof attester must be a standard principal");
  try {
    principalCV(attester);
  } catch {
    throw new Error("Domain proof attester is invalid");
  }
  const issuerName = requireString(value, "issuerName", 64);
  if (issuerName !== domain)
    throw new Error("Domain proof issuer name must equal its domain");
  return {
    version: DOMAIN_CHALLENGE_VERSION,
    domain,
    subject,
    attester,
    nonce: requireHex(value, "nonce", 32),
    requestId: requireHex(value, "requestId", 32),
    policyVersion: DOMAIN_POLICY_VERSION,
    issuedAt: requireSafeInteger(value, "issuedAt"),
    expiresAt: requireSafeInteger(value, "expiresAt"),
    claimExpiresAt: requireSafeInteger(value, "claimExpiresAt"),
    issuerName,
    role: parseDomainRole(requireString(value, "role", 32)),
    verificationMethod: DOMAIN_VERIFICATION_METHOD,
    deployerSignature: requireHex(value, "deployerSignature", 65),
  };
}

export function challengeFromProof({
  deployerSignature: _signature,
  ...challenge
}: DomainProofDocument): DomainChallenge {
  return challenge;
}

export function assertProofMatchesChallenge(
  proof: DomainProofDocument,
  expected: DomainChallenge,
  nowSeconds: number,
) {
  if (JSON.stringify(challengeFromProof(proof)) !== JSON.stringify(expected))
    throw new Error("Domain proof does not match the issued challenge");
  if (nowSeconds < expected.issuedAt || nowSeconds >= expected.expiresAt)
    throw new Error("Domain proof challenge is stale");
}
