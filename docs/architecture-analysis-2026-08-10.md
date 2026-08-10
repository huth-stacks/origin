# Architecture Analysis — August 10, 2026

## Executive summary

The repository contains approximately 11,251 lines of implementation across 54 tracked TypeScript, TSX, CSS, JSON, HTML, and Clarity files, plus 4,519 lines across 30 test files. The implementation has strong boundary-level test coverage and no detected circular imports.

Largest modules:

| Area                         | Files | Approximate LOC |
| ---------------------------- | ----: | --------------: |
| Demo and evidence surfaces   |    15 |           5,287 |
| Domain-attester core         |    13 |           2,555 |
| Testnet and operator scripts |    21 |           3,083 |
| Clarity contracts            |     5 |             326 |
| Tests                        |    30 |           4,519 |

The primary correctness risk is not a single large file. It is state and recovery behavior distributed across the attester store, service, isolated signer, IPC server, and broadcaster. The primary public-review risk was stale internal documentation and absent repository-level CI/security/contribution guidance; that cleanup is part of the August 10 professional-readiness pass.

## Top simplification targets

| Rank | File or subsystem                           |      Size | Complexity indicators                                                  | Risk            |
| ---: | ------------------------------------------- | --------: | ---------------------------------------------------------------------- | --------------- |
|    1 | Attester store/service/signer/IPC           | 1,127 LOC | Distributed state transitions, nonce recovery, queueing, timeouts      | High            |
|    2 | `scripts/fund-testnet-accounts.ts`          |   314 LOC | 277-line top-level workflow, nested journal and nonce paths            | High            |
|    3 | `scripts/issue-testnet-attestations.ts`     |   321 LOC | 264-line top-level workflow, repeated prepare/broadcast logic          | High            |
|    4 | `demo/src/App.tsx`                          |   702 LOC | 409-line component owns state, requests, activity, and full layout     | Medium          |
|    5 | Evidence event/current-state pipeline       | 1,096 LOC | Pagination, validation, deduplication, concurrent reads, partial state | High            |
|    6 | `scripts/domain-attester/secure-fetch.ts`   |   305 LOC | DNS pinning, TLS, deadlines, compression and response limits           | High, justified |
|    7 | `scripts/domain-attester/signer-policy.ts`  |   307 LOC | Two policy protocols and dense exact-field validation                  | High            |
|    8 | Transaction journal and preflight utilities |   430 LOC | Atomic persistence, idempotency, API evidence classification           | Medium-high     |
|    9 | `scripts/domain-attester/strict-json.ts`    |   127 LOC | Handwritten duplicate-key-aware recursive parser                       | Medium-high     |
|   10 | Three page-specific CSS files               | 2,748 LOC | Large selector surface tightly paired to three TSX pages               | Medium          |

## Likely bug hideouts

- Nonce reservation, signed-byte durability, network nonce fallback, and broadcaster recovery across `isolated-signer.ts`, `store.ts`, and `broadcast-domain-attestation.ts`.
- Stale-request expiry racing verification or signing in `store.ts` and `operator.ts`.
- Socket timeout, reset, and settlement coordination in `signer-ipc.ts`.
- Journal replay and per-recipient nonce allocation inside the long funding and issuance entry points.
- Partial event pages, duplicate events, API shape validation, and current-state reconciliation in the evidence pipeline.
- Custom outbound HTTPS behavior in `secure-fetch.ts`; its complexity should remain isolated and adversarially tested rather than casually generalized.

## Coupling analysis

High fan-in modules:

| Module                                     | Production importers | Observation                                                            |
| ------------------------------------------ | -------------------: | ---------------------------------------------------------------------- |
| `demo/src/fetch-with-timeout.ts`           |                   10 | Node operational code currently depends on a browser-directory utility |
| `scripts/testnet-account-utils.ts`         |                    9 | Central operational credential boundary                                |
| `scripts/domain-attester/types.ts`         |                    7 | Healthy shared protocol types with broad blast radius                  |
| `scripts/domain-attester/store.ts`         |                    5 | Persistence API is central to lifecycle behavior                       |
| `scripts/testnet-transaction-utils.ts`     |                    5 | Shared journal and exact-byte recovery boundary                        |
| `scripts/domain-attester/domain-policy.ts` |                    5 | Central security-policy definition                                     |

The most important configuration coupling is multiple handwritten partial interfaces for `deployments/testnet-fixtures.json`. They can typecheck independently while interpreting stale subsets. The manifest should eventually have one runtime-validated loader used by every operational entry point.

No circular TypeScript imports were detected.

## Recommended simplification order

1. Introduce one shared runtime-validated manifest loader without changing behavior.
2. Centralize domain-attester state transitions behind a narrow coordinator API.
3. Extract common prepare/broadcast and journal planning from funding and issuance entry points.
4. Move `fetch-with-timeout.ts` into a neutral shared module.
5. Add bounded concurrency to evidence current-state reads.
6. Extract applicant request control from `App.tsx` while keeping UI output identical.
7. Generate the public attester profile during the build from one canonical JSON source.

## Files to read before changing security-sensitive behavior

- `contracts/origin-registry-v2.clar`
- `scripts/domain-attester/store.ts`
- `scripts/domain-attester/service.ts`
- `scripts/domain-attester/signer-policy.ts`
- `scripts/domain-attester/isolated-signer.ts`
- `scripts/domain-attester/signer-ipc.ts`
- `scripts/domain-attester/secure-fetch.ts`
- `scripts/testnet-transaction-utils.ts`
- `docs/review-2026-08-08-four-day-foundation.md`
- `docs/review-resolution-2026-08-09.md`

The recommended changes are follow-up maintenance work. They should be performed test-first and should not be mixed into demo or documentation-only pull requests.
