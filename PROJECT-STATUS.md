# Origin Project Status

- **As of:** August 8, 2026
- **Canonical repository:** `https://github.com/huth-stacks/origin`
- **Product state:** complete hackathon proof of concept with a live, verified Testnet v2 registry; isolated canonical and domain attesters; five live claims including one HTTPS/SIP-018 domain-control issuance; public applicant and evidence sites; and a locally built Leather v2 integration branch. It is not integrated into upstream Leather.

This file is the current handoff record. Product decisions remain canonical in
`origin-hackathon-plan.md`; operational instructions remain canonical in `demo-runbook.md`.

## Repository topology

Origin is one project with two intentionally separate Git repositories:

| Responsibility                                                                                                   | Repository and local checkout                                                                                                 | Current review target                      |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Product plan, Clarity registry, Testnet fixtures, Acme demo, deployment notes, and cross-repository coordination | `huth-stacks/origin` at `/Users/alexander/Code/contract-provenance-certificate`                                               | `agent/four-day-foundation`                |
| Leather lookup, evaluator, approval UX, and extension tests                                                      | `huth-stacks/leather-origin-demo` at `/Users/alexander/Code/leather-origin-demo`, with `leather-io/mono` retained as upstream | `agent/four-day-foundation` at `3ae72d8c4` |

Leather remains separate because it is an upstream product monorepo. Vendoring its source here
would obscure the review boundary and make future rebases harder. This repository consolidates the
project through pinned commits, manifests, runbooks, and links instead.

The archived `/Users/alexander/Code/leather-extension-archive` checkout is reference-only and is
not part of the active project.

## What is implemented

- A permissionless Clarity 5 registry keyed by `{ attester, subject }`, with issuance,
  replacement, revocation, and burn-block expiration.
- Seven live Testnet contracts: the v2 registry, four harmless state-only target fixtures, and the
  dedicated domain-proof and lifecycle fixtures.
- A fictional Acme check-in dapp that connects through Leather's normal provider and sends ordinary
  `stx_callContract` requests without identity or trust hints.
- A wallet-owned registry client and pure evaluator in Leather.
- Wallet-pinned Testnet transport for Origin registry and burn-height reads; a request-selected
  node cannot answer the provenance lookup.
- Wallet UX for known, unrecognized, unknown, no-longer-valid, loading, and unavailable states.
- An independent same-contract-name/different-deployer lookalike warning.
- Advanced details showing the exact checked principal, attester, block heights, and registry.
- Testnet Explorer links for the trusted attester and registry, making the evidence independently
  inspectable from the approval screen.
- Deterministic unit, component, and browser coverage plus an opt-in live Testnet journey.
- A Simnet-only v2 registry migration bundle with direct-call guards, persisted revocation time,
  index-complete lifecycle events, and explicit reissue semantics.
- Independently seeded future Testnet roles and broadcast scripts that reject node errors even when
  the rejection response contains a transaction ID.
- A browser-side registry event index, direct current-map reconciliation, human-readable attester
  profile, versioned machine profile, and exact subject/attester/registry-transaction explorer.
- Evidence containment that strips controls, caps display strings, quarantines unrecognized issuer
  text, never autolinks claim values, marks replaced issuance history, and fails neutrally when
  registry evidence is unavailable.
- A live-tested domain-control attester policy engine with canonical eTLD+1/private-tenant challenges, SIP-018
  deployer proofs, DNS-pinned HTTPS fetching, bounded strict JSON, durable SQLite replay and
  recovery state, renewal policy, authenticated signer IPC, an isolated allowlisted signer, and a
  separate exact-bytes broadcaster that cannot access the signing key.

The requesting application never supplies the displayed organization, attester policy, canonical
contract, or verdict. Origin establishes provenance claims, not contract or transaction safety.

## Deployment and integration state

- `huth-stacks/origin` `main` contains the complete registry, restored Testnet fixtures, UX
  storybook, attester roadmap, and consolidated handoff at `acc1d39`.
