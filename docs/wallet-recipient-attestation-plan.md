# Origin Wallet-Recipient Attestation Plan

Date: 2026-08-10

## Decision summary

Origin can recognize standard Stacks account principals without replacing or redeploying the
v2 registry. The registry key and getter already accept Clarity `principal` values, and the
Simnet suite already proves that a standard account can be an attestation subject.

The recommended first increment is narrower than “find every recipient in every transaction”:

1. Recognize the exact recipient of native STX token-transfer payloads.
2. Cover both Leather's typed `stx_transferStx` route and token-transfer payloads supplied through
   `stx_signTransaction`.
3. Derive the subject from the final transaction payload that Leather displays and signs.
4. Reuse the current Origin registry client, evaluator, trusted-attester policy, and lifecycle
   rules.
5. Add recipient-specific presentation copy; do not describe an account recipient as a published
   contract.
6. Add SIP-10 and SIP-9 recipient recognition later, but only for the standardized transfer
   methods whose argument positions Leather constructs and validates itself.

This gives the product a defensible claim: Origin can identify the exact Stacks principal receiving
a direct transfer. It does not claim to discover every eventual beneficiary of arbitrary contract
execution.

## What “wallet recognition” means here

In this plan, “wallet” means a standard Stacks account principal such as `SP…` or `ST…`, not the
Leather application itself and not a Bitcoin address.

The primary subject is the recipient, because the sender is already the account the user selected
inside Leather. The recipient is the externally supplied party whose identity the user needs to
evaluate before approving a payment.

Origin continues to answer one narrow question:

> Who does a Leather-recognized attester say controls or operates this exact recipient principal?

It does not prove that:

- the transfer is safe or intended;
- the organization is solvent, lawful, or trustworthy;
- an address will remain the organization's preferred recipient;
- a token contract will actually deliver assets to the argument presented as a recipient; or
- a name supplied by a dapp is accurate.

## Research findings

### The registry already supports account subjects

`origin-registry-v2.clar` stores attestations under:

```text
{ attester: principal, subject: principal }
```

No contract-only discriminator exists in the key or getter. The current test
`accepts a standard wallet principal as subject` exercises issuance and lookup with
`Cl.principal(walletSubject)`.

Result: **no new registry contract, schema version, or Testnet registry deployment is required.**

### Native STX transfers contain an exact consensus recipient

Stacks Core defines a token-transfer payload as:

```rust
TokenTransfer(PrincipalData, u64, TokenTransferMemo)
```

The principal, amount, and memo are serialized directly into the transaction payload. Leather can
therefore derive the Origin subject from the transaction it will sign instead of trusting a dapp
label. This is the account-recipient equivalent of deriving a contract call's exact
`address.contract-name` target.

The payload accepts `PrincipalData`, so the recipient may be either a standard account or a
contract principal. The presentation context should still be “recipient”; the principal parser can
classify the underlying subject when needed.

### The existing Leather Origin core is mostly reusable

`useOriginEvaluation(subject, network)` accepts a string subject. The registry client queries the
configured attesters for that exact subject, and `evaluateOrigin` already handles trusted,
unrecognized, expired, revoked, unknown, loading, and unavailable states.

The current lookalike heuristic naturally returns no warning for a standard account because it
requires a contract principal with a contract name. That behavior should remain explicit in tests.

The main non-reusable part is presentation copy. The current layout repeatedly says “contract,”
“published,” or “deployer.” Recipient recognition needs account-aware language.

### Transaction coverage is not one uniform problem

| Leather flow                                      | Recipient source                                  | Recommended treatment                |
| ------------------------------------------------- | ------------------------------------------------- | ------------------------------------ |
| `stx_transferStx`                                 | Native token-transfer payload recipient           | MVP                                  |
| `stx_signTransaction` with token-transfer payload | Deserialized native payload recipient             | MVP; avoids a bypass                 |
| Leather's internal STX send flow                  | Wallet-constructed token-transfer payload         | Next increment                       |
| `stx_transferSip10Ft`                             | Standard SIP-10 `transfer` recipient argument     | Phase 2                              |
| `stx_transferSip9Nft`                             | Standard SIP-9 transfer recipient argument        | Phase 2                              |
| Arbitrary `stx_callContract`                      | Semantics depend on the called function           | Do not infer a recipient generically |
| Bitcoin transfers and PSBTs                       | Bitcoin scripts/addresses, not Clarity principals | Out of scope for this registry       |

SIP-10 standardizes a `transfer` function whose third logical argument is a `principal`, which makes
that method a reasonable later integration. Arbitrary contract functions may contain several
principals with unrelated meanings, so searching their arguments would create false identity
assurances.

