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