- Origin PR #11 merged on August 6, 2026 after its Vercel checks and fresh live-Testnet browser
  journey passed.
- `https://origin-umber-six.vercel.app` serves the merged `Acme · Check in` build.
- Leather PR #1 merged the final native approver-section redesign into
  `agent/origin-three-scenario-flow` in the fork at `c91732064`. It did not modify upstream Leather.
- No PR has been opened against `leather-io/mono`.
- The Leather work started at upstream `dev` commit `d98bd9a61`. Rebase and full verification are
  required before an upstream PR.
- The live registry is `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`.
- `https://origin-iota-ashy.vercel.app` is the public applicant/demo host and
  `https://origin-evidence.vercel.app/evidence` is the distinct public evidence host.
- The Origin and Leather compatibility manifests are v2 and trust the isolated canonical and
  domain attesters. The prior shared-mnemonic principal is absent.
- The domain signer is stopped after its single bounded issuance. Its key, IPC token, database,
  and transaction journals remain ignored local mode-`0600` state.

## Verification snapshot

Completed v2 cutover checks on August 8, 2026:

- Recovery-tested GPG ciphertext for all seven isolated roles is stored locally and as an
  encrypted GitHub Actions variable; a round-trip fetch, SHA-256 match, decrypt, and principal
  validation passed without committing seed material.
- The six exact funding transfers, four exact-source deployments, four canonical fixture claims,
  and one domain-control claim are confirmed on Testnet. The immutable transaction IDs are in
  `deployments/testnet-fixtures.json` and the completed cutover packet.
- `pnpm testnet:verify` passed at burn height `3,487`, confirming seven exact-source contracts,
  five exact claims, and the unknown same-name/different-deployer lookalike.
- The domain verifier fetched a public, redirect-free signed proof from
  `origin-iota-ashy.vercel.app`, validated public DNS, pinned TLS, strict JSON, and the SIP-018
  deployer signature, then authorized the exact claim. The isolated signer produced one
  journaled transaction, the keyless broadcaster submitted the same bytes, and the request
  reached durable `confirmed` state.
- Origin verification passed 25 files/269 tests, formatting, secret scan, TypeScript, all five
  Clarity contracts, and the production build. Leather formatting and typecheck passed; the full
  extension suite passed 93 files/617 tests; unused exports reported zero; and the Origin demo
  build passed. Full lint still reports exactly the four documented unrelated `apps/web` errors,
  and Knip still reports exactly the documented 11 unused tool files plus `commander`.
- A fresh production testing-runtime extension build and the installed Chromium journey against
  `https://origin-iota-ashy.vercel.app` passed all three live Testnet provenance states in 14.5
  seconds. Every request was closed without broadcasting an application transaction.

Current v2 foundation checks on August 7, 2026:

- Origin `pnpm verify`: passed, including 18 test files and 137 tests.
- The live local evidence route discovered both v1 claims from registry events, reconciled current
  map state at burn height `3,100`, and rendered complete desktop and 390-pixel mobile warnings,
  exact principals, approved-attester links, and hostile-text quarantine.
- Seven future roles are independently seeded in separate ignored mode-`0600` files; the transaction journal directory is absent.
- Funding and issuance fees are fixed in their persisted intents, removing fee-estimator drift from reviewed transaction identities.
- Funding, deployment, and issuance each have separate dry-run, local prepare, and broadcast modes. Preparation journals exact signed bytes without network I/O; broadcast marks the journal attempted before network I/O and preserves fail-closed reconciliation after uncertainty.
- Read-only Testnet snapshot at burn height `3,093`: all seven future roles have zero balance, nonce `0`, and no mempool activity.
- The pre-signing [v2 cutover packet](docs/testnet-v2-cutover-approval-packet-2026-08-07.md) records principals, source hashes, funding, nonces, fixed fees, expiry arithmetic, request IDs, trust cutover, stop conditions, and staged approvals.
- No recoverable seed backup or controlled custom domain is configured. No faucet request, transaction signing, funding, deployment, issuance, or promotion has occurred.

