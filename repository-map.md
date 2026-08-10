# Repository Map

## Origin

- Repository: <https://github.com/huth-stacks/origin>
- Default branch: `main`
- Live demo: <https://origin-iota-ashy.vercel.app>
- Purpose: Clarity contracts, Testnet fixtures, attester infrastructure, evidence surfaces, and project documentation

## Leather reference integration

- Upstream: <https://github.com/leather-io/mono>
- Upstream default branch: `dev`
- Working fork: `huth-stacks/leather-origin-demo`
- Package: `apps/extension`
- Purpose: exact-principal derivation, registry reads, wallet trust evaluation, approval UI, and integration tests

Leather remains a separate repository so its patch can be reviewed against the active upstream monorepo. Origin records the cross-repository compatibility data in [`deployments/testnet-fixtures.json`](deployments/testnet-fixtures.json) and the review boundary in [`leather-review-manifest.md`](leather-review-manifest.md); it does not vendor extension source.

The older `leather-io/extension` repository is archived and reference-only.

## Future standardization

The proof of concept may inform a Stacks Connect proposal after the wallet behavior has been reviewed. Candidate reusable pieces include exact-principal derivation rules, provenance result types, lifecycle semantics, wallet-owned trust requirements, and safe rendering rules for unrecognized claims.

Applications must not gain the ability to choose attesters, trust policy, or provenance verdicts through that proposal.
