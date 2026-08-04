# Origin

**Status:** Hackathon product and implementation plan  
**Working name:** Origin  
**Primary ecosystem:** Stacks  
**Primary wallet integration:** Leather  
**Target network:** Stacks Testnet  
**Proposed future home:** Stacks Connect addendum

## 1. Product Summary

Origin lets a wallet identify who a trusted attester says is behind the exact principal targeted by a transaction before the user signs.

A principal may be:

- A Stacks wallet address.
- A Stacks contract principal.

The initial proof of concept will integrate Origin directly into Leather's transaction-confirmation flow. When a mock application requests a contract call through the normal Stacks Connect-compatible request path, Leather will independently inspect the actual transaction target, query Origin attestations, apply its own trusted-attester configuration, and render one of several explicit provenance states.

The broader proposal is a future Stacks Connect addendum for transaction-principal provenance. Leather is the first reference implementation, not the permanent product boundary. The hackathon does not modify Stacks.js or Stacks Connect.

The core product promise is:

> Know who a trusted provider says is behind the exact principal you are about to interact with.

Origin does not claim that a contract, wallet, transaction, or organization is safe.

## 2. Problem

A website can present a transaction as an interaction with a recognized protocol while asking the wallet to call a lookalike or unrelated contract. Similarly, a payment interface can present an address as an organization's treasury or recipient wallet without proving that relationship.

The blockchain can establish the exact principal involved and which principal authorized an on-chain statement. It cannot independently establish that a principal belongs to a named organization.

Today, users generally rely on:

- The website initiating the request.
- Manually published contract-address lists.
- Explorer labels.
- Token lists.
- Wallet-maintained labels and security vendors.
- Visual similarity and brand recognition.

Origin adds an open attestation layer and makes the wallet, rather than the requesting website, responsible for evaluating the result.

## 3. Product Principle

The central distinction is:

```text
A claim exists
      is not the same as
Leather trusts the claim's attester
```

Anyone may issue an Origin attestation. Leather independently determines which attesters it recognizes.

This produces three essential states:

1. **Known origin** — a current attestation exists from a provider Leather trusts.
2. **Unrecognized claim** — an identity claim exists, but its attester is not trusted by Leather.
3. **Unknown origin** — Leather finds no applicable trusted provenance.

Expired and revoked relationships share one **Attestation no longer valid** lifecycle state in the wallet.

## 4. Hackathon Scope

### 4.1 In scope

- One small Clarity attestation registry deployed to Stacks Testnet.
- One mock trusted Origin attester representing either automated domain-control or KYB issuance.
- One mock unrecognized attester.
- Three example Testnet contracts.
- A mock web application that requests harmless transactions.
- A Leather integration that evaluates the actual transaction target.
- Clear known, unrecognized, and unknown provenance UI states.
- Revocation in the demo, with both revocation and expiration enforced by the contract.
- A pluggable attester story: automated domain-control first, with KYC/KYB providers able to join later.
- A concrete proposal for standardizing the proven wallet behavior as a later Stacks Connect addendum.

The scope budget is one registry contract, seven logical attestation fields, five wallet states, and three contract-call scenarios.

### 4.2 Out of scope

- A production KYC workflow.
- Verifier accreditation governance.
- A trust-policy council.
- Multiple assurance levels or jurisdictions.
- Legal or regulatory determinations.
- Audit, solvency, reserve, insurance, or security attestations.
- NFTs or transferable credentials.
- Multiple competing credential schemas.
- Production key rotation and incident-response infrastructure.
- A universal cross-chain identity standard.
- Claims that Origin makes an interaction safe.
- A wallet-recipient transfer demo. The schema remains principal-generic, but the proof of concept covers contract calls only.
- Changes to Stacks.js, Stacks Connect, wallet JSON-RPC methods, or multi-wallet capability negotiation.

## 5. Demo Story

