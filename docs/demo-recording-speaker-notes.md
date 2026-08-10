# Origin Demo Recording Guide and Speaker Notes

Use this document to prepare and record the current Origin demo. The notes are prompts, not prose to read verbatim. Keep the delivery conversational and explain what is happening in your own words.

## Current demo status

The demo is ready for final rehearsal:

- The live Testnet fixture verification passes.
- The complete three-scenario journey passes against the deployed applicant site and the locally built Leather extension.
- The applicant, registry explainer, and evidence surfaces render cleanly at a 1440 × 900 recording resolution.
- The registry explainer presents the live v2 anchors with direct Explorer links.
- The checked-in wallet storybook has been regenerated from the current v2 policy and live Testnet state.

## Sites to use

- Applicant demo: <https://origin-iota-ashy.vercel.app>
- Registry explainer: <https://origin-iota-ashy.vercel.app/registry>
- Public evidence: <https://origin-evidence.vercel.app/evidence>

Do not use the older `origin-umber-six.vercel.app` deployment.

## Current Testnet configuration

- Registry: `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`
- Trusted test attester: `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R`
- Domain-control attester: `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0`
- Demonstration-untrusted attester: `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ`

The current source of truth for Leather's demo policy is:

`/Users/alexander/Code/leather-origin-demo/apps/extension/src/app/features/rpc-stacks-transaction-request/stacks/origin/origin-testnet.compatibility.json`

## How the demo works

The applicant site creates ordinary SIP-30 contract-call requests. It does not tell Leather which identity to display or which attesters to trust.

Leather:

1. Decodes the transaction and derives the exact deployer and contract name.
2. Reads claims for that exact pair from the Origin v2 registry.
3. Applies its own bundled attester policy.
4. Evaluates same-name, different-deployer lookalikes as a separate warning.

The three cards demonstrate three distinct outcomes:

- **Acme:** active claim from a trusted attester → **Known origin**.
- **Northwind:** real claim from an untrusted attester → **Unrecognized identity claim**.
- **Acme Rewards lookalike:** no trusted claim, with a known contract name under another deployer → **Unknown origin** and **Potential lookalike**.

Core idea to communicate: **a claim can exist without Leather trusting the claim's attester.** The registry is open; the wallet owns its trust policy.

The evidence site presents public supporting evidence. It does not override Leather's bundled policy and does not establish that a contract or transaction is safe.

## Build and browser setup

Build the explicitly labeled Origin version of Leather:

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm build:origin-demo
```

Then prepare Chrome:

1. Use a dedicated Chrome profile if possible.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select:
   `/Users/alexander/Code/leather-origin-demo/apps/extension/dist`
5. Confirm the extension is named **Leather Origin Demo**.
6. Disable the regular Leather extension so two providers do not compete.
7. Pin the demo extension.
8. Use a disposable wallet/account on **Stacks Testnet**.
9. Open the applicant, registry explainer, and evidence sites in separate tabs.
10. Connect the applicant site to Leather and approve only the address request.
11. Confirm that the applicant header and Leather both show **Stacks Testnet**.

After rebuilding the extension, return to `chrome://extensions` and press **Reload** on the unpacked extension before rehearsing.

## Pre-recording verification

Immediately before recording, verify the live fixtures:

```sh
cd /Users/alexander/Code/contract-provenance-certificate
pnpm testnet:verify
```

Confirm that it reports the intended contracts and claims without an error. Do not issue, revoke, or reissue claims during rehearsal or filming.

## Speaker notes — approximately two minutes

These are reminders of the point to make in each segment. Do not try to say every bullet.

### 0:00–0:12 — Establish the problem

**On screen:** Applicant page, with all three check-in cards visible.

**Reminders:**

- Wallets already explain what a transaction does.
- Origin adds the question: who published this exact contract?
- Provenance is distinct from transaction simulation or asset protection.

### 0:12–0:25 — Explain the trust boundary

**On screen:** Connect Leather, then return to the three cards.

**Reminders:**

- This is a normal SIP-30 contract-call request.
- The site supplies no organization name, verdict, or trusted-attester hint.
- Leather derives the contract principal itself.
- The registry is permissionless; Leather decides whom it trusts.

