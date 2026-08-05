# Leather Integration Review Manifest

## Review target

The Origin extension implementation is a local branch because this workspace has no authorized writable Leather fork.

| Item        | Value                                                           |
| ----------- | --------------------------------------------------------------- |
| Repository  | `/Users/alexander/Code/leather-origin-demo`                     |
| Branch      | `agent/origin-three-scenario-flow`                              |
| Base        | `d98bd9a61` (`leather-io/mono` development baseline)            |
| Head        | `2f2dcaf02` (fresh mock-site connection and live scenario test) |
| Review diff | `git diff d98bd9a61..2f2dcaf02`                                 |

The range changes 12 extension files: 1,462 insertions and 49 deletions. It does not modify signing, transaction serialization, broadcast, key management, or account state.

## Commit sequence

1. `7890ed4e1` — approval-surface spike
2. `3e5d9bba7` — pure provenance evaluator and model
3. `dc74d9776` — state-driven approval UI
4. `2675a3142` — live Testnet registry client
5. `ddee4f3e2` — deterministic three-scenario browser coverage
6. `102da3e86` — opt-in live mock-dapp browser flow
7. `2f2dcaf02` — fresh-site Leather connection in the live flow

## Security review questions

### Wallet-owned subject

- Does the integration derive the contract principal exclusively from Leather's decoded transaction payload?
- Can requesting-site metadata influence the displayed subject, attester policy, canonical contract set, or verdict?
- Is the exact principal always visible without truncation?

### Type-level quarantine

- Does the `unrecognized-claim` evaluator variant omit organization and role fields entirely?
- Can any attacker-selected `issuer-name` or `role` reach the default unrecognized UI through another type or fallback path?
- Do both component and browser tests assert that `Definitely Acme` and `Official contract` never render?

### Fail-neutral registry reads

- Do timeout, HTTP, malformed Clarity value, and unexpected response paths resolve to `unavailable`, never `known`?
- Is a trusted attestation checked for subject equality, revocation, and burn-height expiry before its identity text renders?
- Can one attester overwrite or satisfy another attester's namespace?

### Independent safety signals

- Does Origin leave Leather's post-condition summary and Allow-mode warning intact?
- Does Known origin avoid success-green styling and state explicitly that identity does not guarantee safety?
- Is the same-name/different-deployer result labeled as a heuristic instead of an identity or safety verdict?

## Files by responsibility

- Model and pure evaluation: `origin.models.ts`, `evaluate-origin.ts`
- Registry boundary: `origin-registry-client.ts`, `origin-testnet.config.ts`
- Async composition: `use-origin-evaluation.ts`
- Approval UI: `origin-details.layout.tsx`, `rpc-stx-call-contract.tsx`
- Unit and component coverage: `*.spec.ts`, `*.spec.tsx` in the Origin feature directory
- Browser coverage: `rpc-stx-call-contract.spec.ts`, `origin-mock-dapp.spec.ts`

All paths above are under `apps/extension/src/app/features/rpc-stacks-transaction-request/stacks/origin/` except the approval-page integration and browser tests.

## Verification evidence

Run with Node 22 from the Leather repository.

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm lint
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm typecheck
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension lint
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension typecheck
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension check-for-unused-exports
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension test:unit src/app/features/rpc-stacks-transaction-request/stacks/origin/origin-registry-client.spec.ts
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension build:ext:test
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension test:integration tests/specs/rpc-sip30-requests/rpc-stx-call-contract.spec.ts --project=chromium
```

The final deterministic browser run passed all five cases. The opt-in fresh-site run against the local mock dapp and live Testnet registry passed connection plus all three provenance states in 13.5 seconds.

Root lint retains four documented pre-existing `apps/web` failures, and root Knip retains its baseline unused `tools` findings. Extension lint, typecheck, unused-export checks, the targeted registry test, both builds, and the Origin browser suites pass.
