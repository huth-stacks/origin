# Four-Day Foundation Implementation Status

Date: August 7, 2026

Origin branch: `agent/four-day-foundation` from `b602551`

Leather branch: `agent/four-day-foundation` from `64a1353c6`

## Outcome

The consolidated plan review's pre-build changes are incorporated into the plan and the G1 foundation is implemented. No Testnet transaction was funded, signed, broadcast, or promoted. Every transaction command defaults to a read-only dry run; the separate `:broadcast` commands remain an explicit operator gate.

This is review-ready foundation work, not approval for G2 or G3. The coordinated cutover still needs exact live values, funding approval, broadcast approval, confirmed chain evidence, and an atomic manifest/config promotion.

## Post-review funding-gate fixes

The consolidated G1 review identified six issues, all fixed before preparation of a funding packet:

1. The verifier accepts only schema 1 or 2, reaches the v2 getter/tuple branches, checks the exclusive `validUntilBurnBlock` boundary, and requires/verifies the domain-proof, lifecycle, and short-expiry fixtures in every v2 manifest.
2. Issuance request IDs derive from a persisted reviewed intent ID plus exact issuance arguments. Retrying the same intent recovers the same IDs and semantic transaction journals; reissue or renewal requires a fresh intent ID.
3. Funding journals are keyed by `{sender, recipient}`, recover the original nonce and amount, and reconcile that exact transaction. Without a journal, the script reads the recipient balance and transfers only the amount needed to reach the packet minimum.
4. Deployment and transaction preflights have hard per-request deadlines. The cursor index has both per-request and total pagination budgets. Direct contract, balance, network-info, and verifier HTTP reads are bounded as well.
5. The domain-proof contract rejects forwarded calls and uses insert-once proof records. Tests prove a failed overwrite retains the original evidence.
6. The v2 manifest validator requires request IDs and trusted-policy compliance for canonical, lifecycle, and expiry claims, and requires the expiry fixture to be shorter-lived than the canonical claim.

## Reviewer findings disposition

| Review cluster                | Implemented response                                                                                                                                                                                                                                                                                                                                                                             | Remaining gate                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Complete v2 ABI freeze        | Schema getter, versioned complete events, persisted revocation height, exact 32-byte request correlator, attester-scoped replay prevention, fixed errors and tuple bounds, direct-call guard, reissue semantics, and contract-principal self-issuance are specified and tested. The wallet, not the permissionless registry, owns per-attester lifetime caps.                                    | A post-deployment defect uses a new contract name and atomic compatibility replacement; v2 is never edited in place.     |
| Branding binding              | The protocol derives the trusted label from the proven eTLD+1, binds it byte-for-byte into the challenge and signer authorization, restricts role to an enum, denies protected names, and requires first-issuance operator review.                                                                                                                                                               | The Day 3 service and its adversarial suite are not built yet.                                                           |
| Explorer containment          | The plan requires escaped, control-stripped, length-capped, non-autolinked hostile text; no hostile title/meta/OG text; dominant unrecognized banner; `noindex`; config-only profile mapping; and registry-only tx search.                                                                                                                                                                       | Profile and explorer views are Day 2 UI work.                                                                            |
| v1 history correctness        | The browser event index backfills a v1 revoke only from its preceding issue. Missing history stays explicitly partial.                                                                                                                                                                                                                                                                           | None for the index core.                                                                                                 |
| Cursor index                  | The index uses Hiro's v2 smart-contract logs cursor, exact registry principal and topic, `(txid,eventIndex)` deduplication, chronological output, cursor-progress and page limits, and quarantines malformed/foreign events. It states that the browser prototype cannot independently detect reorgs because the response lacks an index hash; direct registry reads remain current-state truth. | UI, direct subject lookup, and public hosting remain.                                                                    |
| Role and signer isolation     | Seven roles have independently generated seeds in separate ignored mode-0600 files. Loaders open only the requested role. The online domain attester is separate from the canonical attester.                                                                                                                                                                                                    | The Day 3 process/socket/filesystem isolation test remains.                                                              |
| Durable replay/reconciliation | v2 persists request IDs. Broadcast tooling persists signed bytes, intent, and locally computed txid before network I/O. Deploy, funding, and issuance preflights distinguish confirmed, exact pending, nonce conflict, absent prior attempt, unavailable evidence, rejected, and clean-to-broadcast states.                                                                                      | The Day 3 SQLite service state machine remains.                                                                          |
| Lifecycle contradictions      | Ordinary domain renewal keeps the 80% rule. A separate operator lifecycle authorization may reissue the dedicated fixture after revocation. The four-day domain policy is eTLD+1-only.                                                                                                                                                                                                           | Day 4 live lifecycle approval remains.                                                                                   |
| Secret hygiene                | `.gitignore` covers `**/*.local.*`; verification scans tracked and unignored files for secret patterns.                                                                                                                                                                                                                                                                                          | Back up the local seed files securely before approving funding.                                                          |
| Schedule and scope            | Day 1 now contains the schema/index/cutover foundation. Profile/explorer work moves into Day 2 confirmation waits. DNS/TLS provisioning moves to Day 1. The serverless-index and live multisig verification paths are dropped; the cheap proof fixture remains designed-not-implemented evidence.                                                                                                | A controlled fictional eTLD+1 and distinct profile/explorer host must be selected and provisioned.                       |
| Atomic trust cutover          | Leather reads one versioned compatibility object containing API, registry/schema, trusted intervals/lifetime caps, discovery attesters, reference subjects, and profile links. Origin's current manifest carries the matching compatibility record.                                                                                                                                              | The v2 candidate must explicitly omit the old shared-mnemonic attester and may be promoted only after live verification. |
| Promotion order               | The execution plan generates a candidate manifest/config pair after confirmation and promotes neither until the complete wallet journey passes.                                                                                                                                                                                                                                                  | Requires G2 confirmations and final installed-bundle exercise.                                                           |
| v2-shaped operations          | Deploy targets only v2 plus the proof/lifecycle/expiry fixtures. Issuance uses v2 request IDs and preserves the existing canonical known/unrecognized subjects. Verification switches by schema and checks v2 fields/getter. A dedicated short-expiry claim is part of the dry-run write set.                                                                                                    | Exact absolute expiries, chain-read issue heights, txids, and balances belong in the reviewed G2 packet.                 |

