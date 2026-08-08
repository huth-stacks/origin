import { randomBytes } from "node:crypto";

import { isGloballyRoutableAddress } from "./network-policy.ts";
import {
  assertProofMatchesChallenge,
  deployerFromSubject,
  normalizeRegistrableDomain,
  parseDomainProofDocument,
  parseDomainRole,
} from "./domain-policy.ts";
import { verifyDomainProofSignature } from "./proof-signature.ts";
import { secureFetchDomainProof } from "./secure-fetch.ts";
import { DomainAttesterStore } from "./store.ts";
import {
  DOMAIN_CHALLENGE_TTL_SECONDS,
  DOMAIN_CHALLENGE_VERSION,
  DOMAIN_CLAIM_MAX_LIFETIME_BURN_BLOCKS,
  DOMAIN_POLICY_VERSION,
  DOMAIN_VERIFICATION_METHOD,
  type DomainChallenge,
  type DomainIssueAuthorization,
  type SignedAuthorization,
} from "./types.ts";

interface CurrentClaim {
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
}

interface DomainSigner {
  sign(authorization: DomainIssueAuthorization): Promise<SignedAuthorization>;
}

interface DomainAttesterLog {
  requestId: string;
  domain: string;
  subject: string;
  disposition: string;
  resolvedAddressClass?: "public-unicast";
  responseBytes?: number;
  txId?: string;
  detail?: string;
}

interface DomainAttesterServiceOptions {
  store: DomainAttesterStore;
  signer: DomainSigner;
  attester: string;
  registryPrincipal: string;
  denySubjects: ReadonlySet<string>;
  readBurnHeight: () => Promise<number>;
  readCurrentClaim: (
    attester: string,
    subject: string,
  ) => Promise<CurrentClaim | null>;
  fetchProof?: typeof secureFetchDomainProof;
  nowSeconds?: () => number;
  randomHex?: (bytes: number) => string;
  logger?: (entry: DomainAttesterLog) => void;
  fee?: number;
}

export class DomainAttesterService {
  private readonly fetchProof: typeof secureFetchDomainProof;
  private readonly nowSeconds: () => number;
  private readonly randomHex: (bytes: number) => string;
  private readonly fee: number;
  private readonly options: DomainAttesterServiceOptions;

  constructor(options: DomainAttesterServiceOptions) {
    this.options = options;
    this.fetchProof = options.fetchProof ?? secureFetchDomainProof;
    this.nowSeconds =
      options.nowSeconds ?? (() => Math.floor(Date.now() / 1_000));
    this.randomHex =
      options.randomHex ?? ((bytes) => randomBytes(bytes).toString("hex"));
    this.fee = options.fee ?? 10_000;
    const registryParts = options.registryPrincipal.split(".");
    if (registryParts.length !== 2 || registryParts[1] !== "origin-registry-v2")
      throw new Error("Domain attester requires the reviewed v2 registry");
  }

  async createChallenge(args: {
    domain: string;
    subject: string;
    role: string;
    sourceAddress: string;
  }) {
    if (!isGloballyRoutableAddress(args.sourceAddress))
      throw new Error("Challenge source address is not public unicast");
    const domain = normalizeRegistrableDomain(args.domain);
    deployerFromSubject(args.subject);
    if (this.options.denySubjects.has(args.subject))
      throw new Error("Domain issuance is denied for a canonical demo subject");
    const role = parseDomainRole(args.role);
    const now = this.nowSeconds();
    const burnHeight = await this.options.readBurnHeight();
    if (!Number.isSafeInteger(burnHeight) || burnHeight < 0)
      throw new Error("Burn height is unavailable");
    const challenge: DomainChallenge = {
      version: DOMAIN_CHALLENGE_VERSION,
      domain,
      subject: args.subject,
      attester: this.options.attester,
      nonce: this.randomHex(32),
      requestId: this.randomHex(32),
      policyVersion: DOMAIN_POLICY_VERSION,
      issuedAt: now,
      expiresAt: now + DOMAIN_CHALLENGE_TTL_SECONDS,
      claimExpiresAt: burnHeight + DOMAIN_CLAIM_MAX_LIFETIME_BURN_BLOCKS,
      issuerName: domain,
      role,
      verificationMethod: DOMAIN_VERIFICATION_METHOD,
    };
    const stored = this.options.store.issueChallenge(
      challenge,
      args.sourceAddress,
      now,
    );
    this.log(stored.challenge, "challenge-issued");
    return challenge;
  }