### 0:25–0:52 — Known Acme origin

**On screen:** Click the left Acme **Check in** button.

**Point out:**

- **Known origin** verdict.
- Acme identity and **Origin Testnet Attester** attribution.
- Exact `ST14…acme-action` principal.
- Provenance-not-safety disclaimer.
- Optionally open Advanced briefly to show the attester and registry.

**Reminders:**

- The claim matches the exact deployer and contract name.
- The claim is active and comes from an attester Leather recognizes.
- “Known origin” does not mean “safe contract.”
- Post-condition protection remains a separate signal.

Close the popup without approving the transaction.

### 0:52–1:15 — Claim from an unrecognized attester

**On screen:** Click the middle Northwind **Check in** button.

**Point out:**

- **Unrecognized identity claim**.
- Exact `ST2E…claimed-action` principal.
- The absence of a promoted organization identity in trusted wallet chrome.

**Reminders:**

- A real claim exists on-chain.
- Its attester is not in Leather's trusted policy.
- The evidence remains inspectable, but untrusted brand text cannot become a known identity.
- This is the key distinction: claim existence is not wallet trust.

Close the popup without approving the transaction.

### 1:15–1:40 — Same-name lookalike

**On screen:** Click the right Acme Rewards **Check in** button.

**Point out:**

- **Unknown origin**.
- Separate **Potential lookalike** warning.
- Exact `ST3B…acme-action` principal.
- Same contract name, different deployer.

**Reminders:**

- This contract borrowed the known Acme contract name.
- There is no trusted identity claim for this exact principal.
- Lookalike detection is a separate heuristic; it does not invent an identity verdict.

Close the popup without approving the transaction.

### 1:40–2:05 — Prove the registry is real

**On screen:** Switch to the registry explainer. Open the registry and canonical claim links in Stacks Explorer.

**Point out:**

- The live v2 registry is a public Clarity contract on Stacks Testnet.
- The canonical Acme subject and its claim transaction.
- Explorer is independently showing the same on-chain anchors.
- Open registry facts are separate from Leather's recognition policy.

**Reminders:**

- This is not a mocked wallet label; the claim is inspectable on-chain.
- Multiple attesters can publish to the open registry.
- Leather's bundled trust policy remains authoritative for Leather.
- Registry membership alone does not make an attester trusted.

### 2:05–2:20 — Evidence coda and close

**On screen:** Optionally show the evidence page's lifecycle or domain-control evidence, then return to the applicant.

**Reminders:**

- Exact principals.
- Open evidence.
- Wallet-owned trust.
- Provenance, not safety certification.

## Short 90-second version

If the recording must be shorter:

- Skip Advanced details in the known-origin popup.
- Spend roughly 20 seconds on each of the three wallet states.
- Give the registry explainer and Explorer only a five-to-eight-second closing shot.
- Preserve the Northwind explanation; it carries the most important trust-model distinction.

## Language guardrails

Prefer:

- Known origin
- Trusted attestation
- Exact contract principal
- Active claim
- Leather recognizes this attester
- Public provenance evidence

Avoid:

- Safe
- Official
- Certified
- Verified contract
- Guaranteed
- Leather trusts the contract

## Recording checklist

- Record the entire display or Chrome window, not only the active browser tab. Leather opens a separate approval popup.
- Use 1440 × 900 or 1920 × 1080 at 100% browser zoom.
- Disable notifications and hide personal bookmarks, extensions, and profile information.
- Keep the scenario order: Known → Unrecognized → Lookalike.
- Pre-open the applicant, registry, evidence, and Explorer tabs.
- Pre-position the registry page at the live anchors section if a smooth cut matters.
- Never approve the contract-call transactions; close each popup after showing it.
- Allow up to 20–30 seconds for a live Testnet lookup.
- Show Advanced details only for the known case.
- Keep the attester signer stopped while filming.
- Do not mutate the canonical claims during rehearsal or filming.
- Record one clean rehearsal before the final take.

## Storybook note

The checked-in storybook is a visual reference, not the recording order. The canonical live sequence is always Known → Unrecognized → Lookalike → Registry proof.

---

## Technical Q&A appendix

Use this section as background for questions after the walkthrough. These are explanations to adapt, not additional material that must appear in the recording.

