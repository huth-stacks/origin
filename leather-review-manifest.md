# Leather Integration Review Manifest

The reference wallet integration is maintained as a separate patch against `leather-io/mono`. Origin does not vendor wallet source or modify signing, transaction serialization, key management, or account state.

## Review target

| Item           | Value                                                |
| -------------- | ---------------------------------------------------- |
| Upstream       | `https://github.com/leather-io/mono`                 |
| Working fork   | `https://github.com/huth-stacks/leather-origin-demo` |
| Branch         | `agent/origin-three-scenario-flow`                   |
| Upstream base  | `d98bd9a61b2f066041082b85256da9a96519d7b6`           |
| Reviewed head  | `e512e99f9273472faeed9be476f415f1b92e406b`           |
| Complete range | 36 files, 2,424 insertions, 57 deletions             |

The fork may remain unavailable to unauthenticated reviewers until its owner explicitly makes it public or opens an upstream proposal. The boundary and verification record here are informational; they are not a substitute for reviewing the wallet patch itself.

## Responsibilities

- Model and pure evaluation: `origin.models.ts`, `evaluate-origin.ts`
- Registry boundary: `origin-registry-client.ts`, `origin-testnet.compatibility.json`
- Async composition: `use-origin-evaluation.ts`
- Approval UI: Origin layout components and `rpc-stx-call-contract.tsx`
- Unit and component coverage: Origin feature `*.spec.ts` and `*.spec.tsx`
- Browser coverage: `rpc-stx-call-contract.spec.ts`, `origin-mock-dapp.spec.ts`, `origin-storybook.spec.ts`

Origin feature files live under:

```text
apps/extension/src/app/features/rpc-stacks-transaction-request/stacks/origin/
```

## Security review questions

### Wallet-owned subject

- Is the subject derived exclusively from Leather's decoded transaction payload?
- Can requesting-site metadata influence subject, attester policy, reference contracts, or verdict?
- Is the exact principal available in the approval surface?

### Unrecognized-data quarantine

- Does the unrecognized result omit organization and role fields from its trusted presentation model?
- Can attacker-selected `issuer-name` or `role` reach the default approval UI through a fallback?
- Do tests prove hostile strings are not promoted?

### Fail-neutral reads

- Do timeout, HTTP, malformed Clarity, and unexpected-response paths produce unavailable rather than known?
- Are subject, attester, validity interval, maximum lifetime, revocation, and burn-height expiry checked?
- Can one attester satisfy or overwrite another attester's namespace?

### Independent signals

- Do post-condition summaries and warnings remain unchanged?
- Does Known origin avoid safety or certification language?
- Is same-name/different-deployer detection presented as a separate heuristic?

## Verification

The final demo branch passed:

- repository formatting;
- full monorepo type checking;
- extension-scoped lint and unused-export checks;
- Origin unit and component suites;
- the production-labeled `Leather Origin Demo` build;
- deterministic browser coverage;
- a live, non-broadcasting three-state Testnet journey; and
- current v2 storybook capture.

The monorepo's four pre-existing `apps/web` lint errors and existing Knip tooling findings remain outside the extension patch. Before an upstream proposal, rebase onto current `leather-io/mono` `dev` and rerun every command required by Leather's root `AGENTS.md`.
