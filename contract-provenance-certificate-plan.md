# Contract Provenance Certificate

**Working name:** Contract Provenance Certificate (CPC)  
**Alternative product name:** Verified Origin  
**Status:** Concept and implementation plan  
**Primary ecosystem:** Stacks  
**Core promise:** Know who stands behind a smart contract, prove that they claimed the exact contract being used, and see precisely what has—and has not—been verified.

---

## 1. Executive Summary

Stacks permits anyone to deploy a smart contract from any wallet. This is desirable: deployment remains permissionless, pseudonymous software remains possible, and no central authority decides who may publish code.

The problem is that the blockchain can prove only that a particular Stacks principal deployed a contract. It cannot prove that:

- The principal belongs to a particular company, protocol, or individual.
- The organization recognizes the contract as an official production deployment.
- The deployer was authorized to act for that organization.
- The contract is still supported rather than deprecated.
- The organization operating the product is the same entity that wrote or deployed the software.
- A verification badge came from a verifier that the wallet considers trustworthy.

The proposed **Contract Provenance Certificate** system adds an optional, programmatically verifiable trust layer without restricting contract deployment.

A CPC is not a single transferable NFT and not a generic “verified” badge. It is a structured chain of revocable attestations connecting:

1. A recognized identity verifier.
2. A legal or pseudonymous organization.
3. One or more Stacks principals controlled by that organization.
4. An exact immutable contract principal.
5. The role that contract performs within a product.
6. Optional independent attestations concerning source code, audits, operational control, regulatory status, or other narrowly defined claims.

The system must be designed around one crucial distinction:

> A valid signature proves who issued a claim. It does not prove that the issuer is trustworthy or that the claim is true.

Wallets therefore evaluate certificates under an explicit **trust policy**. Anyone may publish an attestation, but only attestations from recognized verifiers, acting within a defined scope, receive trusted treatment in the wallet.

The result is **permissionless deployment with authenticated provenance**.

---

## 2. The User Problem

When a user encounters a contract, token, bond, vault, lending market, or payment request, the interface may claim:

> “This is the official Bitcoin Bond contract operated by Acme Financial.”

Without a provenance system, the user must trust:

- The website domain.
- The application frontend.
- A token logo or display name.
- A social-media announcement.
- An explorer label.
- A manually maintained list.
- The assumption that the wallet which deployed the contract belongs to the stated organization.

All of these can be spoofed or become stale.

The wallet should instead be able to establish a precise chain of claims:

```text
Recognized identity verifier
        ↓ attests
Acme Financial, Inc. is a verified legal organization
        ↓ proves control
Acme controls principal SP2ABC...
        ↓ signs claim
SP2ABC... recognizes contract SP2ABC....bitcoin-bond-v2
        ↓ assigns role
The contract is the official production issuance contract for Product X
```

The wallet can then display exactly which links are verified, which verifier established them, whether they remain current, and which claims remain unproven.

---

## 3. Design Goals

### 3.1 Permissionless deployment

No certificate should be required to deploy or interact with a contract. Anonymous and pseudonymous contracts remain valid first-class participants in the ecosystem.

### 3.2 Exact contract binding

A certificate must bind to the exact Stacks contract principal, not merely:

- A contract name.
- A domain.
- A GitHub repository.
- A token symbol.
- A source-code description.
- A visually similar application.

### 3.3 Narrow and explicit claims

The system must avoid an overloaded “verified” status. Every attestation should state exactly what was verified.

Examples include:

- Legal identity verified.
- Domain control verified.
- Wallet control verified.
- Contract officially claimed.
- Source build reproduced.
- Audit completed.
- Contract deprecated.
- Administrative role disclosed.

### 3.4 Wallet-controlled trust

Applications may submit credentials, but they must not decide which credential issuers the wallet trusts or how trusted status is rendered.

### 3.5 Revocation and expiration

Identity, wallet control, organizational authority, and operational relationships change. Every credential must support expiration, revocation, and supersession.

### 3.6 Multiple trust providers

The system should support competing identity providers, auditors, custodians, regulators, and trust-policy maintainers rather than one universal verifier.

### 3.7 Human-readable but machine-verifiable output

Wallets should generate the authoritative provenance display from structured attestations and wallet policy. Applications may provide descriptions, but those descriptions are not security facts.

### 3.8 Privacy minimization

