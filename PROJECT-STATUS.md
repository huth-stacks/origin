# Origin Project Status

- **As of:** August 6, 2026
- **Canonical repository:** `https://github.com/huth-stacks/origin`
- **Product state:** complete hackathon proof of concept; not integrated into upstream Leather

This file is the current handoff record. Product decisions remain canonical in
`origin-hackathon-plan.md`; operational instructions remain canonical in `demo-runbook.md`.

## Repository topology

Origin is one project with two intentionally separate Git repositories:

| Responsibility                                                                                                   | Repository and local checkout                                                                                                                    | Current review target                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Product plan, Clarity registry, Testnet fixtures, Acme demo, deployment notes, and cross-repository coordination | `huth-stacks/origin` at `/Users/alexander/Code/contract-provenance-certificate`; active worktree `/Users/alexander/Code/origin-feat-demo-visual` | `feat/demo-visual-redesign` at `8b9251d`, [PR #11](https://github.com/huth-stacks/origin/pull/11)               |
| Leather lookup, evaluator, approval UX, and extension tests                                                      | `huth-stacks/leather-origin-demo` at `/Users/alexander/Code/leather-origin-demo`, with `leather-io/mono` retained as upstream                    | `agent/origin-visual-polish` at `e6675e94d`, [PR #1](https://github.com/huth-stacks/leather-origin-demo/pull/1) |

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
- Wallet UX for known, unrecognized, unknown, no-longer-valid, loading, and unavailable states.
- An independent same-contract-name/different-deployer lookalike warning.
- Advanced details showing the exact checked principal, attester, block heights, and registry.
- Deterministic unit, component, and browser coverage plus an opt-in live Testnet journey.

The requesting application never supplies the displayed organization, attester policy, canonical
contract, or verdict. Origin establishes provenance claims, not contract or transaction safety.

## Deployment and integration state

- `huth-stacks/origin` `main` contains the registry, Testnet fixtures, original transaction-lab demo,
  and operational documentation through `d31e9b2`.
- Origin PR #11 is the integration unit for the final Acme visual redesign, adversarial-review
  fixes, consolidated handoff, and dated UX plan. Its Vercel checks were green before merge.
- The public deployment may temporarily serve the older transaction-lab UI while Vercel promotes
  the merged Acme build. If its page title is `Origin · Transaction Lab`, use the local Acme demo
  until the production deployment completes.
- The PR #11 Vercel preview is protected by Vercel SSO, so local review remains the unrestricted
  fallback.
- Leather PR #1 is the integration unit for the final native approver-section redesign. It targets
  `agent/origin-three-scenario-flow` in the fork rather than upstream Leather.
- No PR has been opened against `leather-io/mono`.
- The Leather work started at upstream `dev` commit `d98bd9a61`; upstream `dev` is currently four
  commits ahead at `4976c2a75`. Rebase and full verification are required before an upstream PR.

## Verification snapshot

Fresh checks on August 6, 2026:

- Origin `pnpm verify`: passed, including format checks, two Clarity contracts, typecheck, 17 tests,
  and the production demo build.
- Origin `pnpm testnet:verify`: passed at burn height `202852`, confirming four contracts, two claims,
  and the unattested same-name/different-deployer fixture.
- Leather targeted Origin suite: 27 of 27 tests passed across evaluator, registry client, and layout.

Recorded final-branch evidence:

- Full Leather extension unit suite: 600 tests passed.
- Deterministic browser suite: all five contract-call cases passed.
- Live Acme/Leather/Testnet assertion journey: passed.
- Full screenshot journey, including one approved harmless Testnet broadcast: passed.

Clarinet reports three expected permissionless-input analyzer warnings for `subject`, `issuer-name`,
and `role`. `contracts/README.md` documents why treating those fields as intrinsically trusted would
violate the design.

## Working-tree state at handoff

- Origin `main`: clean and synchronized with `origin/main`.
- Origin `feat/demo-visual-redesign`: clean and synchronized with its remote branch before this
  documentation update.
- Leather `agent/origin-visual-polish`: synchronized with its remote branch; `output/` is untracked
  review evidence only and contains no source changes.

## Immediate next actions

1. Run the dated UX review in `docs/ux-exercise-2026-08-06.md`.
2. Resolve any findings in the repository that owns the affected surface.
3. Confirm Origin PR #11 is merged and the Acme build is promoted to the public production URL.
4. Consolidate the Leather branch stack, rebase it onto current upstream `dev`, and run Leather's
   complete required verification.
5. Open an upstream Leather PR with `leather-review-manifest.md` as the review guide.

Stacks Connect standardization, arbitrary claim discovery/indexing, and production attester
governance remain post-hackathon work rather than unfinished proof-of-concept requirements.