### BNS is display context, not the attestation subject

If a local send begins with a BNS name, Leather should resolve it normally, retain the BNS name as
separate context, and query Origin using the exact resolved principal in the transaction. A BNS
name must not be substituted for the attested subject, and a BNS label must not upgrade an unknown
Origin result.

## Proposed product behavior

### Known recipient

Show:

- **Known recipient**
- trusted issuer name;
- account-oriented role such as `Treasury wallet`, `Payments wallet`, or `Operational wallet`;
- recognized attester name and Explorer link;
- the exact recipient principal; and
- a disclaimer that identity does not guarantee that the recipient is intended or the transfer is
  safe.

### Unrecognized identity claim

Show that a claim exists and show its attester principal, but quarantine its issuer name and role.
The requesting dapp must not be able to place attacker-chosen brand text in trusted Leather chrome.

### Unknown recipient

State that Leather found no trusted identity attestation for the exact recipient. Keep this neutral:
most account addresses will initially have no claim, and absence alone is not a warning.

### Expired or revoked

Reuse the current no-longer-valid state with account-aware wording. The prior name may be shown only
because the claim was issued by a trusted attester during its valid policy interval.

### Lookup unavailable

State that Leather could not check recipient identity. Never preserve or infer a previous known
verdict after lookup failure.

### No address lookalike verdict

Standard account principals have no contract-name component. The contract lookalike heuristic must
not run for them. BNS similarity or address-book impersonation would be a separate feature with a
separate data source and warning model.

## Leather implementation design

### 1. Make presentation context explicit

Keep provenance evaluation independent of React and transaction type. Add a presentation context,
for example:

```ts
type OriginPresentationContext = "contract-target" | "transfer-recipient";
```

Pass it to the layout, not the registry evaluator. Parameterize the existing hardcoded nouns and
sentences instead of cloning the evaluation or lookup stack.

Suggested copy mapping:

| Current contract copy                          | Recipient copy                                  |
| ---------------------------------------------- | ----------------------------------------------- |
| Known origin                                   | Known recipient                                 |
| This contract carries an identity claim…       | This recipient carries an identity claim…       |
| No trusted attestation for this exact contract | No trusted attestation for this exact recipient |
| Checking who published this contract           | Checking who controls this recipient            |
| Could not check who published this contract    | Could not check this recipient's identity       |
| Contract or transaction is safe                | Recipient is intended or transfer is safe       |

Do not change the evaluator's stable verdict names merely to change UI nouns.

### 2. Derive the subject from the transaction object

Create a small pure helper for native transfer payloads:

```text
deriveOriginRecipient(transaction)
  -> exact PrincipalData string for TokenTransfer
  -> null for every other payload
```

Use the final constructed/deserialized transaction, not only `rpcRequest.params.recipient`. The
same derived value must feed:

- the visible recipient address;
- the Origin lookup;
- the transaction that is signed; and
- the E2E assertion.

This makes payload/UI divergence testable and preserves the existing rule that the application
cannot supply an Origin subject independently.

### 3. Integrate the typed STX-transfer route

In `RpcStxTransferStx`:

1. obtain the exact recipient from the constructed transfer transaction/options;
2. call `useOriginEvaluation(recipient, network)`;
3. render the context-aware Origin layout directly after `TransactionRecipientsLayout`; and
4. leave amount, memo, fees, compliance checks, and approval behavior unchanged.

### 4. Integrate serialized token-transfer requests

In `RpcStxSignTransaction`, when `isTokenTransferPayload` is true:

1. derive the recipient from `unsignedTxForBroadcast.payload`;
2. run the same Origin lookup; and
3. render the same recipient presentation.

This route is required for honest native-transfer coverage. Supporting only `stx_transferStx` would
let another supported request method reach the same signing boundary without recipient
recognition.

### 5. Add the internal send flow

After RPC coverage is stable, add the same component to Leather's own STX send confirmation. Query
the resolved exact principal, not the user's BNS input. This should reuse the same helper and
presentation component rather than a third evaluation path.

### 6. Add standardized token transfers carefully

For SIP-10 and SIP-9 routes, derive the recipient from the exact standardized transaction arguments
Leather constructs. Validate the contract/function layout and argument type before presenting a
recipient verdict. Continue showing contract provenance for the token contract separately if that
signal is enabled.

This can legitimately produce two independent identity sections:

- provenance of the token contract being called; and
- identity of the account receiving the asset.

Neither result may upgrade, suppress, or merge into the other.

## Attestation issuance design

### Demo fixture

For a bounded Testnet demonstration:

