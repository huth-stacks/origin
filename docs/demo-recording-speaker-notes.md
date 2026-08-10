# Origin Demo Recording Script and Technical Q&A

Use the recording script word for word or as a close guide. Text under **Operator** is an action, not narration. Text in block quotes is spoken copy. The technical appendix is for questions after the walkthrough.

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

## Current Testnet configuration

- Registry: `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`
- Trusted test attester: `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R`
- Domain-control attester: `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0`
- Demonstration-untrusted attester: `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ`

The current source of truth for Leather's demo policy is `apps/extension/src/app/features/rpc-stacks-transaction-request/stacks/origin/origin-testnet.compatibility.json` in the companion Leather checkout.

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

If the currently installed **Leather Origin Demo** already produces all three expected states, do not rebuild it. Rebuild only when the unpacked extension is missing, stale, or loading a different `dist` directory:

```sh
cd leather-origin-demo
pnpm build:origin-demo
```

Then prepare Chrome:

1. Use a dedicated Chrome profile if possible.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose **Load unpacked** and select `apps/extension/dist` in the Leather checkout.
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
cd origin
pnpm testnet:verify
```

Confirm that it reports the intended contracts and claims without an error. Do not issue, revoke, or reissue claims during rehearsal or filming.

## Recording script — approximately six to seven minutes

Before recording, connect the applicant to Leather so the header says **Leather connected**. Arrange the tabs in this order:

1. Acme applicant
2. Origin Registry
3. Origin evidence

Do not pre-open a transaction approval. Start on the applicant with the three cards visible.

### Scene 1 — Introduction

**Operator:** Stay on the Acme applicant. Let the audience see the fictional product and three check-in cards; do not click yet.

> Security is becoming a priority across every layer of software. But in crypto, one of the biggest risks is still remarkably simple: signing a transaction with the wrong counterparty, or interacting with a contract you didn't mean to trust.
>
> Wallets are getting better at explaining what a transaction is expected to do. Simulation can preview its effects, and post-conditions can constrain which assets are allowed to move.
>
> But there's still a more basic question: is this actually the contract I think it is?
>
> That's the problem Origin is trying to address: provenance.
>
> Provenance is not transaction simulation, and it is not a guarantee that a contract is safe. It provides context about the exact contract involved: who has made an identity claim about it, who issued that claim, and whether your wallet recognizes that issuer.
>
> The idea is simple. Before you sign, your wallet should help you understand not only what a transaction may do, but who you may be doing it with.

### Scene 2 — Establish the controlled comparison

**Operator:** Move the pointer across the three cards. Briefly point to **Exact target**, `record-demo-action()`, and **Assets: None move**. End over the left Acme **Check in** button.

> This fictional Acme application gives us three controlled examples. Each card requests the same harmless, state-only function on Stacks Testnet. The asset behavior is the same in every case. What changes is the exact contract principal and the provenance evidence Leather finds for it.
>
> These are normal SIP-30 contract-call requests. The website does not send Leather an organization name, an attester, or a provenance verdict. Leather has to decode the target and make that decision itself.

### Scene 3 — Known Acme origin

**Operator:** Click the left **Check in** button on **Weekly check-in** from `acme.example`. Wait for Leather to show **Known origin**. Point first to **Known origin**, then **Acme**, then the exact principal.

> In the first case, Leather shows a known origin for Acme.
>
> Leather derived this exact principal from the transaction request. It found an active claim for that principal from the Origin Testnet Attester, which is an attester this build of Leather recognizes.

**Operator:** Point to the separate asset-protection language and the provenance-not-safety disclaimer.

> Notice that provenance and asset protection remain separate. The transaction declares that no assets should move, but the identity claim still does not guarantee that the contract or transaction is safe.

**Operator:** Click **Show advanced details**. Point to **Checked principal**, **Attester principal**, **Attested at**, **Expires**, and **Registry**. Do not open an Explorer link from the popup.

> Under advanced details, Leather exposes exactly what it evaluated: the complete subject, the attester principal, the issuance and expiry heights, and the registry it queried. The website did not supply any of these conclusions.

**Operator:** Click **Cancel**. Do not click **Approve**. Wait until the applicant card reports that Leather closed without returning a transaction.

### Scene 4 — Real claim, unrecognized attester

**Operator:** Click the middle **Check in** button on **Bonus check-in** from `northwind.example`. Wait for **Unrecognized identity claim**. Point to that heading and then the exact `ST2E…claimed-action` principal.

> The second contract also has a real claim in the registry. But this time, the issuer is not in Leather's trusted-attester policy, so Leather calls it an unrecognized identity claim.
>
> The registry is permissionless. Anyone can make a claim from their own attester principal. That does not mean the wallet has to trust it.

**Operator:** Point to the warning explaining that Leather will not repeat the claim's identity text. Do not open Advanced.

> The claim actually calls itself “Definitely Acme” and “Official contract.” Leather deliberately keeps that attacker-controlled text out of the trusted identity surface. The evidence can exist without becoming the wallet's verdict.
>
> This is the most important distinction in the demo: a claim exists, but Leather does not recognize its attester.

**Operator:** Click **Cancel**, never **Approve**.

### Scene 5 — Same-name lookalike

**Operator:** Click the right **Check in** button on **Weekly check-in** from `mail.acme-rewards.example`. Wait for both **Unknown origin** and **Potential lookalike contract**. Point to each label, then the `ST3B…acme-action` principal.

> The third contract has no recognized claim for this exact principal, so its origin is unknown.
>
> It also uses the same `acme-action` contract name as the known Acme contract, but under a different deployer. Leather shows that as a separate potential-lookalike warning.
>
> The warning is a heuristic, not an identity claim. Leather is drawing attention to the name collision without pretending it knows who published this contract.

**Operator:** Click **Cancel**, never **Approve**. Return to the applicant and pause briefly on all three cards.

> So the same transaction shape produced three different results: known origin, a real claim from an unrecognized attester, and an unknown same-name lookalike.

### Scene 6 — Origin Registry and Stacks Explorer

**Operator:** Switch to tab 2, the [Origin Registry](https://origin-iota-ashy.vercel.app/registry). Point to **Open evidence. Wallet-owned trust.**, the **Live contract** stamp, and **Stacks Testnet**.

> Now let's look at where those results come from.
>
> Origin is a public Clarity registry on Stacks Testnet. It records which attester made a claim about which exact principal. The registry stores attributable evidence, but it does not decide which attesters a wallet should trust.

**Operator:** Click **Open the registry on Explorer**. It opens a new tab. Wait for Stacks Explorer, then point to the Testnet network and the full `origin-registry-v2` contract principal. If the contract source panel is visible, point to it briefly. Do not navigate further inside Explorer. Close the Explorer tab and return to Origin Registry.

> This is the live v2 registry contract in Stacks Explorer. The contract and its deployment are public; this is not a label mocked inside the wallet.

**Operator:** Click **Follow one lookup**. Point across **Decode the request**, **Read the registry**, and **Apply wallet policy**.

> A lookup has three steps. Leather decodes the exact target from the request. It reads the attester-and-subject record from the registry. Then it applies its own policy for attester trust, issuance, expiration, and revocation.
>
> That final step is why claim existence and wallet trust are not the same thing.

**Operator:** Scroll to **This record is on Testnet now**. Point to **Exact subject**, **Attester**, **Issued at Bitcoin block**, and **Expires at Bitcoin block**.

> This is the current Acme fixture record. It binds one attester to one exact subject, with chain-derived issuance and an explicit expiration. Another attester can make a different claim about the same subject, but it cannot overwrite this attester's record.

**Operator:** Click **View claim transaction**. In the new Explorer tab, point to the confirmed Testnet transaction, its transaction ID, and the `issue-attestation` contract call. Close the Explorer tab and return to Origin Registry.

> And this is the actual issuance transaction. Anyone can independently inspect when the claim was written, who submitted it, and which registry function was called.

**Operator:** Scroll to **Anyone can write a claim. Leather chooses whom to believe.** Pause on the Open, Local, and Exact cards.

> The model is open issuance, local trust, and exact-principal matching. Origin makes claims inspectable. Leather decides which issuers it recognizes.

### Scene 7 — Public evidence and lifecycle

**Operator:** Switch to tab 3, [Origin evidence](https://origin-evidence.vercel.app/evidence). Wait until **Claims and lifecycle** shows a current burn height and claim count. Point to the attester profile on the left and the claims explorer on the right.

> The evidence surface adds the human-readable layer. It explains who operates the Testnet attesters, what verification method they claim to use, their policy and lifetime limits, and the exact records they have placed on chain.

**Operator:** Click **Claims** in the top navigation. Paste the exact domain-proof subject, `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN.origin-domain-proof`, into the search field. Point to the resulting exact subject, its attester, status, issue and expiry heights, and on-chain evidence links.

> This example is a bounded domain-control attestation. The prototype checked a published HTTPS proof and a SIP-018 signature from the subject's deployer before issuing the claim through an isolated signer.
>
> Even here, the claim is deliberately narrow. It records provenance under a particular attester policy. It does not certify the contract's code or guarantee that a future transaction is safe.

**Operator:** If visible, click **Lifecycle history** once, then close it. Do not open another Explorer tab unless you need a longer ending.

> The explorer discovers lifecycle events, but it reconciles them with current registry state. That matters because an old issuance event should not look active after a claim has expired, been revoked, or been replaced.

### Scene 8 — Closing

**Operator:** Return to tab 1 and leave the three applicant cards visible.

> Origin adds a provenance layer to the wallet decision: exact principals, open evidence, and wallet-owned trust.
>
> It does not replace simulation, post-conditions, or transaction review. It gives the user another critical piece of context before they sign: is this the contract I think it is?

## Shorter cut

To reduce the recording to roughly two and a half minutes:

- Keep the introduction as written.
- Skip Advanced details in the Known-origin popup.
- Remove the final sentence from each wallet scenario.
- On the registry tab, show the three-step lookup and claim transaction, but skip the registry-contract Explorer tab.
- Skip the evidence tab and close immediately after the registry trust-boundary section.

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
- Pre-open the applicant, registry, and evidence tabs in that order. Open Explorer only from the scripted links.
- Leave the registry and evidence tabs at the top of their pages before recording.
- Never approve the contract-call transactions; close each popup after showing it.
- Allow up to 20–30 seconds for a live Testnet lookup.
- Show Advanced details only for the known case.
- Keep the attester signer stopped while filming.
- Do not mutate the canonical claims during rehearsal or filming.
- Record one clean rehearsal before the final take.

## Storybook note

The checked-in storybook is a visual reference, not the recording order. The canonical live sequence is always Known → Unrecognized → Lookalike → Registry proof → optional evidence.

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