The user visits a mock application that visually presents several interactions as legitimate. Each action creates a harmless Stacks Testnet transaction request.

### Scenario A: Known contract origin

The site requests a call to an example contract attested as an Acme demo contract by the trusted mock Origin attester.

Leather displays:

> **Known origin: Acme**  
> Trusted Test Attester says Acme is responsible for this exact contract.

### Scenario B: Unrecognized identity claim

The site presents another contract as Acme. A provenance claim exists, but it was issued by an attester Leather does not trust.

Leather displays:

> **Unrecognized identity claim**  
> This contract carries an identity claim from a source Leather does not trust.

Leather must not repeat the attacker-supplied organization name in its default trusted chrome. If raw claim details are available behind an advanced disclosure, they must be visually quarantined and labeled as untrusted data.

### Scenario C: Unknown origin with a lookalike signal

The site requests a call to a contract with no applicable attestation. Its contract name matches or closely resembles a contract in the demo's trusted reference set, but its deployer principal differs.

Leather displays:

> **Unknown origin**  
> Leather found no trusted attestation for this exact contract.

When the name/deployer heuristic matches, Leather additionally displays:

> **Potential lookalike contract**  
> This contract's name resembles a known contract, but it was deployed by a different principal.

This is a separate heuristic warning, not an Origin attestation verdict. Extracting the deployer from a Stacks contract principal is free; determining that a name is canonical or brand-significant requires a trusted reference set. The hackathon may use its fixture manifest for that reference set.

## 6. Trust Model

The minimum trust chain is:

```text
Leather trust configuration
        identifies
Trusted attester principal
        attests
Named organization and role
        for
Exact Stacks principal
```

For the proof of concept, Leather will pin both the trusted and demonstration-untrusted Testnet attester principals in local configuration. Only the former belongs to Leather's trust set.

The Origin registry is permissionless and does not determine whether an attester is trustworthy. An on-chain record proves only that the attester principal issued that record.

The wallet determines whether to recognize it.

## 7. Minimal On-Chain Design

### 7.1 Canonical subject

The attestation subject is a Clarity `principal`, allowing the same model to cover:

- Standard wallet principals.
- Contract principals such as `ST...contract-name`.

### 7.2 Attestation record

The proof of concept should keep one fixed seven-field logical schema:

```text
attester         principal, derived from tx-sender
subject          principal
issuer-name      bounded ASCII display string
role             short display string
issued-at        Bitcoin burn block height
expires-at       Bitcoin burn block height
revoked          boolean
```

For the hackathon, a bounded ASCII name remains on-chain for implementation simplicity. Leather renders it only when the attester is trusted. Names from unrecognized attesters are never promoted into the default confirmation UI. There is no issuer principal or metadata commitment until a countersignature or metadata-resolution flow actually consumes one.

The map key should be:

```text
{ attester: principal, subject: principal }
```

The key contains the first two logical fields; the map value contains the remaining five. This prevents one attester from overwriting another attester's record.

### 7.3 Public functions

The initial contract should expose approximately three operations:

```clarity
(issue-attestation ...)
(revoke-attestation ...)
(get-attestation (attester principal) (subject principal))
```

`issue-attestation` and `revoke-attestation` always act within the namespace of `tx-sender`. No separate custom signature scheme is required because the Stacks transaction already authenticates the caller.

The contract should emit structured `print` events for issuance and revocation. Current state remains available through the read-only getter; transaction history provides the historical audit trail.

### 7.4 Discovery

Direct lookup is straightforward because the Testnet build configures both the trusted and demonstration-untrusted attester principals. Leather queries those configured attesters for the transaction subject; the requesting site supplies no attestation hints.

Discovering arbitrary unrecognized claims is an event-indexing problem deliberately left out of the proof of concept. A production design should use event indexing rather than a globally overwritable `subject -> claim` map or an unbounded on-chain list.

## 8. Leather Evaluation

Leather must derive the subject from the transaction it is actually asking the user to approve.