1. generate a dedicated fictional standard-principal recipient fixture;
2. use a role such as `Treasury wallet`;
3. issue one short-lived claim from the existing canonical trusted attester;
4. record the principal, request ID, issuance transaction, burn height, and expiry in the fixture
   manifest; and
5. add one unrecognized-attester account claim or one unknown account recipient only if the demo
   needs the same three-way contrast.

Do not reuse a personal address or a wallet that holds meaningful assets. Do not mutate the current
contract demo claims.

### Automated domain-control attester

The current domain attester is contract-specific. It requires a contract principal, derives its
deployer, uses contract-only roles, and verifies a `deployerSignature`. It should not be loosened by
silently treating an arbitrary account as a “deployer.”

Add a separately versioned account-control authorization with these semantics:

- subject must be a standard Stacks principal;
- proof binds domain, exact subject, intended attester, request ID, nonce, policy version, role,
  issuance time, proof expiry, and claim expiry;
- a single-signature account proves control with an Origin-specific SIP-018 structured signature;
- recovered signer address must exactly equal the subject;
- allowed roles are account-oriented and fixed by policy;
- issuer name remains the canonical proven domain;
- signer IPC accepts a distinct authorization type and derives the registry call itself; and
- account claims use a shorter maximum lifetime than relatively stable deployed-contract claims.

Suggested verification method name:

```text
https-sip018-account-control
```

Suggested roles:

- `Treasury wallet`
- `Payments wallet`
- `Operational wallet`

Domain control proves that the domain operator and address controller jointly approved the
relationship. It does not establish a legal entity identity unless a different trusted attester
performs that additional verification.

### Multisig boundary

An RSV signature recovered to a single public key is not a general proof of control for every
standard principal. Multisig accounts require their own proof path. The safe first policy is:

- support single-signature standard principals whose recovered address exactly equals the subject;
- fail closed for unsupported hash modes; and
- design multisig support around a fully authorized Stacks transaction or another proof that
  validates the account's complete spending condition.

Do not label a one-key signature as control of an M-of-N account.

### Claim lifetime and rotation

Operational recipient accounts may rotate more often than deployed contracts. Either:

1. add subject-kind-specific maximum lifetimes to the trusted-attester compatibility object; or
2. use a distinct attester policy/principal for account claims with a shorter existing lifetime cap.

The first option is cleaner but changes the compatibility-object schema. In both cases, the
isolated signer and Leather must independently enforce the account lifetime bound. Revocation and
replacement continue to use registry v2 unchanged.

## Security and privacy invariants

- The Origin subject comes from the final transaction payload, never a dapp-supplied identity field.
- The exact recipient stays visible even when a trusted name is shown.
- Unrecognized claims cannot expose their issuer name or role in trusted wallet chrome.
- Origin failure is neutral/unavailable and never falls back to known.
- Compliance screening, amount, memo, fees, post-conditions, simulation, and recipient identity
  remain separate signals.
- A known recipient never triggers automatic approval or suppresses an asset warning.
- Network and chain ID must match the pinned Origin compatibility object.
- Cache keys include compatibility version, registry, network endpoint, and exact subject.
- A lookup leaks the queried recipient to the configured Stacks API before signing; document this
  privacy surface and avoid adding third-party identity APIs to the approval path.
- Never query Bitcoin addresses against a registry whose canonical subject is a Clarity principal.
- BNS labels and dapp-supplied memos cannot affect the Origin verdict.

## Test plan

### Registry

The required standard-principal issuance test already exists. Retain it as a release gate. No new
contract behavior should be added for the wallet-recipient MVP.

### Pure evaluation

Add account subjects for:

- trusted active claim;
- trusted expired claim;
- trusted revoked claim;
- active claim from an unrecognized attester;
- no claim;
- unavailable and loading lookups; and
- confirmation that account subjects never receive the contract lookalike warning.

### Subject derivation

Prove that:

- a token-transfer payload returns its exact consensus recipient;
- standard and contract-principal recipients round-trip correctly;
- every non-token-transfer payload returns `null`;
- displayed, queried, and signed recipient values are identical; and
- malformed or wrong-network values fail before Origin evaluation.

### UI

Test all account-aware strings and ensure contract wording is absent from recipient mode. Verify
that the exact principal remains visible and that unrecognized claim text is quarantined.

### Route integration

Cover:

- `stx_transferStx` known, unknown, unrecognized, expired/revoked, and unavailable states;
- `stx_signTransaction` containing a token-transfer payload;
- independence from amount, memo, fee editing, sponsorship, and compliance status;
- Testnet-only enablement under the current compatibility policy; and
- no query on unsupported networks.

