# Origin

Origin is a proposed future Stacks Connect addendum for wallet-side provenance of the exact principal targeted by a transaction. The hackathon proof of concept implements the idea directly in Leather as the first reference integration.

This repository contains the hackathon product plan, demo application, Origin registry contract, Testnet fixtures, and integration notes. Leather source remains in its own repository and is not vendored here.

## Start here

- [Current project status](PROJECT-STATUS.md)
- [Scrollable UX storybook](docs/storybook/index.html)
- [Testnet attester and four-day roadmap](docs/testnet-attester-and-four-day-roadmap.md)
- [Testnet v2 cutover approval packet](docs/testnet-v2-cutover-approval-packet-2026-08-07.md)
- [Domain-control fetch security](docs/domain-control-fetch-security.md)
- [Aggregated review response](docs/review-response-2026-08-07.md)
- [UX exercise plan for August 6, 2026](docs/ux-exercise-2026-08-06.md)
- [Agent project guide](AGENTS.md)
- [Hackathon plan](origin-hackathon-plan.md)
- [Executable demo plan](demo-plan.md)
- [Demo runbook](demo-runbook.md)
- [Leather review manifest](leather-review-manifest.md)
- [Repository map](repository-map.md)
- [Leather baseline](leather-baseline.md)
- [Leather UI spike](leather-ui-spike.md)
- [Clarity contracts](contracts/README.md)
- [Original proposal](contract-provenance-certificate-plan.md)

## Local contract verification

```sh
pnpm install --frozen-lockfile
pnpm verify
```

This checks Clarity formatting and analysis, TypeScript test types, the Origin registry, and the harmless demo target in Clarinet Simnet.

## Live Testnet fixtures

The registry and all three harmless fixture contracts are deployed on Stacks Testnet. Their principals, transaction IDs, confirmation heights, configured attesters, and claim expirations are recorded in [the public fixture manifest](deployments/testnet-fixtures.json).

```sh
pnpm testnet:verify
```

This secret-free check compares every live source file with this checkout, reads both example claims, checks the current burn height against the trusted claim's expiration, and confirms the same-name lookalike has a different deployer and no trusted claim.

Future v2 transaction commands have three explicit modes: the unsuffixed command is a read-only dry run, `:prepare` signs and journals exact bytes locally without network broadcast, and `:broadcast` revalidates and broadcasts only the matching prepared transaction. Do not run a `:prepare` command until the isolated seeds have a verified backup, or a `:broadcast` command until its exact transaction IDs are approved.

## Run the Acme demo

The final Acme redesign was integrated through [Origin PR #11](https://github.com/huth-stacks/origin/pull/11) and is live at [origin-umber-six.vercel.app](https://origin-umber-six.vercel.app). For a review pinned to the exact checkout, build and locally load the Origin Leather extension, then run the Acme demo locally.

Start the current demo from the `feat/demo-visual-redesign` worktree:

```sh
cd /Users/alexander/Code/origin-feat-demo-visual
pnpm demo:dev
```

Open `http://127.0.0.1:4173` in the browser profile running the local extension. On either origin, select **Connect Leather** and approve access to a disposable Stacks Testnet account. Each scenario then sends a normal `stx_callContract` request for one exact deployed Testnet fixture. The transaction request includes no organization name, attester hint, trust policy, canonical-contract hint, or provenance verdict.

## Run the Testnet evidence site

The same local Vite build exposes the attester profile and browser-side claim explorer at:

```text
http://127.0.0.1:4173/evidence
```

The explorer enumerates lifecycle events from the configured registry rather than from the fixture manifest, then reads `get-attestation` directly for current status. Exact subject, attester, and registry-transaction searches are supported. Unrecognized issuer strings are control-stripped, length-capped, never autolinked, and rendered only inside a dominant quarantine treatment. A registry or current-state read failure renders unavailable rather than “no claim.”

The versioned machine profile is available at `/origin-attester-profile.json`. It is explanatory and is tested against the current compatibility record; Leather&rsquo;s bundled configuration remains authoritative. The public evidence hostname and v2 profile values must be promoted only with the reviewed atomic v2 cutover.

## Proof-of-concept boundary

- One Clarity registry contract
- Seven logical attestation fields
- Three harmless contract-call scenarios
- Four provenance verdicts plus an independent lookalike warning
- One active Leather extension integration
- Configured Testnet attesters and a browser-side event index; no application-supplied hints
- A proposal path toward Stacks Connect after the proof of concept, with no Stacks.js or Connect changes during the hackathon

Origin provides provenance, not a security guarantee. Wallet trust policy remains wallet-owned, and Stacks post-conditions remain an independent asset-protection signal.
