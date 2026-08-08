import { createHash } from "node:crypto";

import {
  Cl,
  encodeStructuredDataBytes,
  publicKeyFromSignatureRsv,
  publicKeyToAddress,
  signStructuredData,
} from "@stacks/transactions";

import { deployerFromSubject } from "./domain-policy.ts";
import type { DomainChallenge, DomainProofDocument } from "./types.ts";

const TESTNET_CHAIN_ID = 0x80000000;

export function domainProofSip018Values(challenge: DomainChallenge) {
  return {
    domain: Cl.tuple({
      name: Cl.stringAscii("Origin Domain Attestation"),
      version: Cl.stringAscii("1"),
      "chain-id": Cl.uint(TESTNET_CHAIN_ID),
    }),
    message: Cl.tuple({
      version: Cl.uint(challenge.version),
      domain: Cl.stringAscii(challenge.domain),
      subject: Cl.principal(challenge.subject),
      attester: Cl.principal(challenge.attester),
      nonce: Cl.bufferFromHex(challenge.nonce),
      "request-id": Cl.bufferFromHex(challenge.requestId),
      "policy-version": Cl.stringAscii(challenge.policyVersion),
      "issued-at": Cl.uint(challenge.issuedAt),
      "expires-at": Cl.uint(challenge.expiresAt),
      "claim-expires-at": Cl.uint(challenge.claimExpiresAt),
      "issuer-name": Cl.stringAscii(challenge.issuerName),
      role: Cl.stringAscii(challenge.role),
      "verification-method": Cl.stringAscii(challenge.verificationMethod),
    }),
  };
}

export function verifyDomainProofSignature(
  challenge: DomainChallenge,
  signature: string,
) {
  const encoded = encodeStructuredDataBytes(domainProofSip018Values(challenge));
  const messageHash = createHash("sha256").update(encoded).digest("hex");
  let publicKey: string;
  try {
    publicKey = publicKeyFromSignatureRsv(messageHash, signature);
  } catch {
    throw new Error("Domain proof signature is invalid");
  }
  const signer = publicKeyToAddress(publicKey, "testnet");
  const expected = deployerFromSubject(challenge.subject);
  if (signer !== expected)
    throw new Error("Domain proof signer is not the subject deployer");
  return signer;
}

export function signDomainProof(
  challenge: DomainChallenge,
  privateKey: string,
): DomainProofDocument {
  const deployerSignature = signStructuredData({
    ...domainProofSip018Values(challenge),
    privateKey,
  });
  verifyDomainProofSignature(challenge, deployerSignature);
  return { ...challenge, deployerSignature };
}
