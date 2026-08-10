# Origin Clarity Contracts

## Canonical registry: v2

[`origin-registry-v2.clar`](origin-registry-v2.clar) is the registry deployed for the current Testnet proof of concept. It is permissionless, has no administrator, and relies on the Stacks transaction to authenticate the attester.

Records are namespaced by:

```clarity
{ attester: principal, subject: principal }
```

One attester can replace or revoke only its own record for an exact subject. Multiple attesters can make independent claims about the same subject without overwriting one another.

### Public interface

- `issue-attestation(subject, issuer-name, role, expires-at, request-id)`
- `revoke-attestation(subject, request-id)`
- `get-attestation(attester, subject)`
- `get-schema-version()` → `u2`

### Record and lifecycle behavior

The stored value contains:

- bounded non-empty `issuer-name` and `role` strings;
- chain-derived `issued-at` burn height;
- caller-supplied absolute `expires-at` burn height;
- `revoked` and optional `revoked-at` state; and
- an exact 32-byte request ID.

Request IDs are replay-protected within an attester namespace. Issue and revoke calls emit complete versioned lifecycle events. Reissuance replaces the prior record, clears revocation state, and requires a new request ID. Repeating an already-complete revocation returns `(ok false)` without consuming the proposed request ID or emitting another event.

The write guard requires `tx-sender` to equal `contract-caller`, preventing an intermediary contract from attributing its write to a user. [`origin-registry-caller.clar`](origin-registry-caller.clar) exists only to test this rule in Simnet and is not deployed as a fixture.

The registry intentionally has no global maximum claim lifetime. Attesters and wallets enforce different lifetime policies. `get-attestation` also intentionally returns expired and revoked records so each consumer can evaluate lifecycle state against the current Bitcoin burn height.

### Errors

|   Code | Meaning                                          |
| -----: | ------------------------------------------------ |
| `u400` | Expiry is not in the future                      |
| `u403` | Forwarded write (`tx-sender != contract-caller`) |
| `u404` | Revoke target does not exist                     |
| `u409` | Request ID already consumed by this attester     |
| `u422` | Empty display field                              |
| `u423` | Request ID is not exactly 32 bytes               |

## Supporting contracts

### `origin-demo-target.clar`

A harmless state-only fixture. `record-demo-action()` increments an invocation counter and moves no assets. The same source is deployed under separate principals for the known, unrecognized, lookalike, lifecycle, and expiry scenarios.

### `origin-domain-proof.clar`

Immutable public evidence used by the domain-control prototype. A direct caller can publish one `{deployer, request-id}` record. The contract prevents forwarding and overwrite, but its subject and domain fields remain untrusted until the off-chain verifier matches them against the signed challenge.

### `origin-registry.clar`

The original v1 proof-of-concept registry. It remains in the repository for historical tests and migration context but is not the canonical live registry.

## Testnet deployment

The live v2 registry is:

```text
ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2
```

[`deployments/testnet-fixtures.json`](../deployments/testnet-fixtures.json) records the registry deployment, six fixture contracts, three configured attesters, and five claims. Verify the live sources and current state without credentials:

```sh
pnpm testnet:verify
```

## Local verification

All contracts target Clarity 5 and Stacks epoch 3.4 in [`Clarinet.toml`](../Clarinet.toml).

```sh
pnpm check
pnpm test
```

Clarinet's check-checker reports persisted subject and display fields as potentially unchecked input. This is expected: the registry is deliberately permissionless. Principal and bounded ASCII types constrain representation, while attesters and wallets remain responsible for policy, lifecycle evaluation, and safe display. Unrecognized claim strings never enter trusted wallet chrome.

## Network-writing tools

Account creation, funding, deployment, and issuance tooling lives under [`scripts/`](../scripts/). Ordinary commands are dry runs; only explicit `:broadcast` variants write to Testnet. Credentials, signed transaction journals, signer databases, and `*.local.*` files are ignored and must never be committed.
