# Origin Demo Plan

## Outcome

A user initiates harmless Stacks Testnet contract calls from a mock applicant site. A locally built Leather extension derives each exact contract principal, reads public claims from the Origin registry, and applies its own attester policy before the user approves anything.

The demo should make one distinction memorable:

```text
A claim exists != Leather trusts the claim's attester
```

Origin adds provenance to a wallet approval. It does not certify that a contract or transaction is safe, and the proof of concept does not modify SIP-30, Stacks Connect, or Stacks.js.

## Recording sequence

Target length: 2:00–2:20. The wallet sequence is always **Known → Unrecognized → Lookalike**.

### 1. Known origin

The Acme card requests `record-demo-action()` on the canonical Testnet fixture. Leather shows:

- **Known origin: Acme**
- The exact contract principal decoded by Leather
- **Origin Testnet Attester** as the recognized attester
- The claimed role
- Asset protection as a separate post-condition signal

Point: the site supplied the transaction, but it did not supply the identity verdict.

### 2. Unrecognized identity claim

The Northwind card requests the same harmless function on a second contract. A demonstration-untrusted attester has published a real claim for it. Leather shows:

- **Unrecognized identity claim**
- The exact contract principal
- No attacker-selected organization name in the default wallet surface
- Raw claim details only inside the quarantined Advanced disclosure

Point: Origin is permissionless, while Leather controls which attesters it recognizes.

### 3. Unknown lookalike

The Acme Rewards card targets an unattested contract with the same `acme-action` name under another deployer. Leather shows:

- **Unknown origin**
- A separate **Potential lookalike contract** warning
- The exact, different contract principal

Point: principal derivation is deterministic. The name collision is a heuristic warning, not an identity verdict.

### 4. Prove it on Explorer

Switch to the registry explainer at `/registry`. Use the page to show:

- The live v2 registry contract and its deployment transaction
- The canonical Acme subject and claim transaction
- The separation between open registry facts and wallet-owned trust policy
- Direct links to the Stacks Explorer for independent inspection

This segment answers “is this real?” without making the audience decode raw contract calls on its own.

### Optional evidence coda

Use `/evidence` to show claim lifecycle and domain-control evidence if time permits. Use the existing lifecycle fixture; never revoke or reissue the canonical Acme claim during rehearsal or recording.

## Current demo surfaces

| Surface            | Public URL                                     | Purpose                                      |
| ------------------ | ---------------------------------------------- | -------------------------------------------- |
| Applicant          | <https://origin-iota-ashy.vercel.app>          | Initiates the three ordinary SIP-30 requests |
| Registry explainer | <https://origin-iota-ashy.vercel.app/registry> | Explains the registry and links to Explorer  |
| Evidence explorer  | <https://origin-evidence.vercel.app/evidence>  | Shows public claim and domain evidence       |
| Wallet             | Local **Leather Origin Demo** build            | Derives subjects and applies wallet policy   |

## Live Testnet anchors

- Registry: `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`
- Registry deployment: `0x8a2c71ba986643dab5a4e992e0edecf5b5c6c4752fdd1cbd9f42f572a8646de3`
- Trusted test attester: `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R`
- Domain-control attester: `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0`
- Demonstration-untrusted attester: `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ`
- Canonical Acme subject: `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`
- Canonical claim transaction: `0xeeaa16f586079c7096433fa77d1496b6816cf294d789c2b84420a81d38279cb6`

## Transaction and trust boundaries

Every example exposes the same state-only public function. Requests use Deny post-condition mode with no declared asset movements so the demo isolates provenance from transaction-risk differences.

Leather derives the subject as:

```text
contract principal = contractAddress + "." + contractName
```

The applicant must not send an organization name, attestation verdict, attester hint, trust policy, or canonical-contract hint. Leather queries its configured attesters, checks lifecycle state, and renders provenance independently from post-condition protection.

The Testnet build recognizes the canonical and domain-control attesters. It also queries the demonstration-untrusted attester so the second scenario is deterministic. Arbitrary discovery requires indexing and remains outside this proof of concept.

## Acceptance criteria

- The applicant opens all three requests through the normal SIP-30 path.
- Leather derives the exact subject from decoded transaction options.
- Live Testnet reads produce Known, Unrecognized, and Unknown-plus-lookalike states.
- Attacker-controlled organization text is not promoted in the unrecognized state.
- Registry failure is neutral and never produces Known origin.
- Post-condition protection remains separate and visible.
- `/registry` identifies the live v2 deployment and canonical claim with working Explorer links.
- No transaction is approved or broadcast during the recording.
- The canonical claim set remains unchanged before and after the recording.

## Product boundary after the demo

The reusable proposal should define principal derivation, lifecycle semantics, provenance result types, wallet-owned trust requirements, and safe rendering of untrusted claim data. Applications may request transactions, but must not supply the wallet's identity or trust conclusions.
