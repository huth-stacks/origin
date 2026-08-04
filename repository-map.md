# Repository Map

## Project repository

- GitHub target: `huth-stacks/origin`
- Local path: `/Users/alexander/Code/contract-provenance-certificate`
- Purpose: product documentation, Clarity contracts, Testnet fixtures, mock site, and cross-repository integration notes

## Active Leather modification target

- Upstream: `https://github.com/leather-io/mono`
- Default branch: `dev`
- Local path: `/Users/alexander/Code/leather-origin-demo`
- Extension package: `apps/extension`
- Purpose: Origin evaluation, approval UI, and Leather tests

The authenticated `huth-stacks` account has read but not push permission on `leather-io/mono`. Local work should use an `agent/origin-demo` branch. Before publishing Leather changes, create or select an authorized fork and retain `leather-io/mono` as the upstream remote.

## Archived extension reference

- Upstream: `https://github.com/leather-io/extension`
- Default branch: `dev`
- Local path: `/Users/alexander/Code/leather-extension-archive`
- Status: archived and deprecated
- Purpose: historical reference only; do not modify or build the demo here

## Why there are two Leather checkouts

The browser extension now lives in `leather-io/mono`. The older `leather-io/extension` repository remains available only as an archive. The active monorepo is both the Leather clone and the extension codebase for this project.

## Future Stacks Connect proposal target

Origin is intended to become a proposed addendum to Stacks Connect after the Leather proof of concept validates the behavior. Stacks.js and Stacks Connect are not hackathon modification targets and do not need additional working clones yet.

The later proposal may extract reusable principal-derivation rules, provenance result types, and the pure evaluator into the appropriate Stacks Labs package. Wallet trust configuration and final UI policy must remain wallet-owned.
