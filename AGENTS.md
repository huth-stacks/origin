# Origin Project Guide

This repository is the coordination and implementation home for the Origin hackathon proof of concept. Origin adds wallet-side provenance for the exact Stacks principal targeted by a transaction. The first reference integration is a locally built Leather extension; the longer-term proposal is an addendum to Stacks Connect.

## Read This First

Use these documents in this order:

1. [README](README.md) — project boundary and starting point.
2. [Hackathon product plan](origin-hackathon-plan.md) — canonical product, trust, scope, schema, and UX decisions.
3. [Executable demo plan](demo-plan.md) — demo sequence, data flow, code ownership, delivery phases, and acceptance criteria.
4. [Repository map](repository-map.md) — local checkouts, upstream repositories, and modification boundaries.
5. [Leather baseline](leather-baseline.md) — known-good toolchain, build, tests, runtime smoke test, and pre-existing warnings.
6. [Leather UI spike](leather-ui-spike.md) — completed approval-surface experiment, verification results, and the boundary between the hardcoded spike and real implementation.
7. [Original proposal](contract-provenance-certificate-plan.md) — historical source only. It is intentionally superseded by the smaller hackathon plan and must not silently expand scope.

When documents disagree, prefer this order: the user's latest instruction, `origin-hackathon-plan.md`, `demo-plan.md`, then the remaining references. Update the canonical document when a product decision changes instead of recording contradictory decisions elsewhere.

## Non-Negotiable Product Invariants

- Origin proves provenance claims, not contract safety, transaction safety, legality, or regulatory status.
- A claim's existence is not evidence that Leather trusts its attester.
- Leather derives the exact subject from the decoded transaction. The requesting application must not provide the organization name, attestation verdict, attester hint, trust policy, or canonical-contract hint.
- Wallet trust policy is wallet-owned. The registry is permissionless and does not confer trust.
- Never render attacker-controlled organization names from unrecognized claims in trusted wallet chrome.
- Keep provenance, post-condition asset protection, simulation, and lookalike heuristics as separate signals. None may upgrade, suppress, or soften another.
- Registry failure is neutral or unavailable, never `Known origin`.
- Always show the exact principal involved in the transaction.
- Use fictional demo organizations unless a real organization explicitly approves its name and branding.

## Hackathon Scope Guardrails

Build only what the three contract-call scenarios require:

- One Clarity registry with the fixed seven-field logical attestation schema.
- Three harmless Testnet contract fixtures.
- One trusted mock attester and one configured demonstration-untrusted attester.
- Five provenance UI states, with lookalike detection presented as a separate heuristic.
- One mock site using the normal Leather request path.
- One active Leather extension integration.

Do not add production KYC, attester governance, arbitrary claim discovery, a claim indexer, wallet-recipient demo UI, application-supplied hints, custom signatures, NFTs, assurance levels, multiple schemas, or Stacks.js/Stacks Connect changes during the hackathon. Automated domain control is the plausible bootstrap attester; KYC/KYB providers are an optional future attester class.

## Repository Boundaries

### This repository

Local path: `/Users/alexander/Code/contract-provenance-certificate`

Owns product and demo documentation, Clarity contracts and tests, Testnet deployment fixtures, the mock site, and cross-repository integration notes.

### Active Leather checkout

Local path: `/Users/alexander/Code/leather-origin-demo`

Owns decoded-principal derivation, Origin lookup and evaluation, wallet trust configuration, approval UI, and Leather tests. Before changing it, read its root `AGENTS.md` and follow its formatting, testing, and code-style rules. Work from Leather's `dev` baseline on the local `agent/origin-ui-spike` branch unless the branch strategy is deliberately changed.

The current approval insertion point is:

```text
apps/extension/src/app/pages/rpc-stx-call-contract/rpc-stx-call-contract.tsx
```

### Archived extension checkout

Local path: `/Users/alexander/Code/leather-extension-archive`

Reference only. Do not modify it or build the demo there.

## Implementation Shape

Prefer the smallest architecture that preserves the trust boundary:

```text
mock site request
  -> Leather decodes the transaction target
  -> read-only registry client queries configured attesters
  -> pure evaluator applies trust and lifecycle rules
  -> approval UI renders provenance separately from asset protection
```

Keep the evaluator independent of React and networking. Keep UI components presentational. Do not introduce a new request-protocol field merely to carry Origin data.

For contract calls, derive the subject as:

```text
contract principal = contractAddress + "." + contractName
```

For expiration, use Bitcoin `burn-block-height`.

## Verification

Test proportionally at each boundary:

- Clarity: namespace isolation, same-attester replacement, revocation, expiration, principal types, and no asset movement.
- Evaluator: trusted, untrusted, unknown, no-longer-valid, lookalike, unavailable, and independence from post-condition state.
- UI: approved wording, exact principal, trusted-attester attribution, and quarantine of untrusted brand text.
- Extension: a real `stx_callContract` reaches the approval route and uses the decoded target rather than site metadata.

For Leather commands, use Node 22 explicitly:

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin
```

Run the checks required by Leather's own `AGENTS.md`. Compare failures with [the recorded baseline](leather-baseline.md), and do not attribute documented pre-existing monorepo failures or build warnings to Origin. Any new failure introduced by Origin must be fixed before handoff.

## Working Practices

- Keep hackathon code and pitch honest about what the proof of concept establishes.
- Prefer deterministic fixtures and pure tests; use live Testnet state for the recorded demo.
- Record deployed principals, transaction IDs, burn heights, and attester roles in a fixture manifest.
- Keep secrets, seed phrases, private keys, and local environment files out of Git.
- Do not modify generated build output or vendor Leather source into this repository.
- Preserve unrelated user changes in every checkout.
- Use conventional commits and small, reviewable changes.
- Before publishing Leather changes, create or select a writable fork; retain `leather-io/mono` as upstream.

## Definition of Done

The proof of concept is complete only when all three mock-site scenarios open the locally built Leather extension, Leather derives each exact principal internally, live Testnet Origin state produces the intended provenance result, existing post-condition signals remain independent, and the user can still reject or approve the harmless transaction.
