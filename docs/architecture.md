# Architecture

Origin separates public claim storage, attester verification, wallet policy, and evidence presentation. No one component is allowed to silently assume the authority of another.

## System context

```text
┌──────────────────────┐       ordinary SIP-30 request
│ Application          │ ──────────────────────────────────┐
│ no identity verdict  │                                   │
└──────────────────────┘                                   ▼
                                                ┌──────────────────────┐
                                                │ Wallet               │
                                                │ derives exact target │
                                                │ applies local policy │
                                                └──────────┬───────────┘
                                                           │ read-only lookup
                                                           ▼
┌──────────────────────┐       issue/revoke     ┌──────────────────────┐
│ Attester             │ ─────────────────────► │ Origin registry v2   │
│ verifies evidence    │                        │ public claim state   │
└──────────┬───────────┘                        └──────────┬───────────┘
           │                                              │ events + reads
           │                                              ▼
           │                                   ┌──────────────────────┐
           └── public evidence commitment ───► │ Evidence explorer    │
                                               │ explanatory only     │
                                               └──────────────────────┘
```

## Core invariants

- The application supplies a transaction, not an identity conclusion.
- The wallet derives the exact subject from decoded transaction fields.
- The registry is permissionless and does not confer trust.
- Each record is namespaced by `{ attester, subject }`.
- Wallet recognition policy is bundled and wallet-owned.
- Unrecognized claim text is treated as attacker-controlled input.
- Expiry and revocation are evaluated independently by every consumer.
- Lookup failure is unavailable, never Known origin.
- Provenance, lookalike detection, simulation, and post-conditions remain separate signals.

## Components

### Registry

[`contracts/origin-registry-v2.clar`](../contracts/origin-registry-v2.clar) is the canonical live contract. It authenticates the attester from `tx-sender`, prevents forwarded writes, validates bounded fields, stores replay-protected request IDs, and emits complete v2 issue and revoke events.

The registry retains expired and revoked state for consumers to evaluate. It intentionally has no administrator, global attester allowlist, or contract-wide maximum claim lifetime.

### Wallet integration

The reference integration is a patch against Leather's `stx_callContract` approval path. It:

1. constructs `contractAddress + "." + contractName` from decoded request options;
2. reads configured `(attester, subject)` pairs from the pinned Testnet API and v2 registry;
3. checks attester validity intervals, maximum lifetime, expiry, revocation, and lookup completeness; and
4. renders one provenance result plus an independent lookalike warning.

Leather source remains in its own repository and is not vendored here. The compatibility section of [`deployments/testnet-fixtures.json`](../deployments/testnet-fixtures.json) pins the public policy record used by both sides of the demonstration.

### Domain-control attester

The attester is divided into explicit boundaries:

```text
network-facing verifier
  -> validated authorization
  -> authenticated local IPC
  -> isolated signer and nonce journal
  -> exact signed transaction bytes
  -> crash-safe broadcaster
```

- [`secure-fetch.ts`](../scripts/domain-attester/secure-fetch.ts) owns HTTPS, DNS, redirect, address, content, and size policy.
- [`service.ts`](../scripts/domain-attester/service.ts) coordinates challenge and authorization state.
- [`store.ts`](../scripts/domain-attester/store.ts) persists the request lifecycle.
- [`signer-policy.ts`](../scripts/domain-attester/signer-policy.ts) independently validates signer inputs and burn-height bounds.
- [`isolated-signer.ts`](../scripts/domain-attester/isolated-signer.ts) owns nonce allocation and signed-byte recovery.
- [`signer-ipc.ts`](../scripts/domain-attester/signer-ipc.ts) implements authenticated local transport.
- [`broadcast-domain-attestation.ts`](../scripts/broadcast-domain-attestation.ts) broadcasts only recovered exact bytes.

The signer key, IPC token, SQLite databases, and transaction journals are ignored local state and must never enter source control.

### Evidence pipeline

The evidence explorer uses registry events for discovery and `get-attestation` for authoritative current state:

```text
contract log pages
  -> strict v2 event validation
  -> transaction/event deduplication
  -> unique attester/subject pairs
  -> current map reads + burn height
  -> active, revoked, expired, or missing presentation
```

This prevents an old issuance event from being mistaken for current state after replacement or revocation. Partial or failed reads remain visibly partial or unavailable.

## Source layout

| Module                     | Approximate size | Responsibility                                            |
| -------------------------- | ---------------: | --------------------------------------------------------- |
| `contracts/`               |          326 LOC | Registry and harmless Clarity fixtures                    |
| `demo/src/`                |        5,287 LOC | Applicant, registry, evidence UI, event and state readers |
| `scripts/domain-attester/` |        2,555 LOC | Verification, fetch policy, persistence, signer, IPC      |
| other `scripts/`           |        3,083 LOC | Testnet deployment, issuance, recovery, verification      |
| `tests/`                   |        4,519 LOC | Contract, service, security, recovery, and UI coverage    |

## Deployment and configuration

[`deployments/testnet-fixtures.json`](../deployments/testnet-fixtures.json) is the public deployment receipt and compatibility record. It contains no secret material. Runtime credentials live only in ignored local files.

The three web routes are built from one Vite application and deployed to Vercel. Registry and evidence styles are scoped by the active surface. The current architecture keeps the demo compact; separate entry points are a future option if the surfaces continue to grow.

## Known engineering follow-ups

- Consolidate the repeated partial manifest interfaces behind one runtime-validated loader.
- Centralize domain-attester lifecycle transitions across service, broadcaster, and stale-request operator paths.
- Move the shared timeout helper out of the browser demo directory into a neutral module.
- Bound evidence current-state lookup concurrency below the current 100-pair cap.
- Split large applicant and evidence components if the proof of concept becomes a maintained product.
- Generate the public attester profile from one source instead of checking in two synchronized copies.

These are maintainability improvements, not claims that the live Testnet proof of concept is production-ready.
