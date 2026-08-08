# Origin Project Status

- **As of:** August 8, 2026
- **Canonical repository:** `https://github.com/huth-stacks/origin`
- **Product state:** complete hackathon proof of concept, reviewed v2 cutover foundation, locally verified Testnet profile/explorer, and safe-floor Day 3 domain-attester implementation; the historical pre-signing packet has expired and requires replacement; coordinated Testnet cutover, controlled public domain, egress proof, and live issuance pending; not integrated into upstream Leather

This file is the current handoff record. Product decisions remain canonical in
`origin-hackathon-plan.md`; operational instructions remain canonical in `demo-runbook.md`.

## Repository topology

Origin is one project with two intentionally separate Git repositories:

| Responsibility                                                                                                   | Repository and local checkout                                                                                                 | Current review target                                                            |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Product plan, Clarity registry, Testnet fixtures, Acme demo, deployment notes, and cross-repository coordination | `huth-stacks/origin` at `/Users/alexander/Code/contract-provenance-certificate`                                               | `agent/four-day-foundation`, based on `main` at `b602551`                        |
| Leather lookup, evaluator, approval UX, and extension tests                                                      | `huth-stacks/leather-origin-demo` at `/Users/alexander/Code/leather-origin-demo`, with `leather-io/mono` retained as upstream | `agent/four-day-foundation` at `9c48792b5`, based on fork staging at `64a1353c6` |

Leather remains separate because it is an upstream product monorepo. Vendoring its source here
would obscure the review boundary and make future rebases harder. This repository consolidates the
project through pinned commits, manifests, runbooks, and links instead.

The archived `/Users/alexander/Code/leather-extension-archive` checkout is reference-only and is
not part of the active project.

## What is implemented

- A permissionless Clarity 5 registry keyed by `{ attester, subject }`, with issuance,
  replacement, revocation, and burn-block expiration.
- Four live Testnet contracts: one registry and three harmless state-only target fixtures.
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
- A local-only domain-control attester policy engine with canonical eTLD+1 challenges, SIP-018
  deployer proofs, DNS-pinned HTTPS fetching, bounded strict JSON, durable SQLite replay and
  recovery state, renewal policy, authenticated signer IPC, and an isolated allowlisted signer.

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
- The live registry remains v1. The v2 contract, isolated-attester rotation, fixture predeployment,
  manifest replacement, and Leather principal updates are one future coordinated Testnet cutover;
  no Tier 1 implementation command has broadcast a transaction.

## Verification snapshot

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

1. Back up and recovery-check all seven isolated seed files without placing seed material in Git or chat.
2. Select a controlled fictional eTLD+1 and a distinct evidence/profile host.
3. Review the pre-signing v2 packet, then separately approve the faucet request, local transaction signing, funding, cutover, and final promotion stages.
4. Provision the distinct public evidence host, then replace the checked-in v1 profile values only
   as part of the reviewed atomic v2 compatibility promotion.
5. Review the local safe-floor implementation and its requirement-to-test map, then demonstrate
   the outbound firewall, pinned TLS connection, filesystem/process isolation, and controlled
   public test host before connecting the verifier to the isolated signing key.
6. Rebase the consolidated Leather staging branch onto current upstream `dev` and run Leather's
   complete required verification.
7. Open an upstream Leather PR with `leather-review-manifest.md` as the review guide.

Stacks Connect standardization and production attester governance remain post-hackathon work rather
than unfinished proof-of-concept requirements.