## Local isolated Testnet roles

The private files are under `settings/testnet-v2-<role>.local.json`; the public local manifest is `deployments/testnet-v2-accounts.local.json`. None is tracked.

| Role                | Testnet principal                           |
| ------------------- | ------------------------------------------- |
| Registry deployer   | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN` |
| Canonical attester  | `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R` |
| Domain attester     | `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0` |
| Unrecognized issuer | `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ` |
| Proof deployer      | `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN` |
| Lifecycle deployer  | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM` |
| Expiry deployer     | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV`  |

The dry-run plan preserves the existing canonical subjects:

- known: `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`
- unrecognized: `ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action`

It adds only:

- `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN.origin-domain-proof`
- `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM.origin-lifecycle-action`
- `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV.origin-expiry-action`

## Verification evidence

Origin:

- `pnpm verify`: pass
- 15 test files, 111 tests: pass
- Clarity: 5 contracts checked with the six documented untrusted-input warnings
- secret scan, TypeScript, formatting, and demo production build: pass
- funding, deployment, and issuance commands: executable dry runs, no broadcasts

Leather:

- `pnpm format`: pass
- `pnpm typecheck`: pass
- `pnpm --filter @leather.io/extension lint:unused-exports`: pass
- extension unit suite: 93 files, 617 tests, pass
- Origin demo production-manifest/testing-runtime build: pass; built manifest name is `Leather Origin Demo`
- repository-wide lint remains blocked only by the same four unrelated `apps/web` errors documented before this branch
- Knip remains blocked only by the same 11 unused tool files and one `commander` dependency documented before this branch

## Required next approval packet

Before any external write, prepare and review all of the following together:

1. secure backup confirmation for the seven private local account files;
2. read-only balances and the exact funding amounts/fees/nonces;
3. exact contract principals, sources, hashes, fees, nonces, and locally computed transaction IDs;
4. exact canonical and short-expiry integers with current burn-height arithmetic;
5. the complete issuance argument set and request IDs;
6. a candidate v2 manifest generated only from confirmed chain data;
7. one atomic Leather compatibility diff that contains only the new canonical attester, derives `validFromBurnBlock` from its confirmed `issued-at`, and caps the claim lifetime;
8. stop conditions, pending-state reconciliation, rollback/containment, and explicit funding/broadcast approvals.

Until that packet is approved, run only commands without the `:broadcast` suffix.
