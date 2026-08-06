# Leather Integration Review Manifest

## Review target

The Origin extension implementation is published to a writable fork while retaining
`leather-io/mono` as upstream.

| Item                 | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Repository           | `/Users/alexander/Code/leather-origin-demo`                        |
| Fork                 | `https://github.com/huth-stacks/leather-origin-demo`               |
| Branch               | `agent/origin-visual-polish`                                       |
| Upstream base        | `d98bd9a61` (`leather-io/mono` development baseline)               |
| Head                 | `e6675e94d` (final approver redesign and adversarial-review fixes) |
| Complete review diff | `git diff d98bd9a61..e6675e94d`                                    |
| Layered fork review  | `https://github.com/huth-stacks/leather-origin-demo/pull/1`        |

The complete range changes 25 files: 1,840 insertions and 51 deletions. It does not modify signing,
transaction serialization, key management, or account state. The live screenshot journey uses the
existing broadcast path once for the harmless Testnet fixture.

## Commit sequence

1. `7890ed4e1` — approval-surface spike
2. `3e5d9bba7` — pure provenance evaluator and model
3. `dc74d9776` — state-driven approval UI
4. `2675a3142` — live Testnet registry client
5. `ddee4f3e2` — deterministic three-scenario browser coverage
6. `102da3e86` — opt-in live mock-dapp browser flow
7. `2f2dcaf02` — fresh-site Leather connection in the live flow
8. `826686d4b` — native Leather approver-section redesign and advanced details
9. `e6675e94d` — final visual, spacing, attribution, and exact-principal review fixes

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
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm format
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm lint
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm typecheck
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension lint
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension typecheck
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm knip
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension lint:unused-exports
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension test:unit src/app/features/rpc-stacks-transaction-request/stacks/origin
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension build:ext:test
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension test:integration tests/specs/rpc-sip30-requests/rpc-stx-call-contract.spec.ts --project=chromium
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin ORIGIN_DEMO_URL=http://127.0.0.1:4173 pnpm --filter @leather.io/extension test:integration tests/specs/rpc-sip30-requests/origin-mock-dapp.spec.ts --project=chromium
```

The final targeted Origin suite passed 27 tests. The full extension unit suite passed 600 tests. The
deterministic browser run passed all five cases, the Acme assertion journey passed against live
Testnet, and the full screenshot journey passed with one approved harmless Testnet broadcast.

The branch author recorded `pnpm format`, extension lint and typecheck, the full extension test suite,
and unused-export checks as green. Root web-app lint and Knip findings were reproduced identically
without the Origin changes and remain documented baseline failures. Before an upstream PR, rebase
onto current `leather-io/mono` `dev` and rerun every command required by Leather's root `AGENTS.md`.