For a contract call:

```text
subject = exact contract principal in the serialized transaction payload
```

Leather must not trust the application to identify the target correctly.

Evaluation sequence:

1. Deserialize and validate the transaction request.
2. Extract the exact target principal.
3. Query Origin for attestations from Leather's trusted attesters.
4. Validate current status, revocation, and expiration.
5. Inspect any claim from the configured demonstration-untrusted attester.
6. Compare an unknown contract's name and deployer against a trusted reference set for an optional lookalike warning.
7. Independently inspect the transaction's post-condition mode and declared asset bounds.
8. Render provenance, asset protection, and heuristic warnings as separate signals.
9. Keep the raw principal visible.

The Origin component should appear near the existing contract summary, before final approval.

### 8.1 Post-conditions are an independent asset guard

Stacks post-conditions are consensus-enforced constraints on asset movements produced by a transaction. If an executed transaction violates them, the entire transaction is rolled back. They can constrain STX, fungible-token, and NFT movements, but they cannot query the Origin registry or prove organization identity, domain control, contract provenance, arbitrary contract state, or a function's intended behavior.

Origin and post-conditions therefore answer different questions:

| Signal | Question answered |
| --- | --- |
| Origin | Who does a trusted attester say controls this exact principal? |
| Post-conditions | What asset outflows will consensus permit this transaction to produce? |
| Simulation | What is this transaction likely to do against current chain state? |

Leather must not combine these into a single safety verdict:

| Origin state | Asset guard | Wallet interpretation |
| --- | --- | --- |
| Known origin | Restrictive post-conditions | Identified and asset-bounded, but not guaranteed safe |
| Known origin | Allow mode | Identified but not comprehensively asset-bounded; retain the warning |
| Unknown origin | Restrictive post-conditions | Unidentified but asset-bounded |
| Unknown origin | Allow mode | Unidentified and weakly bounded; show both concerns |

Implementation rules:

- A known origin must never suppress, soften, or automatically approve an asset-protection warning.
- Strong post-conditions must never upgrade an unknown principal to a known origin.
- Origin attestations must not contain reusable post-condition templates. Asset bounds are properties of a particular transaction, not identity facts.
- Registry `issue` and `revoke` calls should use Deny mode with no post-conditions because they should move no assets.
- State-only example calls should also use Deny mode with no post-conditions.
- Simple asset-moving examples should use Deny mode with explicit, exact or capped user outflow conditions.
- Complex DeFi calls with dynamic internal routing may use Originator mode with explicit originator outflow conditions. This protects unspecified movements from the transaction sender without requiring the request to enumerate every protocol-owned intermediate transfer.
- Allow mode should remain conspicuous regardless of the target's provenance.

Post-conditions constrain assets sent by a principal; they do not generally constrain the destination that receives those assets. UI copy must not claim that a post-condition guarantees a minimum received amount unless the contract's behavior supplies that separate guarantee.

## 9. UI Language

Preferred labels:

- **Known origin**
- **Unrecognized identity claim**
- **Unknown origin**
- **Potential lookalike contract**
- **Attestation no longer valid**

Avoid:

- **Unsigned contract**, because contract deployment and calls are already signed transactions.
- **Safe contract**, because provenance is not security analysis.
- **Verified contract**, because users may infer an audit or endorsement.
- Green success styling for **Known origin**, because users may read it as a recommendation to proceed.
- A generic checkmark without naming the attester and claim.

**Known origin** must use a neutral badge treatment. Reserve semantic warning color for warning and invalid states rather than using success-green for identity provenance.

Every positive result should identify:

- The named organization.
- The exact subject principal.
- The attester Leather trusted.
- The role claimed for that subject.

Claim details may also show the issuance and expiration burn heights. Expiration and revocation determine lifecycle validity.