### System overview

Origin separates four concerns:

1. **The registry records claims.** It is a permissionless Clarity contract on Stacks.
2. **Attesters investigate and issue claims.** Each attester defines what evidence it checks.
3. **Leather applies trust policy.** The wallet decides which attesters it recognizes and whether a current claim satisfies its policy.
4. **The evidence explorer makes records understandable.** It discovers lifecycle events, reconciles them with current contract state, and links to Explorer.

The separation is intentional. The registry does not declare an attester trustworthy, an attester does not control Leather's policy, and the requesting application does not supply the wallet's verdict.

```text
Application request
  -> Leather derives exact subject
  -> Leather reads claims from the registry
  -> Leather applies its bundled attester policy
  -> Leather renders provenance beside transaction-risk information
```

### How the Origin registry works

The registry is a Stacks smart contract whose unit of identity is an exact Stacks principal. For a contract, that means both the deployer address and contract name:

```text
ST14...8WPDY.acme-action
```

Records are stored under the composite key:

```clarity
{ attester: principal, subject: principal }
```

This has two important consequences:

- Two attesters can make independent claims about the same subject.
- One attester cannot overwrite another attester's record.

An active record contains the attester's organization name and role claim, the chain-derived issue height, an absolute expiry height, revocation state, an optional revocation height, and a request ID. Issuance, replacement, and revocation emit versioned lifecycle events.

The contract authenticates issuance through the Stacks transaction. The caller cannot choose an arbitrary attester field: the registry uses `tx-sender`, and v2 requires `tx-sender` to equal `contract-caller` to prevent an intermediary contract from misattributing a write. Request IDs provide replay protection within each attester's namespace.

The registry is deliberately not a global allowlist. Anyone may publish a claim from their own principal. Its job is to preserve attributable, inspectable state—not to decide which issuers a wallet should believe.

### How an attester works

An attester is an issuer with a Stacks principal and an off-chain verification policy. After checking evidence, it submits `issue-attestation` for one exact subject with a bounded lifetime. The resulting transaction makes the issuer, subject, claim, and lifecycle state public.

The demo has two recognized attester classes:

- **Origin Testnet Attester** issues the stable fictional fixtures used in the narrated wallet flow.
- **Origin Domain Control Attester** demonstrates automated issuance after checking control of a domain and the subject's deployer key.

The separate demonstration-untrusted attester proves the permissionless side of the design: its claim really exists, but Leather does not promote its organization text because that issuer is outside Leather's trust policy.

#### Domain-control attester flow

For the domain-control prototype:

1. The applicant signs a versioned SIP-018 structured message using the subject deployer's key.
2. It publishes the proof at a fixed HTTPS well-known location.
3. The verifier checks the exact subject, intended attester, domain, nonce, request ID, freshness, expiry, policy version, issuer-name derivation, role, and deployer signature.
4. The outbound fetch policy rejects redirects, non-public and protected addresses, DNS rebinding, oversized responses, and unexpected content.
5. An isolated signer independently checks the policy envelope and current burn height before signing the exact registry transaction bytes.
6. A broadcaster journals and submits those exact bytes, then records confirmation and recovery state.

The verifier, signer, and broadcaster are separate because a network-facing verifier should not directly hold the signing key. The signer remains stopped outside controlled issuance.

Domain control is still a narrow assertion. It demonstrates control of the named domain and deployer key under a particular policy; it does not establish legal identity, representative authority, code quality, audit status, or transaction safety.

### How Leather recognizes an attestation

Leather starts from the transaction request, not from application-supplied identity metadata. For `stx_callContract`, it decodes `contractAddress` and `contractName` and constructs the exact contract principal itself.

Its bundled Testnet configuration distinguishes:

- **Discovery attesters:** principals Leather queries for deterministic claim discovery.
- **Trusted attesters:** principals whose active claims may become a Known-origin result.
- **Reference contracts:** exact known subjects used only for the separate lookalike heuristic.

For each returned record, Leather evaluates:

1. Does the record correspond to the exact decoded subject and queried attester?
2. Is the attester inside its wallet-owned validity interval?
3. Is the record not revoked?
4. Is the current Bitcoin burn height before `expires-at`?
5. Is the claim lifetime within the maximum Leather permits for that attester?
6. Did every registry and burn-height read complete successfully?

