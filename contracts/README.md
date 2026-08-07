# Origin Clarity Contracts

## Registry

`origin-registry.clar` is a permissionless attestation registry with no administrator and no custom signature scheme. The Stacks transaction authenticates `tx-sender`, and every record is namespaced by the composite key:

```clarity
{ attester: principal, subject: principal }
```

The v1 value contains five fields: `issuer-name`, `role`, `issued-at`, `expires-at`, and `revoked`. Together with the key, these are the seven base provenance fields. `issued-at` is derived from `burn-block-height`; callers must supply an `expires-at` strictly greater than the current burn height.

The public surface is intentionally limited to:

- `issue-attestation`
- `revoke-attestation`
- `get-attestation`

Issuance replaces only the sender's record for the exact subject. Revocation changes only the sender's namespace. Both writes emit structured print events and move no assets.

`origin-registry-v2.clar` is the single planned migration bundle and is not the currently deployed registry. Its write guard requires `tx-sender` and `contract-caller` to match, preventing cross-principal writes and user-misattribution through an intermediary. A contract-principal attester can still self-issue through its own public code paths, so the initial wallet trust list is limited to standard-principal attesters. V2 also rejects empty display fields, persists `revoked-at`, and requires an exact 32-byte request ID for every state-changing operation. Request IDs are replay-protected within an attester namespace, stored with current state, and included in events.

The complete v2 ABI is frozen before Testnet deployment:

- `get-schema-version` returns `u2`;
- issue/revoke events contain `version: u2`, the operation request ID, and the complete resulting record;
- error `u400` rejects non-future expiry, `u403` rejects forwarded writes, `u404` reports a missing revoke target, `u409` rejects a consumed request ID, `u422` rejects empty display strings, and `u423` rejects a request ID that is not 32 bytes;
- the map value contains the five non-key base provenance fields plus `revoked-at` and `request-id`;
- reissuing replaces the prior record, sets `revoked` to false, and clears `revoked-at` to `none`;
- revoking an already-revoked record returns `(ok false)` without consuming the proposed request ID or emitting another lifecycle event.

The contract deliberately has no global maximum lifetime because different attesters in a permissionless registry may have different policies. The signer and wallet enforce per-attester lifetime limits. ASCII types and length bounds do not solve control-character or confusable-name display risks; clients and attester policy must contain those strings. V2 also has no permanent tombstone: a valid direct reissue clears revocation. A defect discovered after canonical deployment requires a parameterized successor-contract cutover and wallet interval cap; it cannot mutate the deployed ABI.

`origin-registry-caller.clar` exists only to prove the write guard in Simnet tests and must not be deployed as a fixture.

`origin-domain-proof.clar` is immutable evidence, not an attester. Publishing requires a direct call and inserts each `{deployer, request-id}` only once, preventing forwarded principal misattribution and proof overwrite. Its accepted subject and domain are intentionally untrusted evidence fields; the off-chain verifier must match both against the signed challenge before authorizing issuance.

`get-attestation` intentionally returns stored records even after their expiration height. Every consumer must compare `expires-at` with the current Bitcoin burn block height; the wallet evaluator owns that check. Simnet tests mine through expiration to pin this contract.

Both registry contracts and their two test fixtures pin Clarity 5 to Stacks epoch 3.4 in `Clarinet.toml`; deployment plans must retain that explicit epoch.

## Testnet Accounts

Run `pnpm testnet:accounts` once to create one ignored `settings/testnet-v2-<role>.local.json` credential per cutover role and an ignored `deployments/testnet-v2-accounts.local.json` public-address manifest. The independently seeded roles are registry deployer, canonical attester, network-attached domain attester, unrecognized issuer, proof deployer, lifecycle deployer, and expiry deployer. The command preflights every output and refuses to overwrite any file. Each loader opens only the requested role credential. The existing v1 account files remain untouched. Never commit a `*.local.*` file, and run `pnpm secrets:scan` before committing.

After funding the deployer from the official Testnet faucet, `pnpm testnet:fund-accounts` transfers 10 Testnet STX to each remaining fixture account. These tokens have no real value, but the command writes to Testnet and should only be run for the demo wallet.

`pnpm testnet:fund-accounts`, `pnpm testnet:deploy-fixtures`, and `pnpm testnet:issue-attestations -- --intent-id <reviewed-id> --canonical-expires-at <height> --short-expires-at <height>` are dry-run commands. Their `:broadcast` variants additionally require the explicit broadcast path. An issuance intent ID persists one exact argument set and stable request IDs for safe retries; a renewal or lifecycle reissue requires a new reviewed intent ID. Prepared signed transactions are journaled to ignored local files before network I/O, and deployment preflight checks confirmed source, principal mempool transactions, and the account's possible next nonce. A node rejection remains a failure even if it includes a transaction ID.

The v2 deployment publishes only the new registry, the designed-not-implemented domain-proof fixture, and dedicated lifecycle/expiry fixtures. Existing canonical known, unrecognized, and lookalike subjects are not redeployed. Issuance uses exact operator-supplied expiry integers and includes the canonical, hostile, lifecycle, and short-expiry claims in the reviewed write list.

The public principals, transaction IDs, and confirmation heights live in `deployments/testnet-fixtures.json`. Run `pnpm testnet:verify` without any mnemonic to compare the live contract sources with this checkout, validate both claims, confirm the known claim is current, and prove the lookalike uses the same contract name under a different deployer with no trusted claim.

Stacks Testnet reset on August 6, 2026. The fixture manifest records the replacement deployments from burn height 2,745. The principals stayed stable because the same ignored disposable accounts were reused; every transaction ID and block height changed.

## Demo Target

`origin-demo-target.clar` exposes one harmless state-only action that increments an invocation counter. The Testnet deployment publishes this source as three separate fixture principals for known, unrecognized, and lookalike scenarios. The fixture manifest records the final deployers, contract names, transaction IDs, and burn heights.

## Analyzer Warning

Clarinet's check-checker reports registry `subject`, `issuer-name`, and `role`, plus domain-proof `subject` and `domain`, as potentially unchecked persisted inputs. This is expected: the registry is deliberately permissionless and proof/attestation fields remain untrusted until an attester or wallet applies its independent policy. Adding an administrator or pretending the inputs are intrinsically trusted would violate the product's trust model. Clarity still enforces principal and bounded ASCII types, and Leather never renders display text from unrecognized attesters in trusted chrome.