Sensitive identity documents should remain off-chain. The chain should store only public claims, hashes, validity information, and verifier identity.

---

## 4. Non-Goals

A Contract Provenance Certificate does **not** prove that:

- The contract is secure.
- The issuer is solvent.
- A financial product is low risk.
- An advertised return will be paid.
- A token has economic value.
- The product complies with every applicable law.
- A market will remain liquid.
- An audit found every vulnerability.
- Stacks Labs endorses the product.
- The user should interact with the contract.

The system answers:

> “Who made this claim, are they recognized to make this type of claim, what exact object does the claim concern, and is the claim still current?”

It does not answer:

> “Is this investment safe?”

---

## 5. Why the Canonical Object Should Not Be a Normal NFT

An ordinary NFT is transferable. Transferability is dangerous for identity and provenance.

If a “Verified Issuer” NFT can be transferred or stolen, possession of the token could falsely imply:

- Control of an organization.
- Authorization to claim new contracts.
- Continued validity of a former relationship.
- The right to inherit trust accumulated by another entity.

A non-transferable NFT could be used as a visual receipt or wallet artifact, but the canonical security object should be a **revocable structured attestation**.

The recommended model is:

- The registry and attestations are authoritative.
- A non-transferable badge may be minted for display.
- Wallets ignore badge ownership when calculating trust.
- Transfer functions must be disabled if badge tokens exist.
- Revoked credentials remain historically visible but lose active status.

---

## 6. Core Trust Model

The CPC system contains four distinct layers.

### 6.1 Open attestation layer

Any principal may publish a signed attestation.

This preserves permissionlessness and enables:

- Self-attested pseudonymous identities.
- Community registries.
- Experimental trust systems.
- Alternative institutional trust policies.

A cryptographically valid attestation means only:

> “This principal made this structured statement.”

### 6.2 Recognized verifier layer

Wallet trust policies identify verifiers recognized for specific types of claims.

Recognition is scoped by:

- Claim type.
- Subject type.
- Jurisdiction.
- Assurance level.
- Credential schema.
- Maximum validity period.
- Required verification methods.

A verifier recognized for United States corporate identity must not automatically be trusted to attest:

- Contract security.
- European regulatory status.
- Solvency.
- Audit quality.
- Investment suitability.

### 6.3 Corroboration layer

High-value identities or products may require multiple independent attestations.

For example:

- One provider verifies legal existence and representative authority.
- A domain challenge proves control of the official domain.
- The organization signs from its Stacks principal.
- An auditor verifies a reproducible source build.
- A custodian confirms control through an approved custody arrangement.

The strongest trust is produced by diverse evidence, not by asking several similar KYC providers the same question.

### 6.4 Wallet policy layer

The wallet applies a local or institutionally configured trust policy.

A consumer wallet might accept:

- One recognized high-assurance organizational verifier.
- Current wallet-control proof.
- An exact contract claim.

An institutional custodian might require:

- Two identity attestations.
- Approved jurisdictions.
- A reproducible-build attestation.
- A credential less than 90 days old.
- No unresolved disputes.
- A named operational multisignature.
- A recognized audit provider.

The same on-chain records can therefore support different risk tolerances.

---

## 7. Defense Against Hostile KYC Providers

The system cannot prevent an adversary from creating a fake verification company and issuing credentials. It must prevent those credentials from being mistaken for trusted verification.

### 7.1 Separate signature validity from verifier recognition

Wallet evaluation must return separate results:

```json
{
  "signatureValid": true,
  "verifierRecognized": false,
  "scopeAuthorized": false,
  "credentialCurrent": true
}
```

A wallet must never convert `signatureValid: true` into a trusted checkmark.

### 7.2 Establish a root trust program

A default Stacks trust policy should recognize a limited set of verifier keys under a published accreditation process.

A verifier should be required to provide:

- A publicly identifiable legal entity.
- Responsible officers and contact information.
- A documented verification methodology.
- Defined jurisdictions and subject types.
- Security controls for signing keys.
- Independent security and process audits.
- Revocation infrastructure.
- Incident-response procedures.
- A dispute process.
- Insurance, bonding, or meaningful financial accountability.
- Agreement to public transparency requirements.
- Periodic renewal.

Recognition should state:

> “Verifier X satisfies Policy 3.2 for high-assurance United States organizational identity attestations.”

It should never state:

