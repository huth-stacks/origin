# Origin Agent Guide

This repository contains the Origin Stacks Testnet proof of concept: Clarity contracts, attester infrastructure, public evidence surfaces, deployment tooling, and cross-repository documentation for the Leather reference integration.

## Read first

1. [`README.md`](README.md) — public overview, trust model, and setup.
2. [`docs/architecture.md`](docs/architecture.md) — component boundaries and known follow-ups.
3. [`PROJECT-STATUS.md`](PROJECT-STATUS.md) — live deployment and current verification.
4. [`SECURITY.md`](SECURITY.md) — security scope and reporting.
5. [`CONTRIBUTING.md`](CONTRIBUTING.md) — development and pull-request expectations.
6. [`origin-hackathon-plan.md`](origin-hackathon-plan.md) — canonical product and trust decisions.
7. [`demo-plan.md`](demo-plan.md) and [`demo-runbook.md`](demo-runbook.md) — presentation behavior and operation.

When documents disagree, prefer the user's latest instruction, then the product plan, architecture, current status, demo plan, and remaining dated records. Update the canonical document instead of adding a contradictory note.

## Non-negotiable invariants

- Origin establishes provenance claims, not contract safety, transaction safety, legality, or regulatory status.
- Claim existence does not imply that a wallet trusts the attester.
- The wallet derives the exact subject from decoded transaction fields.
- A requesting application must not provide the organization name, attester hint, trust policy, canonical-contract hint, or provenance verdict.
- Wallet trust policy is wallet-owned. The registry is permissionless.
- Treat unrecognized organization and role strings as attacker-controlled input.
- Keep provenance, simulation, post-conditions, and lookalike heuristics independent.
- Registry and network failures are unavailable, never Known origin.
- Always show the exact principal involved.
- Use fictional organizations unless a real organization explicitly approves its name and branding.

## Repository boundaries

This repository owns:

- Clarity registry and fixture contracts;
- domain-control verification, signer, IPC, persistence, and broadcaster code;
- Testnet deployment and recovery tooling;
- the applicant, registry explainer, and evidence explorer;
- the public fixture/compatibility record; and
- product, security, demo, and integration documentation.

The reference Leather modification remains in a separate `huth-stacks/leather-origin-demo` fork of `leather-io/mono`. Do not vendor Leather into this repository. The archived `leather-io/extension` repository is reference-only.

## Implementation shape

```text
application transaction request
  -> wallet derives exact principal
  -> registry client queries configured attesters
  -> pure policy evaluation checks trust and lifecycle
  -> approval UI renders provenance separately from asset protection
```

For contract calls:

```text
subject = contractAddress + "." + contractName
```

Use Bitcoin burn height for claim lifecycle. Use registry events for discovery and `get-attestation` for authoritative current state.

The domain attester must keep the network-facing verifier separate from the key-holding signer. The signer independently enforces policy and burn-height bounds, owns nonce allocation, and must make signed bytes recoverable before committing the nonce. The broadcaster may submit only those exact recovered bytes.

## Safety

- Never read, print, commit, or transmit `.env` files, seed phrases, private keys, IPC tokens, signer databases, or ignored `*.local.*` files unless a user explicitly requests the specific operation.
- Use disposable Testnet accounts only.
- Unsuffixed deployment, funding, and issuance commands are dry runs.
- `:prepare` signs and journals locally; `:broadcast` writes to Testnet. Do not run either without explicit authority.
- Preserve existing ignored local recovery state.
- Do not modify generated build output or unrelated user changes.

## Verification

Run the complete local gate before publishing:

```sh
pnpm verify
git diff --check
```

Use focused tests while iterating. For deployment/configuration changes, also run the secret-free live check:

```sh
pnpm testnet:verify
```

Changes to the separate Leather repository must follow that repository's own `AGENTS.md`, Node version, formatting, lint, typecheck, dependency, and unused-export requirements.

## Working practices

- Prefer deterministic fixtures and pure tests; use live Testnet only for final verification.
- Record public principals, transaction IDs, heights, and attester roles in the fixture manifest.
- Keep commits conventional, small, and reviewable.
- Add tests at the trust boundary being changed.
- Avoid broad refactors in security-critical state, nonce, fetch, IPC, or recovery paths without a failing test that demonstrates the intended behavior.