  async verifyAndAuthorize(requestId: string) {
    const request = this.options.store.get(requestId);
    let responseBytes: number | undefined;
    try {
      if (request.state !== "challenge-issued")
        throw new Error("Domain request is not awaiting verification");
      const fetched = await this.fetchProof(request.domain);
      responseBytes = fetched.responseBytes;
      const proof = parseDomainProofDocument(fetched.document);
      const now = this.nowSeconds();
      assertProofMatchesChallenge(proof, request.challenge, now);
      verifyDomainProofSignature(request.challenge, proof.deployerSignature);
      const burnHeight = await this.options.readBurnHeight();
      if (burnHeight >= request.challenge.claimExpiresAt)
        throw new Error("Domain claim expiry is no longer in the future");
      if (
        request.challenge.claimExpiresAt >
        burnHeight + DOMAIN_CLAIM_MAX_LIFETIME_BURN_BLOCKS
      )
        throw new Error(
          "Domain claim expiry exceeds the verified-height ceiling",
        );
      const current = await this.options.readCurrentClaim(
        request.attester,
        request.subject,
      );
      if (current) {
        const renewalHeight =
          current.issuedAt +
          Math.ceil((current.expiresAt - current.issuedAt) * 0.8);
        if (burnHeight < renewalHeight)
          throw new Error("Domain claim is not yet eligible for renewal");
      }
      const authorization: DomainIssueAuthorization = {
        kind: "origin-domain-issue-v1",
        network: "testnet",
        registryPrincipal: this.options.registryPrincipal,
        attester: this.options.attester,
        subject: request.subject,
        issuerName: request.domain,
        role: request.challenge.role,
        expiresAt: request.challenge.claimExpiresAt,
        requestId,
        policyVersion: DOMAIN_POLICY_VERSION,
        verificationMethod: DOMAIN_VERIFICATION_METHOD,
        verifiedBurnHeight: burnHeight,
        authorizedAt: now,
        authorizationExpiresAt: request.challenge.expiresAt,
        fee: this.fee,
      };
      const stored = this.options.store.authorize(
        requestId,
        authorization,
        now,
      );
      this.log(request.challenge, "authorized", {
        resolvedAddressClass: "public-unicast",
        responseBytes: fetched.responseBytes,
      });
      return stored.authorization!;
    } catch (error) {
      this.log(request.challenge, "verification-rejected", {
        ...(responseBytes === undefined
          ? {}
          : {
              resolvedAddressClass: "public-unicast",
              responseBytes,
            }),
        detail: error instanceof Error ? error.message : "unknown failure",
      });
      throw error;
    }
  }

  async sign(requestId: string) {
    const request = this.options.store.get(requestId);
    if (request.state === "signed")
      return {
        requestId,
        signerNonce: request.signerNonce!,
        serializedTransaction: request.serializedTransaction!,
        txId: request.txId!,
      };
    if (request.state !== "authorized" || !request.authorization)
      throw new Error("Domain request is not authorized for signing");
    let signed: SignedAuthorization;
    try {
      signed = await this.options.signer.sign(request.authorization);
    } catch (error) {
      this.log(request.challenge, "signing-rejected", {
        detail: error instanceof Error ? error.message : "unknown failure",
      });
      throw error;
    }
    const stored = this.options.store.recordSigned(
      requestId,
      signed,
      this.nowSeconds(),
    );
    this.log(request.challenge, "signed", { txId: stored.txId });
    return signed;
  }

  markBroadcastUnknown(requestId: string) {
    return this.options.store.transition(
      requestId,
      "broadcast-unknown",
      this.nowSeconds(),
    );
  }

  markPending(requestId: string) {
    return this.options.store.transition(
      requestId,
      "pending",
      this.nowSeconds(),
    );
  }

  markConfirmed(requestId: string, disposition = "confirmed") {
    return this.options.store.transition(
      requestId,
      "confirmed",
      this.nowSeconds(),
      disposition,
    );
  }

  markRejected(requestId: string, disposition: string) {
    return this.options.store.transition(
      requestId,
      "rejected",
      this.nowSeconds(),
      disposition,
    );
  }

  private log(
    challenge: DomainChallenge,
    disposition: string,
    extra: Partial<DomainAttesterLog> = {},
  ) {
    this.options.logger?.({
      requestId: challenge.requestId,
      domain: challenge.domain,
      subject: challenge.subject,
      disposition,
      ...extra,
    });
  }
}