> “Verifier X is universally trustworthy.”

### 7.3 Scope verifier authority

Each verifier accreditation should define:

```yaml
verifier: verifier-x
allowed_claims:
  - legal-organization
  - representative-authority
  - controls-principal
subject_types:
  - corporation
  - nonprofit
jurisdictions:
  - US
assurance_levels:
  - organizational-high
maximum_validity_days: 365
required_methods:
  - government-registry-check
  - representative-identity-check
  - representative-authority-check
  - wallet-challenge
```

Credentials outside the verifier’s approved scope should be treated as unrecognized even when cryptographically valid.

### 7.4 Require explicit verification-method receipts

A generic “KYC passed” claim is insufficient.

The public credential should enumerate which checks were completed:

- Legal registry check.
- Representative identity check.
- Representative authority check.
- Domain control.
- Wallet challenge.
- Second-channel organizational confirmation.
- Sanctions or regulatory checks, where relevant.

The evidence itself may remain private, but the verifier must commit to a structured method record and evidence hash.

### 7.5 Require corroboration for high-value contracts

Wallet policy may require threshold verification, such as:

- Two of three recognized organizational identity verifiers.
- One identity verifier plus an authoritative registry.
- One identity verifier plus a verified domain and a qualified electronic seal.
- One source-build verifier plus one security auditor.

### 7.6 Public transparency log

Every recognized credential should be recorded in an append-only public log.

The log should include:

- Credential identifier.
- Verifier.
- Subject.
- Claim schema.
- Claim hash.
- Issuance time.
- Expiration.
- Revocation status.
- Superseded credential identifier.
- Verification-method identifiers.
- Applicable trust-policy version.

Independent monitors should detect:

- Unusual issuance volume.
- A verifier operating outside its scope.
- One organization bound to unrelated wallets.
- Duplicate or conflicting legal identities.
- Lookalike domains.
- Credentials issued immediately before high-value launches.
- Disputed credentials.
- Verifier-key anomalies.

On-chain anchoring can provide an immutable record even if detailed logs are maintained off-chain for efficiency.

### 7.7 Pending activation and challenge period

High-assurance credentials should initially enter a pending state.

1. The verifier issues a pending credential.
2. The credential appears in the transparency log.
3. Notifications are sent through established organizational channels.
4. The subject confirms the binding through another verified channel.
5. A challenge period elapses.
6. The credential becomes active.

Wallets should surface credential age:

> Newly verified issuer — credential activated four days ago.

### 7.8 Verifier accountability

Recognized verifiers should be subject to:

- Public identity.
- Contractual liability.
- Security audits.
- Insurance or bonding.
- Mandatory incident disclosure.
- Rapid revocation service levels.
- Suspension and removal procedures.
- Public records of disciplinary actions.

Financial bonding should supplement rather than replace governance. A large fraud may be more profitable than the posted bond, and deciding misconduct remains a human and legal process.

### 7.9 Wallet-pinned roots

The application must never be able to supply the trust registry that evaluates its own certificate.

Wallets should pin:

- The default root trust-policy contract.
- Authorized governance keys.
- Recognized verifier keys.
- Approved credential schemas.
- Current policy version.

Alternative trust profiles may be installed, but the wallet must clearly label them:

> Verified under Acme Exchange Policy, not the default Stacks trust policy.

### 7.10 Assume verifier compromise

The design should assume that a recognized verifier will eventually:

- Make an error.
- Suffer employee misconduct.
- Lose a signing key.
- Verify an impersonator.
- Exceed its authorized scope.

Required recovery mechanisms include:

- Immediate verifier-key suspension.
- Credential revocation.
- Retroactive invalidation under wallet policy.
- Emergency trust-store updates.
- Warnings on affected contracts.
- Preservation of historical status.
- Verifier-key rotation.
- Replacement of a verifier without replacing the subject’s entire identity history.

---

## 8. Attestation Types

The registry should support narrow, composable claim schemas.

### 8.1 Identity attestations

- `legal-organization`
- `verified-individual`
- `verified-pseudonymous-entity`
- `representative-authority`
- `government-registry-status`
- `domain-control`

### 8.2 Principal-control attestations

- `controls-principal`
- `principal-authorized-for-deployment`
- `principal-authorized-for-operations`
- `principal-superseded`
- `principal-compromised`

### 8.3 Contract provenance attestations

