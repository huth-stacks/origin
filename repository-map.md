# Repository Map

## Project repository

- GitHub: `https://github.com/huth-stacks/origin`
- Primary local checkout: `/Users/alexander/Code/contract-provenance-certificate`, branch `main`
- Active local worktree: `/Users/alexander/Code/origin-feat-demo-visual`, branch `feat/demo-visual-redesign`
- Design integration: `https://github.com/huth-stacks/origin/pull/11`
- Purpose: product documentation, Clarity contracts, Testnet fixtures, mock site, and cross-repository integration notes

## Active Leather modification target

- Upstream: `https://github.com/leather-io/mono`
- Default branch: `dev`
- Local path: `/Users/alexander/Code/leather-origin-demo`
- Fork: `https://github.com/huth-stacks/leather-origin-demo`
- Active branch: `agent/origin-visual-polish`
- Approver integration: `https://github.com/huth-stacks/leather-origin-demo/pull/1`
- Extension package: `apps/extension`
- Purpose: Origin evaluation, approval UI, and Leather tests

The authenticated `huth-stacks` account has read but not push permission on `leather-io/mono`, so
reviewable changes are published to the `huth-stacks/leather-origin-demo` fork. Retain
`leather-io/mono` as the `origin` upstream remote and the fork as the `huth` remote. Before an
upstream proposal, consolidate the Origin branch stack, rebase onto current upstream `dev`, and run
Leather's complete required verification.

## Archived extension reference

- Upstream: `https://github.com/leather-io/extension`
- Default branch: `dev`
- Local path: `/Users/alexander/Code/leather-extension-archive`
- Status: archived and deprecated
- Purpose: historical reference only; do not modify or build the demo here

## Why Leather is a separate repository

The browser extension lives in `leather-io/mono`, so its integration must remain independently
reviewable against that upstream. Origin consolidates the project through pinned commits and the
Leather review manifest rather than vendoring a copy of Leather. The older `leather-io/extension`
repository remains available only as an archive.

## Future Stacks Connect proposal target

Origin is intended to become a proposed addendum to Stacks Connect after the Leather proof of concept validates the behavior. Stacks.js and Stacks Connect are not hackathon modification targets and do not need additional working clones yet.

The later proposal may extract reusable principal-derivation rules, provenance result types, and the pure evaluator into the appropriate Stacks Labs package. Wallet trust configuration and final UI policy must remain wallet-owned.
