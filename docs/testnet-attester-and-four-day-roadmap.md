# Origin Testnet Attester and Four-Day Foundation

Status: completed Testnet foundation, August 10, 2026

## Executive summary

Origin now has two wallet-recognized Testnet attesters and a permissionless v2 registry. The canonical attester supports the narrated Acme fixture. The domain-control attester issued a second, bounded claim after checking HTTPS evidence and a SIP-018 deployer signature through an isolated signer boundary.

Leather trusts neither the registry nor a requesting site to choose its policy. It derives the exact contract subject, queries wallet-configured attesters, checks the current lifecycle record, and recognizes a claim only when its attester and lifetime fit bundled wallet policy.

This is a working proof of concept, not a production verification business. It does not establish legal identity, representative authority, source-code safety, audit status, transaction intent, or production custody quality.

## Live Testnet anchors

| Item                    | Current value                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry                | [`ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`](https://explorer.hiro.so/address/ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2?chain=testnet) |
| Registry deployment     | [`0x8a2c71…46de3`](https://explorer.hiro.so/txid/0x8a2c71ba986643dab5a4e992e0edecf5b5c6c4752fdd1cbd9f42f572a8646de3?chain=testnet)                                            |
| Canonical attester      | [`ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R`](https://explorer.hiro.so/address/ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R?chain=testnet)                                       |
| Domain-control attester | [`ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0`](https://explorer.hiro.so/address/ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0?chain=testnet)                                       |
| Known Acme subject      | [`ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`](https://explorer.hiro.so/address/ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action?chain=testnet)               |
| Known Acme claim        | [`0xeeaa16…79cb6`](https://explorer.hiro.so/txid/0xeeaa16f586079c7096433fa77d1496b6816cf294d789c2b84420a81d38279cb6?chain=testnet)                                            |
| Domain-control claim    | [`0xcba260…09f18`](https://explorer.hiro.so/txid/0xcba260a1d50d67ee75b99db89c8ce26a56e075323f21bbff9eeebdd68a009f18?chain=testnet)                                            |

The immutable fixture record, including every transaction and height, is in [`deployments/testnet-fixtures.json`](../deployments/testnet-fixtures.json).

## What the v2 registry records

Records are keyed by the exact pair:

```clarity
{ attester: principal, subject: principal }
```

Each current record includes organization, role, issue height, expiry, revocation state, optional revocation height, and a replay-protected request ID. The registry:

- derives the attester from `tx-sender`;
- prevents cross-principal writes with `tx-sender == contract-caller`;
- permits multiple attesters to claim the same subject without overwriting each other;
- supports explicit replacement and revocation;
- emits complete versioned lifecycle events; and
- exposes read-only current state for reconciliation.

The registry is deliberately permissionless. A record proves that its attester published a claim; it does not make that attester trustworthy.

## How Leather recognizes a claim

The application sends a normal `stx_callContract` request. It supplies no organization, attester, policy, reference contract, or identity verdict.

Leather:

1. Decodes `contractAddress` and `contractName` and constructs the exact subject.
2. Queries its bundled discovery-attester list against the pinned Testnet API and registry.
3. Checks the subject, revocation state, burn-height expiry, attester validity interval, and maximum claim lifetime.
4. Promotes identity only when an active claim comes from a bundled trusted attester.
5. Quarantines unrecognized organization and role strings from trusted wallet chrome.
6. Treats timeouts, malformed responses, and registry failures neutrally.

Lookalike detection is separate: a familiar contract name under another deployer can produce a warning, but never an identity verdict.

## Current wallet-owned policy

Leather recognizes:

- **Origin Testnet Attester** for the long-lived narrated fixtures; and
- **Origin Domain Control Attester** for claims capped at 4,320 burn blocks.

It also queries one demonstration-untrusted attester so the hostile-claim scenario is deterministic. Querying an attester is not trusting it. The retired shared-mnemonic attester remains only in public rotation history and is absent from the active trust set.

## Domain-control issuance delivered

The prototype implements one narrow automated flow:

```text
Organization
  -> signs a versioned SIP-018 statement with the subject deployer's key
  -> publishes it at a fixed HTTPS well-known location

Verifier
  -> validates domain, nonce, freshness, policy, subject, deployer signature, and response safety

Isolated signer
  -> independently enforces the policy envelope
  -> signs the exact registry transaction bytes

Broadcaster
  -> journals and broadcasts those exact bytes

Leather
  -> reads the resulting claim and applies wallet-owned attester policy
```

The current domain claim covers `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN.origin-domain-proof`, identifies `origin-iota-ashy.vercel.app`, and expires at burn block `7,806`. The evidence explorer exposes its policy and public supporting facts.

The verifier and signer include fixed URL rules, public-address enforcement, service-address exclusions, redirect denial, DNS-rebinding resistance, response-size and content checks, bounded issuer strings, signer-owned burn-height reads, durable nonce recovery, and socket-error handling. The signer remains stopped except for controlled issuance.

## Evidence and lifecycle surfaces

The browser-side index discovers v2 lifecycle events, validates their tuple shape, deduplicates transaction/event identities, and reconciles them against `get-attestation` current state. This keeps event discovery separate from the registry's authoritative current record.

The public evidence surface lets a viewer inspect:

- exact subjects and attesters;
- issue, expiry, revocation, and reissue history;
- claim and registry Explorer links;
- the domain-control policy and profile; and
- separate lifecycle and expired fixtures without mutating the canonical Acme claim.

## Four-day execution record

### Day 1 — Evidence-complete wallet UX: complete

- Added exact principal, attester, registry, issue, and expiry evidence.
- Separated provenance from post-condition protection.
- Added known, unrecognized, unknown, no-longer-valid, loading, and unavailable states.
- Added Explorer links and adversarial rendering tests.

### Day 2 — V2 cutover and claim explorer: complete

- Deployed the v2 registry and rotated independently seeded attesters.
- Reissued canonical fixtures and promoted one atomic compatibility record to both repositories.
- Added event discovery, current-state reconciliation, evidence profile, and public claim explorer.
- Removed the retired principal from active wallet trust.

### Day 3 — Domain-control prototype: complete within Testnet scope

- Implemented the canonical proof packet and SIP-018 verification.
- Hardened outbound fetching and separated verification from signing.
- Issued one bounded live Testnet claim through the isolated signer and exact-bytes broadcaster.
- Added recovery, nonce, and policy-boundary tests.

### Day 4 — Lifecycle and demo polish: complete

- Added separate lifecycle and expiry fixtures.
- Preserved the canonical Acme claim through all lifecycle demonstrations.
- Added the three-scenario applicant, wallet storybook, evidence explorer, and registry explainer.
- Added live verification and non-broadcasting end-to-end rehearsal paths.

## Production work that remains

The prototype should not be represented as production-ready. Remaining work includes:

- production HSM or managed-key custody and governed rotation;
- signed, rapidly updateable wallet attester policy;
- production monitoring, incident response, rate limiting, and availability targets;
- generalized indexer reliability and independent API providers;
- multisig and contract-principal deployer proofs;
- independent security review of the complete deployed service;
- privacy-preserving KYB or representative-authority attesters where those claims are needed; and
- standardization across wallets and smart-contract recipient flows.

The next design question is not whether the Testnet demo works. It is how wallets and smart-contract recipients should consume the same narrow provenance fact without conflating open claims, attester trust, and contract safety.