- `official-contract`
- `contract-role`
- `production-deployment`
- `test-deployment`
- `deprecated-contract`
- `migration-target`
- `source-repository`
- `reproducible-build`

### 8.4 Operational attestations

- `administrator-identity`
- `multisig-membership`
- `oracle-operator`
- `custodian`
- `emergency-operator`
- `upgrade-authority`

### 8.5 Independent third-party attestations

- `audit-completed`
- `audit-scope`
- `regulatory-license`
- `insurance-coverage`
- `reserve-attestation`
- `solvency-attestation`
- `security-certification`

Each schema should define precisely what the claim means and what it does not mean.

---

## 9. Roles Must Be Modeled Separately

“Who issued this contract?” may refer to several different actors.

| Role | Meaning |
|---|---|
| Economic issuer | The entity financially responsible for the product. |
| Software developer | The party that authored the code. |
| Deployer | The principal that published the immutable contract. |
| Product operator | The party managing ongoing operations. |
| Administrator | The principal or multisignature holding privileged powers. |
| Custodian | The party holding assets or keys. |
| Auditor | The party that reviewed a defined code version and scope. |
| Identity verifier | The party that verified an entity or wallet relationship. |

The wallet must not collapse these roles into one generic “owner.”

Example:

```text
Acme Financial
    └── economic issuer of Product X

Development Company
    └── authored source version 2.1

Deployment multisig
    └── deployed SP...bitcoin-bond-v2

Operations multisig
    └── can pause new deposits

Security Firm
    └── audited source hash 0x...
```

---

## 10. Proposed Data Model

A canonical attestation may use a structure similar to:

```typescript
type Principal = string;
type ContractPrincipal = string;

type Attestation = {
  id: string;

  schema: string;
  schemaVersion: string;

  attester: Principal;
  subject: Principal | ContractPrincipal;

  claimType:
    | "legal-organization"
    | "representative-authority"
    | "domain-control"
    | "controls-principal"
    | "official-contract"
    | "contract-role"
    | "production-deployment"
    | "deprecated-contract"
    | "reproducible-build"
    | "audit-completed"
    | "administrator-identity";

  claimHash: string;
  publicClaimUri?: string;
  evidenceCommitment?: string;

  jurisdiction?: string;
  assuranceLevel?: string;
  verificationMethods?: string[];

  issuedAt: number;
  activatesAt: number;
  validUntil: number;

  revokedAt?: number;
  revocationReason?: string;

  supersedes?: string;
  trustPolicyVersion?: string;
};
```

A verifier-accreditation record may use:

```typescript
type VerifierAccreditation = {
  verifier: Principal;
  legalEntityClaim: string;

  allowedSchemas: string[];
  allowedClaimTypes: string[];
  allowedSubjectTypes: string[];
  allowedJurisdictions: string[];
  allowedAssuranceLevels: string[];

  maximumValidityDays: number;
  requiredVerificationMethods: string[];

  policyVersion: string;
  activeFrom: number;
  activeUntil: number;

  suspendedAt?: number;
  revokedAt?: number;
};
```

---

## 11. On-Chain Components

### 11.1 Attestation Registry

The registry records attestations and their lifecycle.

Suggested functions:

```clarity
(issue-attestation ...)
(revoke-attestation ...)
(supersede-attestation ...)
(get-attestation ...)
(get-current-attestations ...)
(is-attestation-current ...)
```

### 11.2 Verifier Accreditation Registry

The root policy records verifier authority.

Suggested functions:

```clarity
(accredit-verifier ...)
(update-verifier-scope ...)
(suspend-verifier ...)
(revoke-verifier ...)
(get-verifier-scope ...)
(is-verifier-authorized ...)
```

### 11.3 Contract Claims Registry

Verified organizations claim exact contract principals and product roles.

Suggested functions:

```clarity
(claim-contract ...)
(assign-contract-role ...)
(deprecate-contract ...)
(set-migration-target ...)
(get-contract-claims ...)
```

### 11.4 Principal Rotation Registry

Organizations rotate wallet principals without losing historical provenance.

Suggested functions:

```clarity
(propose-principal-rotation ...)
(confirm-principal-rotation ...)
(complete-principal-rotation ...)
(mark-principal-compromised ...)
(get-current-authorized-principals ...)
```

### 11.5 Transparency Log Anchors

