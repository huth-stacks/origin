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

## Demo Target

`origin-demo-target.clar` exposes one harmless state-only action that increments an invocation counter. The Testnet deployment plan will publish this source as three separate fixture principals for known, unrecognized, and lookalike scenarios. The fixture manifest will record the final deployers, contract names, transaction IDs, and burn heights.

## Analyzer Warning

Clarinet's check-checker reports `subject`, `issuer-name`, and `role` as potentially unchecked persisted inputs. This is expected: the registry is deliberately permissionless and attestation text is untrusted until the wallet recognizes the issuing attester. Adding an administrator or pretending the inputs are intrinsically trusted would violate the product's trust model. Clarity still enforces the principal and bounded ASCII types, and Leather never renders display text from unrecognized attesters in trusted chrome.
