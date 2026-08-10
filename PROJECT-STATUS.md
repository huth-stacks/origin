# Origin Project Status

- **As of:** August 10, 2026
- **Repository:** <https://github.com/huth-stacks/origin>
- **State:** reviewed proof of concept on Stacks Testnet
- **Wallet integration:** demonstrated in a separate Leather fork; not proposed or merged upstream
- **Production status:** not production-ready

## Live surfaces

| Surface            | URL                                            | Purpose                                         |
| ------------------ | ---------------------------------------------- | ----------------------------------------------- |
| Applicant          | <https://origin-iota-ashy.vercel.app>          | Three ordinary `stx_callContract` requests      |
| Registry explainer | <https://origin-iota-ashy.vercel.app/registry> | Trust model and live Explorer links             |
| Evidence explorer  | <https://origin-evidence.vercel.app/evidence>  | Attester profile, claims, and lifecycle history |

## Live Testnet anchors

| Role                                | Principal or transaction                                             |
| ----------------------------------- | -------------------------------------------------------------------- |
| Registry                            | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`       |
| Registry deployment                 | `0x8a2c71ba986643dab5a4e992e0edecf5b5c6c4752fdd1cbd9f42f572a8646de3` |
| Canonical attester                  | `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R`                          |
| Domain-control attester             | `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0`                          |
| Demonstration-unrecognized attester | `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ`                          |
| Known subject                       | `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`              |
| Known claim                         | `0xeeaa16f586079c7096433fa77d1496b6816cf294d789c2b84420a81d38279cb6` |

The complete public receipt is [`deployments/testnet-fixtures.json`](deployments/testnet-fixtures.json).

## Implemented

- Permissionless Clarity v2 registry keyed by `{ attester, subject }`.
- Replacement, revocation, expiration, replay protection, and complete lifecycle events.
- Seven live Testnet contracts and five claims, including one bounded domain-control claim.
- Applicant, registry explainer, and evidence explorer.
- Leather evaluator with known, unrecognized, unknown, no-longer-valid, loading, and unavailable states.
- Independent same-name/different-deployer lookalike warning.
- Browser-side event discovery reconciled with authoritative current map state.
- Hardened domain verifier, isolated signer, authenticated IPC, durable nonce/transaction recovery, and exact-bytes broadcaster.
- Public CI, contribution guidance, security policy, architecture documentation, and private vulnerability reporting.

## Verification baseline

The August 10 readiness pass established:

- 29 test files and 294 passing tests;
- Clarity formatting and analysis;
- TypeScript type checking and production demo build;
- secret-hygiene scan;
- live Testnet verification of seven contracts, five claims, and the intended unattested lookalike;
- a non-broadcasting Leather journey through all three provenance states; and
- a regenerated v2 wallet storybook.

Run the current local gate instead of relying on this snapshot:

```sh
pnpm verify
pnpm testnet:verify
```

## Security and operational state

- The domain signer is stopped outside controlled issuance.
- Signer keys, IPC token, databases, journals, account credentials, and recovery material are ignored local state.
- The public repository contains no active credential or encrypted recovery bundle in GitHub Actions variables.
- Security findings should use [private vulnerability reporting](https://github.com/huth-stacks/origin/security/advisories/new).

## Known limits and follow-up

- No production HSM or managed-key custody, signed remote wallet-policy channel, formal availability target, or incident-response operation.
- No upstream Leather proposal or multi-wallet standardization yet.
- Event discovery depends on public Testnet APIs and remains bounded prototype infrastructure.
- Multisig and contract-principal deployer proofs are not implemented.
- Several maintainability targets remain in state/recovery workflows, manifest loading, evidence lookup concurrency, and large demo components; see [`docs/architecture-analysis-2026-08-10.md`](docs/architecture-analysis-2026-08-10.md).
- Repository licensing has not yet been selected by the owner.

Origin demonstrates a narrow provenance primitive. It does not certify identity, legality, source-code quality, transaction intent, or asset safety.