If complete logs are maintained off-chain, periodic Merkle roots should be anchored on-chain.

Suggested functions:

```clarity
(anchor-log-root ...)
(get-log-root ...)
```

---

## 12. Credential Lifecycle

### 12.1 Initial organizational verification

1. The organization applies to a recognized verifier.
2. The verifier checks legal existence.
3. The verifier checks representative identity and authority.
4. The organization proves domain control.
5. The target Stacks principal signs a fresh challenge.
6. The organization confirms through a second channel.
7. The verifier issues a pending attestation.
8. The issuance appears in the transparency log.
9. The challenge period elapses.
10. The credential becomes active.

### 12.2 Claiming a contract

1. An authorized organizational principal selects an exact contract principal.
2. It signs an `official-contract` claim.
3. It assigns one or more explicit roles.
4. It declares production, test, deprecated, or migration status.
5. The claim is recorded on-chain.
6. Wallets verify that the organizational principal is currently authorized.
7. Wallets display the relationship.

### 12.3 Key rotation

1. The current principal proposes a replacement.
2. The replacement principal signs acceptance.
3. The identity verifier confirms current organizational control.
4. A challenge period begins.
5. The old principal is marked superseded.
6. Historical contract claims remain attributable.
7. New claims require the current principal.

### 12.4 Emergency compromise

1. The organization or verifier reports compromise.
2. The principal-control credential is suspended.
3. Wallets immediately stop displaying active trusted status.
4. Associated contracts receive an “identity relationship disputed” warning.
5. An investigation determines revocation or restoration.
6. A new principal may be established through enhanced recovery procedures.

### 12.5 Contract deprecation

1. An authorized issuer marks the old contract deprecated.
2. The issuer identifies an optional migration target.
3. Wallets continue showing historical provenance.
4. New interactions display a deprecation warning.
5. The migration target must have its own independent contract claim.

---

## 13. Wallet Evaluation Algorithm

A wallet should calculate provenance rather than merely detect a badge.

### Step 1: Validate cryptography

- Is the attestation signature valid?
- Does the claimed attester match the signing key?
- Has the record been altered?

### Step 2: Validate lifecycle

- Is the attestation active?
- Has it expired?
- Has it been revoked?
- Has it been superseded?
- Is it present in the transparency log?

### Step 3: Validate verifier authority

- Is the verifier recognized under the wallet’s selected trust policy?
- Is it authorized for this claim type?
- Is it authorized for this subject type?
- Is it authorized in this jurisdiction?
- Is the assurance level sufficient?
- Were the required verification methods used?

### Step 4: Validate the relationship graph

- Does the organization control the principal?
- Is the control credential current?
- Did the authorized principal claim the exact contract?
- Is the stated contract role recognized?
- Has the contract been deprecated?
- Are required corroborating attestations present?

### Step 5: Apply local policy

- Does the user or institution require multiple verifiers?
- Is the credential recent enough?
- Are the verifier and jurisdiction permitted?
- Are there unresolved disputes?
- Are source-build or audit attestations required?

### Step 6: Render an explicit verdict

Example:

```text
Cryptographic validity
✓ Credential signature is valid

Verifier recognition
✓ Verifier X is recognized
✓ Authorized for U.S. organizational identity
✓ Credential follows schema version 2

Evidence
✓ Corporate registry checked
✓ Representative authority checked
✓ Domain control checked
✓ Wallet challenge signed
○ No second identity verifier

Credential status
✓ Active
✓ Not revoked
✓ Expires in 214 days
✓ Included in transparency log

Contract relationship
✓ Acme claimed this exact contract
✓ Contract deployed by an authorized principal
✓ Source build matches
○ No current solvency attestation

Verdict
Recognized issuer provenance

This is not a guarantee of security, solvency, liquidity, or performance.
```

---

## 14. Wallet User Experience

### 14.1 Avoid a generic green checkmark

A single checkmark compresses too many meanings and is easily imitated.

The wallet should display structured provenance:

#### Issuer identity

**Acme Financial, Inc.**  
Verified by Verifier X  
Assurance: Organizational High  
Valid until July 31, 2027

#### Contract provenance

- Claimed by Acme Financial.
- Exact contract: `SP2ABC...bitcoin-bond-v2`.
- Role: Official production issuance contract.
- Source build: Reproduced.
- Status: Active.

#### Operational control