Expired and revoked records both render as **Attestation no longer valid**. The underlying reason may appear in details, but the proof of concept needs only one lifecycle component. The demo uses revocation because an attester actively withdrawing a claim is the clearer product event.

Unrecognized claims must not display their claimed organization name in the default confirmation surface. The wallet may state that an untrusted identity claim exists, but it must not lend trusted chrome to attacker-selected brand text.

Required limitation copy on the known-origin surface:

> Origin verifies an identity claim from a trusted attester. It does not guarantee that this contract, wallet, or transaction is safe.

## 10. Pluggable Attester Ramp

Origin must not depend on a commercial KYC/KYB provider agreeing to launch a new public credential product. The registry is attester-agnostic and permissionless; different attesters may establish different narrow facts.

### 10.1 Bootstrap path: automated domain control

The first practical attester can be an automated service:

1. An organization publishes a signed file at a well-known HTTPS path such as `/.well-known/stacks-origin.json`.
2. The file names the relevant Stacks wallet or contract principal and role.
3. The service verifies the domain response and the principal-control signature.
4. The service issues an Origin attestation from its own recognized principal.
5. Leather renders the domain as the verified fact and names the domain attester.

This flow is automated, inexpensive, available to pseudonymous teams, and does not imply legal-entity verification.

### 10.2 Optional expansion: KYC/KYB providers

The product pitch may include a higher-assurance provider flow without treating it as a launch dependency:

1. An organization completes KYB with a participating provider.
2. The provider verifies representative authority.
3. The organization proves control of its relevant wallet principal.
4. The organization confirms the exact contract or operational wallet being registered.
5. The provider issues an Origin attestation from its recognized principal.
6. Leather recognizes it because the provider is present in Leather's trust configuration.
7. The provider may later revoke or replace the attestation.

The Testnet demonstration will imitate the final issuance transaction without implementing document collection, human review, or commercial provider onboarding.

### 10.3 Future countersignature

Direct attester-to-subject binding is sufficient for the hackathon because the trusted attester is assumed to have checked control. A production schema may also require the organization's principal to countersign the exact subject relationship. If the organization signs from the contract's deploying principal, Leather can additionally derive and compare the deployment relationship.

## 11. Competitive Landscape

Origin is not the first attestation protocol. The hackathon pitch should acknowledge existing components and focus on the wallet experience.

### 11.1 Closest protocol analogue