Local Day 3 safe-floor checks on August 8, 2026:

- The domain-attester suite passes 124 tests across fetch policy, challenge/proof policy, durable
  storage, service orchestration, signer allowlists, deterministic transaction journaling, and
  authenticated Unix-socket IPC, plus an executable staged local operator workflow with no
  broadcast command.
- Abandoned challenges and unsigned stale authorizations close durably instead of permanently
  consuming the global or per-subject in-flight budget.
- Rejected HTTP responses are actively aborted, and malformed signer output is rejected before it
  can enter the verifier transaction journal.
- `pnpm verify` passes 25 test files and 261 tests, including the attester-specific formatting gate,
  TypeScript, secret scan, all five Clarity contracts, and the production demo build.
- This is the execution plan's safe-floor Rung C. No controlled public test host, outbound-firewall
  evidence, v2 wallet trust cutover, signer provisioning, live signature, or Testnet broadcast was
  performed.
- A real local operator smoke test created and recovered a durable challenge while reading current
  Testnet burn height; the command exposes challenge, verify, sign, and status stages but no
  broadcast action.
- `pnpm testnet:verify` passed against the still-canonical v1 deployment at burn height `3,456`.
  Funding and deployment dry runs remain clean at nonce `0`; all six future recipients still need
  their planned `10 STX`. The August 7 issuance intent is unusable because its short expiry `3,381`
  is now in the past.
- All seven isolated role files remain present at mode `0600`; the signer key/token and transaction
  journal remain absent. `tmutil` reports no configured backup destination, so recovery approval is
  still unproven.

Fresh checks on August 7, 2026:

- Origin `pnpm verify`: passed, including format checks, four Clarity contracts, typecheck, 33 tests,
  and the production demo build.
- Stacks Testnet reset on August 6, invalidating the original disposable fixtures. The canonical
  fixtures were redeployed and re-attested without changing the demo identities.
- Origin `pnpm testnet:verify`: passed at burn height `3018`, confirming four live v1 contracts, two
  claims including their manifest-recorded issue heights, and the unattested
  same-name/different-deployer fixture.
- Leather targeted Origin and packaging suite: 40 of 40 tests passed across evaluator, registry client, network gating, layout, and manifest generation; the complete extension unit suite passes 613 of 613 tests.
- The live Acme/Leather/Testnet three-scenario journey passed against the restored fixtures.
- A fresh production-manifest/testing-runtime extension build and non-broadcasting local storybook capture passed after the follow-up fixes on
  the review-response branch. The rendered views visibly include the complete warning, the
  `Leather Origin Demo` extension label, and both attester and registry Explorer evidence links.

Recorded final-branch evidence:

- Full Leather extension unit suite: 600 tests passed.
- Deterministic browser suite: all five contract-call cases passed.
- Live Acme/Leather/Testnet assertion journey: passed.
- Full screenshot journey, including one approved harmless Testnet broadcast: passed.

Clarinet reports the same three expected permissionless-input analyzer warnings for `subject`,
`issuer-name`, and `role` in both v1 and v2. `contracts/README.md` documents why treating those
fields as intrinsically trusted would violate the design.

## Immediate next actions

1. Review the two local commits and the immutable Testnet/evidence records before publishing Git
   branches. No Git push or upstream PR was performed by this completion run.
2. Rebase the consolidated Leather staging branch onto current upstream `dev`, resolve any new
   upstream drift, and repeat the complete required verification.
3. Open an upstream Leather PR with `leather-review-manifest.md` as the review guide.
4. Before any second domain claim, provision a deployment environment with an independently
   enforced outbound firewall and process/mount isolation; the one-shot Testnet exercise proved
   application-level address rejection and pinned TLS, not an infrastructure firewall boundary.

Stacks Connect standardization and production attester governance remain post-hackathon work rather
than unfinished proof-of-concept requirements.