- Administrator: 3-of-5 multisignature.
- Administrator can pause new deposits.
- Administrator cannot modify deployed contract code.
- Oracle operator: Acme Operations LLC.

#### Independent attestations

- Security audit: Present.
- Reserve attestation: Not present.
- Solvency attestation: Not present.
- Regulatory-license attestation: Not present.

#### Scope warning

> Identity and contract origin are verified. Security, solvency, liquidity, and investment performance are not guaranteed.

### 14.2 Display unrecognized attestations honestly

An unrecognized credential should appear as:

> Identity claim issued by an unrecognized verifier.

It should not receive the same iconography, placement, or color treatment as recognized provenance.

### 14.3 Identify the trust policy

Wallets should disclose:

> Evaluated under Stacks Default Trust Policy 1.0.

Institutional wallets may display:

> Evaluated under Acme Custody Institutional Policy 4.3.

### 14.4 Show credential age and disputes

Relevant labels include:

- Newly verified.
- Expiring soon.
- Superseded.
- Revoked.
- Disputed.
- Verifier suspended.
- Contract deprecated.
- Relationship cannot currently be established.

### 14.5 Prevent application-controlled security rendering

The authoritative provenance card must be rendered inside the wallet or another trusted client.

An application may display its own claims, but the wallet must independently reconstruct:

- The recognized identity.
- The contract relationship.
- The verifier status.
- The current policy.
- The limitations of the certificate.

---

## 15. Integration With Transaction Explanations

The CPC system complements, but does not replace, deterministic transaction explanations.

A signing interface should separate:

### Application intent

> “Buy a six-month Bitcoin Bond.”

### Provenance

> The exact contract is claimed by Acme Financial, whose organizational identity was verified by Verifier X.

### Enforced transaction limits

> This transaction may transfer no more than 10 sBTC and must return at least 9.95 bond tokens.

### Simulated effects

> At the latest simulated state, the transaction returns approximately 9.98 bond tokens.

### Unverified economic claims

> The issuer advertises a target annualized return of 4.5%. The wallet does not verify future performance or solvency.

Every sentence therefore has an explicit origin and assurance class.

---

## 16. Governance Model

### 16.1 Recommended structure

Use a federated root program rather than a single permanent authority.

A **Trust Policy Council** should:

- Define credential schemas.
- Establish minimum verifier requirements.
- Approve verifier scopes.
- Publish policy versions.
- Suspend compromised verifiers.
- Coordinate emergency responses.
- Maintain public records and meeting outcomes.

### 16.2 Council composition

Possible representation includes:

- Wallet providers.
- Stacks Labs.
- Stacks Foundation.
- Security experts.
- Institutional custody providers.
- Identity and compliance specialists.
- Independent ecosystem representatives.

No single commercial verifier should control accreditation.

### 16.3 Threshold governance

Policy and verifier changes should require threshold authorization.

Examples:

- Routine verifier accreditation: 5-of-9 council approval.
- Scope expansion: 5-of-9.
- Emergency suspension: 3-of-9 with automatic expiration.
- Permanent removal: 6-of-9 after public review.
- Root-key rotation: 7-of-9.

Exact thresholds require further design.

### 16.4 Public policy and appeals

The program should publish:

- Accreditation requirements.
- Current verifier scopes.
- Suspensions and removals.
- Incident reports.
- Policy changes.
- Appeals and dispute outcomes.
- Council conflicts of interest.

### 16.5 Alternative trust policies

The protocol should permit:

- Institutional policies.
- Jurisdiction-specific policies.
- Community-maintained policies.
- Pseudonymous developer policies.
- Strict or experimental policies.

The default wallet policy should be useful but not protocol-mandated.

---

## 17. Threat Model

### 17.1 Hostile verifier

**Attack:** An adversary creates a verifier and issues credentials to scammers.

**Mitigation:** Open issuance remains possible, but wallets do not recognize the verifier unless accredited for the relevant scope.

### 17.2 Compromised recognized verifier

**Attack:** A recognized verifier key is stolen or an employee issues fraudulent credentials.

**Mitigation:** Transparency logs, monitoring, rapid key suspension, credential revocation, threshold corroboration, liability, and emergency wallet updates.

### 17.3 Lookalike verifier

**Attack:** A provider adopts a name or logo similar to a recognized verifier.

**Mitigation:** Wallets identify verifiers by pinned principal and accreditation record, not display name or logo.