### Attester

For the later automated account proof, add wrong-subject signer, unsupported multisig, altered
domain/role/attester/expiry, replay, stale challenge, renewal, SSRF, signer-policy, nonce-recovery,
and exact-bytes broadcast cases before any live issuance.

### End to end

Add a mock-site “Pay treasury” request using a tiny Testnet amount. The installed extension test
must assert the exact recipient address, trusted attester, account role, and independent amount
display. The automated test and recorded demo should close the popup without broadcasting the
payment.

## Phased delivery plan

### Phase 0 — Freeze the product contract (half day)

- Approve recipient-specific wording.
- Choose one fictional standard-principal fixture and role.
- Decide whether the demo needs only a known recipient or a three-state recipient set.
- Record the no-registry-migration decision.

### Phase 1 — Native STX recipient recognition (one to two engineering days)

- Add the pure token-transfer recipient derivation helper.
- Parameterize the Origin presentation for contract target versus transfer recipient.
- Integrate `stx_transferStx`.
- Integrate token-transfer payloads in `stx_signTransaction`.
- Add evaluator, UI, hook, and route tests.

### Phase 2 — Demo fixture and end-to-end proof (one day, plus confirmation time)

- Prepare a reviewed Testnet issuance packet for the new account subject.
- Issue the bounded claim only after explicit external-write approval.
- Extend the public fixture manifest and evidence page.
- Add the applicant transfer scenario and installed-extension journey.
- Rehearse with no transfer broadcast.

### Phase 3 — Leather internal send (one engineering day)

- Apply the same recognition to the local STX send confirmation.
- Resolve BNS first and evaluate only the exact resolved transaction recipient.
- Add local-send and BNS separation tests.

### Phase 4 — SIP-10 and SIP-9 recipient recognition (two to three engineering days)

- Add standardized transfer-subject derivation.
- Present token-contract provenance and recipient identity as separate signals.
- Cover malformed/nonstandard function layouts and multi-signal UI behavior.

### Phase 5 — Production-quality account-control issuance (three to five engineering days)

- Specify and implement the versioned SIP-018 account-control proof.
- Add account roles and shorter signer-enforced lifetime policy.
- Add single-signature support with exact address recovery.
- Explicitly reject unsupported multisig until a full spending-condition proof exists.
- Run the complete adversarial attester suite and a separately approved Testnet exercise.

These estimates assume the current Origin and Leather branches remain the baseline and exclude
upstream review time. A credible hackathon extension is Phases 0–2. A production proposal should
not claim general wallet-account attestation until Phase 5's proof and lifecycle policy are done.

## Acceptance criteria for the first increment

The increment is complete when:

1. both supported native-transfer request routes derive the same exact recipient that is serialized
   in the transaction;
2. Leather renders known, unrecognized, unknown, no-longer-valid, loading, and unavailable states
   with recipient-specific language;
3. the raw recipient principal, amount, memo, fees, and independent wallet warnings remain visible;
4. no dapp-supplied name, role, attester, or verdict can affect the result;
5. standard account subjects never receive the contract lookalike heuristic;
6. the existing contract-call Origin experience remains byte-for-byte equivalent in behavior;
7. deterministic unit/integration tests and one installed-extension Testnet journey pass; and
8. no STX transfer is broadcast by the test or recorded demonstration.

## Primary references

- [Origin registry v2](../contracts/origin-registry-v2.clar)
- [Origin registry v2 standard-principal test](../tests/origin-registry-v2.test.ts)
- [Origin hackathon plan](../origin-hackathon-plan.md)
- [Stacks transaction types and account model](https://docs.stacks.co/learn/network-fundamentals/technical-specifications)
- [Stacks transaction lifecycle and payload classes](https://docs.stacks.co/learn/transactions/how-transactions-work)
- [Stacks Core `TransactionPayload` definition](https://github.com/stacks-network/stacks-core/blob/c2990a7fe36658f5de790dd618058532e8ba618d/stackslib/src/chainstate/stacks/mod.rs#L909)
- [Stacks Core token-transfer serialization](https://github.com/stacks-network/stacks-core/blob/c2990a7fe36658f5de790dd618058532e8ba618d/stackslib/src/chainstate/stacks/transaction.rs#L192)
- [Stacks Connect wallet implementation methods](https://docs.stacks.co/stacks-connect/wallet-implementation)
- [Stacks Connect transaction requests](https://docs.stacks.co/stacks-connect/broadcast-transactions)
- [SIP-010 fungible-token transfer signature](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md)
- [BNS concepts and ownership](https://docs.stacks.co/learn/network-fundamentals/bitcoin-name-system)
