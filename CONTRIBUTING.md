# Contributing to Origin

Origin is a security-sensitive proof of concept. Small, reviewable changes with explicit trust-boundary reasoning are preferred.

## Before you start

Read:

1. [`README.md`](README.md) for the product boundary.
2. [`docs/architecture.md`](docs/architecture.md) for component ownership and data flow.
3. [`SECURITY.md`](SECURITY.md) for the threat model and private reporting path.
4. [`AGENTS.md`](AGENTS.md) if you are using an automated coding agent.

For larger behavioral changes, open an issue first. Provenance, wallet trust, post-conditions, simulation, and lookalike detection must remain independent signals.

## Development setup

Prerequisites:

- Node.js 22
- pnpm 10.33.0 through Corepack
- Clarinet 3.23.1

```sh
git clone https://github.com/huth-stacks/origin.git
cd origin
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Useful focused commands:

```sh
pnpm check          # Clarity analysis
pnpm typecheck      # TypeScript
pnpm test           # Complete test suite
pnpm attester:test  # Domain-attester tests
pnpm demo:dev       # Local applicant, registry, and evidence surfaces
pnpm testnet:verify # Secret-free live Testnet verification
```

## Safety rules

- Never commit seed phrases, private keys, IPC tokens, signer databases, account files, or `.env` files.
- Use disposable Testnet accounts only.
- Treat commands ending in `:broadcast` as network-writing operations.
- Do not run `:prepare` or `:broadcast` as part of ordinary development or CI.
- Preserve the rule that the requesting application cannot choose the wallet's identity or attester policy.
- Treat every registry string as untrusted input until a consumer applies its own policy.
- Keep revocation and expiry checks fail-neutral; errors must never produce Known origin.

## Pull requests

Before opening a pull request:

```sh
pnpm verify
git diff --check
```

Include:

- the problem and trust boundary affected;
- the chosen behavior and alternatives considered;
- tests that fail before and pass after the change;
- any Testnet or browser verification performed; and
- confirmation that no network-writing command was run, or exact transaction IDs if one was explicitly approved.

Use conventional commit messages where practical. Keep unrelated formatting or generated output out of the change.

## Documentation

Update the canonical document instead of adding a contradictory note:

- product and trust decisions: [`origin-hackathon-plan.md`](origin-hackathon-plan.md);
- architecture: [`docs/architecture.md`](docs/architecture.md);
- current implementation status: [`PROJECT-STATUS.md`](PROJECT-STATUS.md);
- demo behavior: [`demo-plan.md`](demo-plan.md); and
- operator steps: [`demo-runbook.md`](demo-runbook.md).

Historical review and execution records are indexed separately in [`docs/README.md`](docs/README.md).