### 17.4 Stolen verified organizational wallet

**Attack:** An attacker obtains control of a verified principal and claims hostile contracts.

**Mitigation:** Principal-control credentials expire, contract claims are logged, notifications and challenge periods apply, organizational recovery exists, and wallets surface newly claimed contracts.

### 17.5 Malicious authorized employee

**Attack:** A legitimate employee uses an authorized deployment wallet to claim a hostile contract.

**Mitigation:** Organizational policies may require multisignature contract claims, role-specific principals, internal threshold approval, and delayed activation.

### 17.6 Fake organization with valid incorporation documents

**Attack:** A scammer creates a real shell company and truthfully passes legal-entity verification.

**Mitigation:** The CPC proves accountable identity, not honesty. Wallets must not imply safety. Credential age, operating history, audits, capitalization, licenses, and other independent attestations remain separate.

### 17.7 Domain compromise

**Attack:** An attacker controls an organization’s domain and uses it to support a fraudulent claim.

**Mitigation:** Domain control is only one corroborating factor and cannot independently establish organizational identity or representative authority.

### 17.8 Badge spoofing in the application

**Attack:** A hostile site displays a fake verified badge.

**Mitigation:** The wallet renders provenance independently at the authorization boundary.

### 17.9 Reused or copied source code

**Attack:** A scammer deploys byte-for-byte identical code and claims equivalence to an official product.

**Mitigation:** Source equivalence is distinct from issuer provenance. The official organization must claim the exact contract principal.

### 17.10 Stale verification

**Attack:** A credential remains trusted after the company loses control of the wallet or changes ownership.

**Mitigation:** Expiration, periodic reverification, principal rotation, revocation, and current-status checks.

### 17.11 Trust council capture

**Attack:** The root governance body accredits hostile verifiers or removes competitors.

**Mitigation:** Threshold governance, public policy, multiple stakeholder groups, transparent decisions, alternative trust policies, and wallet choice.

### 17.12 Privacy leakage

**Attack:** Permanent on-chain identity data creates unwanted correlation or exposes personal documents.

**Mitigation:** Keep evidence off-chain; store hashes and narrow public claims; support organizational identities and selective disclosure where appropriate.

---

## 18. Minimum Viable Product

The first version should remain deliberately narrow.

### 18.1 Supported subjects

- Legally registered organizations.
- Stacks principals.
- Stacks contract principals.

### 18.2 Supported claims

1. `legal-organization`
2. `representative-authority`
3. `controls-principal`
4. `official-contract`
5. `contract-role`
6. `deprecated-contract`

### 18.3 Initial verification requirements

- Legal registry check.
- Representative identity check.
- Representative authority check.
- Official-domain control.
- Fresh Stacks wallet challenge.
- Second-channel confirmation.
- One-year maximum identity validity.
- Ninety-day maximum wallet-control validity.

### 18.4 Initial trust configuration

- Two or three recognized Know Your Business providers.
- One default trust policy.
- A small multisignature council.
- Public verifier scopes.
- On-chain verifier accreditation.
- On-chain credential status.
- Public transparency-log interface.

### 18.5 Initial wallet interface

- Recognized organization name.
- Verifier and assurance level.
- Credential expiration.
- Exact contract claim.
- Contract role.
- Active, deprecated, disputed, or revoked status.
- Explicit disclaimer that provenance is not safety certification.

### 18.6 Pilot candidates

The pilot should use a small set of high-visibility contracts whose operators are willing to participate.

Possible categories:

- Bitcoin Bonds.
- sBTC infrastructure.
- Major decentralized exchanges.
- Major lending protocols.
- Official ecosystem contracts.
- Stablecoin or bridge contracts.

The pilot should include at least one contract migration or deprecation exercise to test lifecycle behavior.

---

## 19. Implementation Phases

### Phase 0: Specification

Deliverables:

- Vocabulary and naming.
- Threat model.
- Credential schemas.
- Wallet trust-verdict model.
- Verifier accreditation policy.
- Revocation and rotation procedures.
- Privacy review.

### Phase 1: Prototype registry

Deliverables:

- Clarity attestation registry.
- Verifier-accreditation contract.
- Contract-claim contract.
- TypeScript software development kit.
- Test verifier.
- Test wallet renderer.
- Local transparency log.

### Phase 2: Controlled pilot

Deliverables:

