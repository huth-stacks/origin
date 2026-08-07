# Origin Clarity Contracts

## Registry

`origin-registry.clar` is a permissionless attestation registry with no administrator and no custom signature scheme. The Stacks transaction authenticates `tx-sender`, and every record is namespaced by the composite key:

```clarity
{ attester: principal, subject: principal }
```

The value contains five fields: `issuer-name`, `role`, `issued-at`, `expires-at`, and `revoked`. Together with the key, this is the fixed seven-field logical schema. `issued-at` is derived from `burn-block-height`; callers must supply an `expires-at` strictly greater than the current burn height.

The public surface is intentionally limited to:

- `issue-attestation`
- `revoke-attestation`
- `get-attestation`

Issuance replaces only the sender's record for the exact subject. Revocation changes only the sender's namespace. Both writes emit structured print events and move no assets.

`origin-registry-v2.clar` is the single planned migration bundle and is not the currently deployed registry. Its write guard requires `tx-sender` and `contract-caller` to match, preventing cross-principal writes and user-misattribution through an intermediary. A contract-principal attester can still self-issue through its own public code paths, so the initial wallet trust list is limited to standard-principal attesters. V2 also rejects empty display fields, persists `revoked-at`, and emits full record data for both issuance and revocation so an external event index can reconstruct lifecycle history. Reissuing a claim replaces the prior record, sets `revoked` to false, and clears `revoked-at` to `none`. Revoking an already-revoked record returns `(ok false)` without another event, keeping event ingestion idempotent. `origin-registry-caller.clar` exists only to prove the write guard in Simnet tests and must not be deployed as a fixture.

`get-attestation` intentionally returns stored records even after their expiration height. Every consumer must compare `expires-at` with the current Bitcoin burn block height; the wallet evaluator owns that check. Simnet tests mine through expiration to pin this contract.

Both registry contracts and their two test fixtures pin Clarity 5 to Stacks epoch 3.4 in `Clarinet.toml`; deployment plans must retain that explicit epoch.

## Testnet Accounts

Run `pnpm testnet:accounts` once to create an ignored `settings/Testnet.toml` and an ignored public-address manifest. The command creates four dedicated, disposable Testnet accounts with four independent seed phrases: registry/known-contract deployer, trusted attester, unrecognized issuer, and lookalike deployer. It refuses to overwrite either file. Never commit `settings/Testnet.toml`.

After funding the deployer from the official Testnet faucet, `pnpm testnet:fund-accounts` transfers 10 Testnet STX to each remaining fixture account. These tokens have no real value, but the command writes to Testnet and should only be run for the demo wallet.

Run `pnpm testnet:deploy-fixtures` to publish the registry and all three fixture contracts directly with Stacks.js. The script requires an explicit broadcast flag through the package command, refuses principals that already exist, and treats a node rejection as failure even though rejected responses also contain a transaction ID. After those transactions confirm, `pnpm testnet:issue-attestations` publishes the trusted claim for the reference contract and the deliberately unrecognized claim for the second fixture. The unrecognized record contains attacker-selected display text so the wallet can prove that it never renders that text.

The public principals, transaction IDs, and confirmation heights live in `deployments/testnet-fixtures.json`. Run `pnpm testnet:verify` without any mnemonic to compare the live contract sources with this checkout, validate both claims, confirm the known claim is current, and prove the lookalike uses the same contract name under a different deployer with no trusted claim.

Stacks Testnet reset on August 6, 2026. The fixture manifest records the replacement deployments from burn height 2,745. The principals stayed stable because the same ignored disposable accounts were reused; every transaction ID and block height changed.

## Demo Target

`origin-demo-target.clar` exposes one harmless state-only action that increments an invocation counter. The Testnet deployment publishes this source as three separate fixture principals for known, unrecognized, and lookalike scenarios. The fixture manifest records the final deployers, contract names, transaction IDs, and burn heights.

## Analyzer Warning

Clarinet's check-checker reports `subject`, `issuer-name`, and `role` as potentially unchecked persisted inputs. This is expected: the registry is deliberately permissionless and attestation text is untrusted until the wallet recognizes the issuing attester. Adding an administrator or pretending the inputs are intrinsically trusted would violate the product's trust model. Clarity still enforces the principal and bounded ASCII types, and Leather never renders display text from unrecognized attesters in trusted chrome.