[Solana Attestation Service](https://solana.com/docs/tools/attestations/overview) supports permissionless, schema-based, expiring attestations issued by credential authorities and their authorized signers. Its documented use cases include KYC providers binding identity claims to wallets.

The closest documented KYC flow is [Sumsub's SAS integration](https://attest.solana.com/use-cases/sumsub). [Range](https://attest.solana.com/use-cases/range) uses SAS attestations for wallet labels and transaction-risk policies.

No reviewed official source showed Phantom, Backpack, or Solflare rendering SAS trusted-attester provenance for an exact program or recipient during ordinary transaction confirmation.

### 11.2 Closest EVM components

- [Ethereum Attestation Service](https://docs.attest.org/docs/core--concepts/how-eas-works) provides generic schemas and attestations.
- [Coinbase Onchain Verification](https://help.coinbase.com/en/coinbase/getting-started/verify-my-account/onchain-verification) uses EAS for KYC-derived wallet attestations.
- [Verax](https://docs.ver.ax/verax-documentation) and [Sign Protocol](https://docs.sign.global/for-builders/index-1/npm-sdk/usage/attestations) provide other generic attestation registries.
- [MetaMask trust signals](https://support.metamask.io/configure/wallet/security-alerts/) already display verified, warning, malicious, and unknown classifications for tokens, addresses, and websites.
- [Etherscan labels](https://info.etherscan.com/public-name-tags-labels) centrally associate names with addresses and contracts.
- [Sourcify](https://docs.sourcify.dev/docs/intro/) verifies that exact deployed bytecode corresponds to published source, which is code provenance rather than organizational provenance.

### 11.3 Closest UX analogue

[WalletConnect Verify](https://docs.walletconnect.network/wallet-sdk/web/verify) gives wallets `VALID`, `INVALID`, `UNKNOWN`, and scam states for application domains.

Origin applies a similar trust-state model to the exact principal targeted by the transaction rather than only the website that initiated it.

### 11.4 Honest product differentiation

The defensible claim is not:

> The first blockchain attestation registry.

It is:

> Origin brings trusted contract and recipient identity into the Stacks signing screen.

An effective comparative description is:

> WalletConnect Verify for transaction principals, backed by open attestations.

## 12. Stacks and Leather Fit

Stacks gives the proof of concept several useful properties:

- Contracts have exact, human-readable principals combining deployer and contract name.
- Clarity contract source is public and immutable after successful deployment.
- Wallet and contract subjects share the `principal` type.
- Contract calls are signed Stacks transactions with an authenticated origin.
- Clarity maps and read-only functions support a small registry directly.

Leather already deserializes transaction requests and displays the exact contract principal in its approval flow. Origin augments that existing boundary with provenance rather than creating a separate destination application.

### 12.1 Future Stacks Connect addendum

[Stacks Connect](https://docs.stacks.co/reference/stacks.js/stacks-connect/request/request) already transports typed requests such as `stx_callContract` between applications and compatible wallets. Origin should be proposed as a later wallet-side verification addendum to that flow, inspired by [WalletConnect Verify](https://docs.walletconnect.network/wallet-sdk/web/verify) but focused on the exact transaction principal rather than only the requesting domain.

The addendum should standardize:

- How a wallet derives the relevant principal from each decoded Stacks request or serialized transaction.
- A small provenance result model shared across compatible wallets.
- The distinction between an existing claim and a claim from a wallet-recognized attester.
- Lifecycle handling for expiration and revocation.
- The requirement to keep provenance separate from post-conditions, simulation, and security warnings.
- The prohibition on rendering attacker-controlled names from untrusted claims in trusted wallet chrome.
- Neutral behavior when provenance infrastructure is unavailable.

The addendum must not let the application provide the claimed organization, select the attester, supply the wallet's trust configuration, or submit a precomputed provenance verdict. Those remain wallet-derived or wallet-owned inputs.

No new Connect or JSON-RPC field is required for the hackathon. After the Leather proof of concept validates the data model and UX, the reusable evaluator and types may be proposed for extraction into the appropriate Stacks Connect or Stacks.js package.

## 13. Implementation Workstreams

### Workstream A: Contract and tests

- Create a Clarinet project.
- Implement the fixed Origin schema.
- Test independent attester namespaces.
- Test issuance, overwrite by the same attester, expiration, and revocation.
- Test wallet and contract principals as subjects.
- Deploy the registry to Stacks Testnet.

### Workstream B: Testnet fixtures

- Establish trusted and unrecognized Testnet attester accounts.
- Deploy the known-origin example contract.
- Deploy the unrecognized-claim example contract.
- Deploy the unknown-origin example contract.
- Issue the intended Testnet attestations.
- Record all principals, canonical example names, deployers, and transaction IDs in a fixture manifest.

### Workstream C: Mock application

- Build one page containing each demo scenario.
- Make every transaction harmless and clearly reversible or state-only.
- Present the known and lookalike cases with deliberately similar branding.
- Connect through the normal Leather request path.
- Give the core provenance scenarios equally restrictive post-conditions so the demo isolates the identity signal.

### Workstream D: Leather

- Identify the extension transaction-approval insertion point.
- Extract the contract principal from the actual transaction.
- Add a Testnet Origin registry client.
- Add trusted-attester Testnet configuration.
- Implement provenance evaluation.
- Add known, unrecognized, unknown, and no-longer-valid components, plus a separately labeled name/deployer lookalike warning using the trusted Testnet fixture set.
- Present Origin status and post-condition asset protection as separate approval-surface signals.
- Preserve Leather's Allow-mode warning even when Origin recognizes the target.
- Keep behavior neutral if the registry or API is unavailable.

### Workstream E: Demo and pitch

- Record the end-to-end Testnet flow.
- Explain permissionless issuance versus wallet-controlled trust.
- Show the unrecognized-attester case prominently.
- Describe automated domain control as the bootstrap attester and KYC/KYB as an optional future attester class.
- State that production discovery is an event-indexing problem deliberately excluded from the proof of concept.
- Present Leather as the first reference integration and Origin as a candidate future Stacks Connect addendum.
- Make clear that the hackathon validates wallet behavior before proposing shared Stacks.js or Connect code.
- State clearly that provenance is not a security guarantee.

## 14. Suggested Build Order

1. Confirm the Leather extension insertion point with a hardcoded dummy Origin card during the first half-day.
2. Freeze the seven-field Clarity schema and five wallet states.
3. Implement and test the registry locally.
4. Deploy the registry and three example contracts to Testnet.
5. Build a small TypeScript lookup client.
6. Connect the Leather card to live Testnet reads.
7. Build the mock website around the working wallet flow.
8. Add the name/deployer lookalike warning.
9. Polish the demo and pitch.

If the first-half-day spike shows that the extension cannot support the demo cleanly, stop extension work and use a standalone approval-preview page backed by the same lookup client. This preserves a demonstrable proof of concept but does not satisfy the Leather-integration acceptance criterion.

## 15. Acceptance Criteria

The proof of concept is complete when:

- A user can initiate all core scenarios from the mock website.
- Leather derives the exact subject from the real transaction payload.
- Leather reads live Testnet Origin state.
- A trusted attestation produces the known-origin UI.
- An untrusted attestation or claim produces the unrecognized-claim UI.
- No applicable attestation produces the unknown-origin UI.
- The unrecognized-claim UI does not promote the claimant's attacker-controlled display name.
- The lookalike fixture produces a separate name/deployer heuristic warning.
- Origin status and post-condition asset protection are displayed as independent signals.
- A known-origin result never suppresses or weakens an Allow-mode warning.
- Restrictive post-conditions never cause an unknown principal to appear identified.
- The exact principal and trusted attester remain visible.
- Revoked or expired attestations produce the single no-longer-valid state rather than known-origin status.
- The user can still reject or approve the harmless Testnet transaction.
- The pitch presents automated domain control as the bootstrap path and KYC/KYB issuance as optional expansion, neither as implemented production infrastructure.
- The pitch identifies arbitrary production claim discovery as future event-indexing work.
- The pitch distinguishes the direct Leather proof of concept from the later Stacks Connect standardization proposal.

## 16. Resolved Scope Decisions

- The demo covers contract calls only. Wallet principals remain supported by the schema but are not a demo scenario.
- The Testnet build pins both the trusted and demonstration-untrusted attesters. Arbitrary claim discovery is out of scope.
- The implementation targets the Leather extension only. A standalone approval preview is a demo-survival fallback, not a second integration target.
- Stacks.js and Stacks Connect are proposal targets after the hackathon, not current modification targets.
- The hackathon uses direct attester-to-subject binding; organization countersignature is a production extension.
- The hackathon keeps a bounded ASCII name on-chain but renders it only for trusted attesters.
- Expiration uses `burn-block-height`.
- The public demo uses fictional organizations unless the real organization explicitly approves use of its name and branding.

## 17. Working Pitch

> A website can tell you that a transaction is going to Acme. Origin lets Leather check who a trusted provider says is behind the exact contract in the transaction before you sign.

Short version:

> **Origin: trusted identity for the principals in your Stacks transaction.**

Ecosystem proposal:

> **Origin is a proposed Stacks Connect addendum for WalletConnect Verify-style provenance of transaction principals, demonstrated first in Leather.**