- Two recognized test verifiers.
- Five to ten verified organizations.
- Twenty to thirty claimed contracts.
- Wallet integration in at least one production wallet.
- Explorer integration.
- Incident simulation.
- Key-rotation simulation.
- Verifier-compromise tabletop exercise.

### Phase 3: Production trust program

Deliverables:

- Formal accreditation process.
- Public policy repository.
- Threshold-governed root.
- Monitoring service.
- Dispute and appeals process.
- Emergency suspension process.
- Multiple production wallets.
- Institutional policy support.

### Phase 4: Expanded attestations

Possible additions:

- Reproducible-build attestations.
- Audit-scope attestations.
- Administrator and multisignature disclosure.
- Custodian attestations.
- Regulatory-license attestations.
- Reserve and solvency attestations.
- Pseudonymous developer reputation.
- Cross-chain identity bindings.

---

## 20. Success Metrics

The system should not be judged by the number of badges minted.

Useful metrics include:

- Percentage of economically important contracts with current provenance.
- Percentage of wallet transaction volume involving contracts with recognized provenance.
- Number of wallets independently evaluating CPC records.
- Time required to revoke a compromised credential.
- Time required to rotate an organizational principal.
- Number of prevented or clearly warned lookalike-contract interactions.
- Percentage of contract migrations with explicit deprecation and successor records.
- Number of independent recognized verifiers.
- Percentage of attestations included in monitored transparency logs.
- User comprehension of the distinction between provenance and safety.
- Institutional adoption of custom trust policies.

---

## 21. Open Product Questions

1. Should the default product name emphasize **origin**, **provenance**, **identity**, or **certification**?
2. Should the root trust program be operated by Stacks Labs, the Stacks Foundation, an independent nonprofit, or a consortium?
3. Which existing Know Your Business providers could support wallet-control challenges and public credential issuance?
4. Should high-value contract claims require a delay before becoming trusted?
5. Should organizations be required to use multisignature principals for production contract claims?
6. How should legal-name changes, mergers, acquisitions, and dissolved entities be represented?
7. Should contract claims be issued by the verified organization directly or countersigned by the identity verifier?
8. What minimum wallet-control reverification interval is appropriate?
9. Should the first version support verified pseudonymous teams?
10. How should disputes be displayed before a final revocation decision?
11. Which data belongs directly on Stacks versus in an anchored off-chain transparency log?
12. Should verifier bonding or insurance be mandatory?
13. How should wallet vendors coordinate a shared security vocabulary and visual system?
14. Can a standardized contract manifest expose administrative powers automatically?
15. How should CPC interact with transaction simulation and post-condition explanations?

---

## 22. Recommended Naming

### Preferred protocol name

**Contract Provenance Certificate**

This name is precise and avoids implying that the contract itself is safe or approved.

### Preferred consumer-facing label

**Verified Origin**

Example:

> Verified Origin: Acme Financial, Inc. claimed this exact contract.

### Terms to avoid

- **Verified Contract**, because users may infer security certification.
- **Safe Contract**, because the system does not prove safety.
- **Official NFT**, because transferability and collectible language obscure the trust model.
- **Proof of Identity**, because the certificate contains several distinct relationships.
- **Stacks Approved**, because default recognition should not imply endorsement.
- **KYC NFT**, because the design is broader than KYC and should not rely on NFT ownership.

---

## 23. Final Recommendation

Build the Contract Provenance Certificate as a **structured, revocable attestation graph evaluated under wallet-controlled trust policies**.

The canonical chain should be:

```text
Recognized verifier
    ↓ verifies a narrow claim
Organization
    ↓ proves current control
Authorized Stacks principal
    ↓ claims an exact immutable object
Contract principal
    ↓ declares a precise role
Product component
```

The design succeeds only if it preserves the following distinctions:

- Signed is not trusted.
- Trusted is not universally trusted.
- Identity verified is not contract audited.
- Contract audited is not economically safe.
- Official origin is not product endorsement.
- A valid past relationship is not necessarily a current relationship.
- A visible badge is not the security primitive.

The central product promise should be:

> **Anyone can deploy. Anyone can make a claim. Wallets can independently determine who made the claim, whether that claimant is recognized, what exact contract the claim concerns, and whether the relationship remains current.**

That would give Stacks something crypto frequently lacks: permissionless software with native, inspectable accountability.
