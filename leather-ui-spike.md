# Leather Origin UI Spike

Status: Phase 0 insertion-point spike completed locally on August 4, 2026.

## Outcome

The active Leather extension can host an Origin section in its real `stx_callContract` approval flow without replacing or disrupting the existing contract details, fee controls, or post-condition behavior.

This spike intentionally hardcodes one `Known origin` presentation. It validates the approval-surface insertion point and decoded-principal data path only. It is not the finished registry client, trust evaluator, or multi-state UI.

## Source

- Leather checkout: `/Users/alexander/Code/leather-origin-demo`
- Upstream baseline: `leather-io/mono` `dev`
- Baseline commit: `d98bd9a61b2f066041082b85256da9a96519d7b6`
- Local branch: `agent/origin-ui-spike`

## Integration

The Origin section is inserted after the existing contract-call details and before fee and nonce controls:

```text
apps/extension/src/app/pages/rpc-stx-call-contract/rpc-stx-call-contract.tsx
```

The route derives the displayed subject from Leather's decoded transaction options with `formatContractId(contractAddress, contractName)`. The requesting application does not provide the principal or Origin verdict.

The presentational spike component lives at:

```text
apps/extension/src/app/features/rpc-stacks-transaction-request/stacks/origin/origin-details.layout.tsx
```

The design is deliberately quiet and static: a native approval section, a factual status badge, attester attribution, and the full exact principal. There is no animation, ornamental security icon, or combined safety verdict.

## Tests and Verification

Passed after the spike:

- Leather extension unit suite: 88 files, 575 tests.
- Extension lint.
- Extension typecheck.
- Extension unused-export check: zero unused exports.
- Full monorepo formatting: 25 of 25 tasks.
- Full monorepo typecheck: 22 of 22 tasks.
- Testing extension build.
- Chromium Playwright contract-call suite: 3 of 3 tests.

The Chromium integration suite loads the built Manifest V3 extension and passes all three existing contract-call modes. The new Origin assertions confirm that `Known origin`, `Acme`, and the exact decoded principal `SP000000000000000000002Q6VF78.bns` render in the no-post-conditions case. The explicit-post-conditions and warning-mode cases remain regression coverage but do not yet assert Origin content.

## Accepted Baseline Debt

The root `pnpm lint` and `pnpm knip` commands remain red for issues outside the extension and unchanged by this branch:

- Four existing `apps/web` lint errors.
- Eleven unused files under `tools/src`.
- The existing unused `commander` dependency in `tools/package.json`.

The extension-scoped lint, typecheck, tests, build, and unused-export checks all pass. Existing webpack export and bundle-size warnings remain documented in [Leather Local Baseline](leather-baseline.md).

## Next Step

Replace the hardcoded status with a pure four-verdict evaluator and deterministic test fixtures before adding network reads. Model its output as a discriminated union whose unrecognized-claim variant has no organization display-name field, while lookup availability and lookalike detection remain separate signals. The UI must use neutral styling and explicit safety-limitation copy for known origin, retain the exact principal, remain neutral when lookups fail, and keep post-condition asset warnings independent of Origin.
