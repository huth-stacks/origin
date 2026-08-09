export const DOMAIN_POLICY_VERSION = "origin-domain-testnet-v1";
export const DOMAIN_VERIFICATION_METHOD = "https-sip018-deployer-control";
export const DOMAIN_CHALLENGE_VERSION = 1 as const;
export const DOMAIN_CHALLENGE_TTL_SECONDS = 300;
export const DOMAIN_CLAIM_MAX_LIFETIME_BURN_BLOCKS = 4_320;

export const DOMAIN_ROLES = [
  "Application contract",
  "Protocol contract",
  "Treasury contract",
] as const;

export type DomainRole = (typeof DOMAIN_ROLES)[number];

export interface DomainChallenge {
  version: typeof DOMAIN_CHALLENGE_VERSION;
  domain: string;
  subject: string;
  attester: string;
  nonce: string;
  requestId: string;
  policyVersion: typeof DOMAIN_POLICY_VERSION;
  issuedAt: number;
  expiresAt: number;
  claimExpiresAt: number;
  issuerName: string;
  role: DomainRole;
  verificationMethod: typeof DOMAIN_VERIFICATION_METHOD;
}

export interface DomainProofDocument extends DomainChallenge {
  deployerSignature: string;
}

export interface DomainIssueAuthorization {
  kind: "origin-domain-issue-v1";
  network: "testnet";
  registryPrincipal: string;
  attester: string;
  subject: string;
  issuerName: string;
  role: DomainRole;
  expiresAt: number;
  requestId: string;
  policyVersion: typeof DOMAIN_POLICY_VERSION;
  verificationMethod: typeof DOMAIN_VERIFICATION_METHOD;
  verifiedBurnHeight: number;
  authorizedAt: number;
  authorizationExpiresAt: number;
  fee: number;
}

export interface LifecycleAuthorization {
  kind: "origin-operator-lifecycle-v1";
  network: "testnet";
  registryPrincipal: string;
  attester: string;
  action: "issue" | "revoke" | "reissue";
  subject: string;
  issuerName?: string;
  role?: string;
  expiresAt?: number;
  verifiedBurnHeight?: number;
  requestId: string;
  operatorApprovalId: string;
  authorizedAt: number;
  authorizationExpiresAt: number;
  fee: number;
}

export type SignerAuthorization =
  DomainIssueAuthorization | LifecycleAuthorization;

export type DomainRequestState =
  | "challenge-issued"
  | "verified"
  | "authorized"
  | "signed"
  | "broadcast-unknown"
  | "pending"
  | "confirmed"
  | "rejected";

export interface SignedAuthorization {
  requestId: string;
  signerNonce: number;
  serializedTransaction: string;
  txId: string;
}
