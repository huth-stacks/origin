# Origin Project Status

- **As of:** August 10, 2026
- **Canonical repository:** `https://github.com/huth-stacks/origin`
- **Origin checkout:** `/Users/alexander/Code/contract-provenance-certificate`, branch `main`
- **Leather checkout:** `/Users/alexander/Code/leather-origin-demo`, branch `agent/origin-three-scenario-flow`
- **Product state:** demo-ready proof of concept on Stacks Testnet; not integrated into upstream Leather

Product decisions remain canonical in `origin-hackathon-plan.md`. The presentation sequence is
canonical in `demo-plan.md`; exact operator steps are canonical in `demo-runbook.md`; recording
prompts are in `docs/demo-recording-speaker-notes.md`.

## Demo surfaces

| Surface            | Current location                               | Purpose                                                                 |
| ------------------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Applicant          | <https://origin-iota-ashy.vercel.app>          | Three ordinary `stx_callContract` requests                              |
| Registry explainer | <https://origin-iota-ashy.vercel.app/registry> | How the registry and wallet trust policy work, with real Explorer links |
| Evidence explorer  | <https://origin-evidence.vercel.app/evidence>  | Public attester profile, claim search, and lifecycle history            |
| Leather            | Local unpacked extension build                 | Wallet-owned Origin evaluation and approval UI                          |

The three routes are also available from one local `pnpm demo:dev` process for a source-pinned
recording.

## Live Testnet anchors

| Role                                | Principal or transaction                                             |
| ----------------------------------- | -------------------------------------------------------------------- |
| Registry                            | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`       |
| Registry deployment                 | `0x8a2c71ba986643dab5a4e992e0edecf5b5c6c4752fdd1cbd9f42f572a8646de3` |
| Canonical trusted attester          | `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R`                          |
| Domain-control attester             | `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0`                          |
| Demonstration-unrecognized attester | `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ`                          |
| Known subject                       | `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`              |
| Known claim transaction             | `0xeeaa16f586079c7096433fa77d1496b6816cf294d789c2b84420a81d38279cb6` |

The complete immutable record is in `deployments/testnet-fixtures.json`.

## What is implemented

- A permissionless Clarity v2 registry keyed by `{ attester, subject }`, with replacement,
  revocation, expiration, request replay protection, and complete lifecycle events.
- Seven live Testnet contracts: the registry plus canonical, unrecognized, lookalike,
  domain-proof, lifecycle, and expiry fixtures.
- Five live claims, including one bounded HTTPS/SIP-018 domain-control claim.
- A fictional Acme applicant that sends ordinary SIP-30 requests without identity or trust hints.
- A Leather client that derives the exact target, reads wallet-pinned Testnet state, applies its
  own trusted-attester policy, and fails neutrally.
- Known, unrecognized, unknown, no-longer-valid, loading, and unavailable wallet states.
- A same-name/different-deployer lookalike warning kept separate from provenance.
- Exact principal, attester, registry, and block-height evidence in the approval surface.
- A browser-side event index and evidence explorer that reconcile event discovery with current
  registry map state.
- An isolated domain-attester signer, hardened verifier, durable nonce/transaction journals, and
  exact-bytes broadcaster used for one bounded Testnet issuance.
- A new registry explainer page that links directly to the live registry deployment, known subject,
  and claim transaction on Hiro Explorer.

The requesting application never supplies the displayed organization, attester policy, reference
contract, or verdict. Origin establishes provenance claims, not contract or transaction safety.

## Repository state

- Origin demo-readiness commit `a7b5594` is published on `main` and deployed to production.
- Leather demo-readiness commit `e512e99f9` is published on `agent/origin-three-scenario-flow`;
  no PR has been opened
  against `leather-io/mono`.
- Origin and Leather compatibility records are schema v2 and omit the retired shared-mnemonic
  attester from active trust.
- The domain signer is stopped. Its key, IPC token, databases, and journals remain ignored local
  mode-`0600` state.
- The archived `/Users/alexander/Code/leather-extension-archive` checkout remains reference-only.

## Latest verification

August 10 final demo preflight:

- `pnpm testnet:verify` passed at burn height `4,058`, confirming seven contracts, five claims,
  and the intended unattested lookalike.
- Origin's full `pnpm verify` passed, including formatting, secret scan, Clarity and TypeScript
  checks, the complete test suite, and the production demo build.
- The installed Leather journey against the local final presentation build passed all three live
  provenance states in `14.5s` without broadcasting an application transaction.
- The current v2 storybook capture passed in `18.6s` without broadcasting and was visually checked
  for the canonical attester, registry, issue height, and expiry.
- Leather formatting, typecheck, and unused-export checks passed. Its monorepo lint still stops on
  four pre-existing `apps/web` errors, and Knip still reports the existing 11 unused tool files plus
  `commander`; neither result touches the Origin extension path.
- The registry explainer passed focused static tests, TypeScript, production build, desktop and
  390-pixel browser checks, home-to-registry navigation, and live Explorer-link checks.
- The registry and known-claim Explorer URLs returned HTTP 200.

## Demo rules

- Use a dedicated Chrome profile and a disposable Stacks Testnet wallet.
- Build Leather with `pnpm build:origin-demo`, then reload the unpacked extension.
- Record the whole browser window or display because approvals open in separate windows.
- Present scenarios in this order: Known → Unrecognized → Lookalike.
- Close every transaction approval; do not broadcast a demo application transaction.
- Do not issue, revoke, reissue, fund, or deploy anything during rehearsal or filming.
- Show the registry explainer after the three wallet states to prove the evidence is public.
- Use the evidence explorer only for deeper lifecycle or domain-attester questions.
- Say “known origin,” “trusted attestation,” and “exact principal”; never say “safe,” “official,”
  “certified,” or “verified contract.”

## Remaining actions before recording

1. Build and reload `Leather Origin Demo` in the dedicated Chrome profile.
2. Record one rehearsal, then the final take using `docs/demo-recording-speaker-notes.md`.

Stacks Connect standardization, upstream Leather integration, wallet-recipient recognition, and
production attester governance remain follow-up work rather than demo blockers.