Only a recognized attester with a current, policy-compliant claim produces **Known origin**. A real claim from another issuer produces **Unrecognized identity claim** without promoting that issuer's organization text. No claim produces **Unknown origin**. A previously relevant but revoked or expired record can produce **Attestation no longer valid**.

Network errors fail neutrally as **Origin unavailable**. They never fail open into Known origin.

### How lookalike detection differs

Lookalike detection is not an attestation. Leather compares the decoded contract name with its bundled reference subjects. The same name under a different deployer can trigger **Potential lookalike contract**.

That warning is heuristic and independent from provenance. It can call attention to a suspicious name collision, but it cannot identify the publisher and must not upgrade or replace the attestation result.

### How the evidence explorer works

The registry's read-only function answers one exact `(attester, subject)` lookup; it does not provide an unbounded global directory. The evidence explorer therefore uses two layers:

1. Versioned registry events provide discovery and lifecycle history.
2. `get-attestation` provides authoritative current state for each unique pair.

The index validates event shapes, deduplicates transaction/event identities and attester/subject pairs, then reconciles history with current map state. This prevents an old issuance event from being mistaken for a currently active claim after revocation or replacement.

The evidence explorer is explanatory infrastructure, not Leather's source of trust. Leather reads its pinned API and registry configuration directly; the website cannot alter the wallet's trusted-attester set.

### Why Bitcoin burn height is used

Stacks exposes Bitcoin burn-block height to Clarity. Origin records issuance at the chain-observed burn height and expresses expiry as an absolute future burn height. This gives the contract and wallet a shared, deterministic lifecycle clock without depending on a web server's wall clock.

Long-lived fictional fixtures use a large demo-only window so Testnet resets and recording schedules do not constantly invalidate them. The automated domain-control attester has a much smaller maximum lifetime enforced by both signer and wallet policy.

### What is real and what is mocked

Real in the demonstration:

- SIP-30 contract-call requests reaching an unpacked Leather build.
- Exact principal derivation inside Leather.
- Registry and claim transactions confirmed on Stacks Testnet.
- Live registry and burn-height reads.
- Wallet-owned trusted-attester evaluation.
- Explorer links to the public contract and transaction data.

Deliberately fictional or prototype-scoped:

- Acme, Northwind, and their business relationships.
- The long-lived canonical fixture policy.
- Production custody, governance, monitoring, and incident response.
- Ecosystem-wide agreement on which attesters wallets should recognize.

### Common technical questions

**Why not let the application tell Leather which attester to use?**

Because the requesting site is part of the adversarial boundary. If it could choose the identity provider or verdict, a malicious site could choose its own issuer. Discovery and trust configuration belong to the wallet.

**Why store claims on-chain instead of returning a signed JSON document?**

The registry gives consumers one public lifecycle state, authenticated by Stacks transactions, with inspectable issuance and revocation history. Off-chain evidence can remain detailed and policy-specific while the narrow current claim is globally readable.

**Does permissionless issuance create spam?**

It can create irrelevant claims, which is why claim existence is not enough. Wallets query bounded configured attesters, and general-purpose explorers need indexed discovery, validation, deduplication, and limits.

**Can two attesters disagree?**

Yes. Their records occupy separate namespaces. A consumer may recognize one, both, or neither according to its own policy.

**Can an attestation be renewed or replaced?**

Yes. The same attester can replace its own record using a new request ID. Reissuance produces a new lifecycle event and clears prior revocation state. Consumers still enforce the new issue height, expiry, and policy limits.

**What happens if the registry API is unavailable?**

Leather shows an unavailable operational state. It does not cache or infer a Known-origin verdict from the application request.

**Does Known origin mean the transaction is safe?**

No. It means Leather found a current claim about the exact subject from an attester it recognizes under its current policy. Transaction simulation, post-conditions, audits, and user intent remain separate questions.

**What would production require?**

Production key custody, governed attester rotation, rapidly updateable signed wallet policy, monitoring and incident response, independent service review, resilient indexing and API providers, and a clear standard for how multiple wallets represent the same narrow provenance facts.
