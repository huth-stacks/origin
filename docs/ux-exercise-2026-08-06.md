# Origin UX Exercise Plan — August 6, 2026

## Outcome

By the end of today's review, one evidence folder and one written disposition should show whether
the complete Acme-to-Leather journey is demo-ready across desktop, mobile, happy paths, trust
states, failure states, and transaction outcomes.

The review has two lanes:

1. **Live lane:** the real Acme dapp, locally built Leather, and live Testnet registry state.
2. **Deterministic lane:** mocked registry and network responses for states that should not be
   manufactured on the public Testnet fixtures.

Use a dedicated browser profile and a disposable Testnet wallet. Do not use a wallet that controls
production funds. Reject every request except the one explicitly marked for approval.

## Review target

| Surface                        | Required checkout                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acme demo and Origin contracts | `/Users/alexander/Code/origin-feat-demo-visual`, branch `feat/demo-visual-redesign`, commit `8b9251d` plus documentation-only working-tree changes |
| Leather extension              | `/Users/alexander/Code/leather-origin-demo`, branch `agent/origin-visual-polish`, commit `e6675e94d`                                               |
| Evidence                       | `/Users/alexander/Code/leather-origin-demo/output/ux-review/2026-08-06`                                                                            |

Do not use the public production demo for visual sign-off today: it still serves the pre-redesign
transaction lab. The PR preview is behind Vercel SSO, so the local Acme server is the stable target.

## Schedule and gates

| Block                                 |    Timebox | Gate                                                                                                                 |
| ------------------------------------- | ---------: | -------------------------------------------------------------------------------------------------------------------- |
| Environment and automated preflight   | 25 minutes | Both repositories build; live Testnet fixtures verify; deterministic and live browser suites pass                    |
| Primary desktop journey               | 30 minutes | Connection, three provenance cases, decline, approval, advanced details, and post-condition independence are correct |
| Complete wallet state matrix          | 30 minutes | Every verdict and lookup condition renders with the expected tone, exact principal, and safe copy                    |
| Site resilience and responsive review | 25 minutes | Failure recovery, handoff, confirmed state, desktop, and mobile layouts remain legible and operable                  |
| Evidence triage and disposition       | 20 minutes | Every finding has severity, owner, evidence, and a ship/fix decision                                                 |

Stop the review on any P0 trust-boundary failure. Visual polish findings do not invalidate already
verified security properties, but they must be recorded rather than silently accepted.

## 1. Automated preflight

### Terminal A — Origin

```sh
cd /Users/alexander/Code/origin-feat-demo-visual
pnpm install --frozen-lockfile
pnpm verify
pnpm testnet:verify
pnpm demo:dev
```

Keep the server running at `http://127.0.0.1:4173`.

### Terminal B — Leather

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
pnpm install --frozen-lockfile
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
pnpm --filter @leather.io/extension build:ext:test
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
pnpm --filter @leather.io/extension test:unit \
src/app/features/rpc-stacks-transaction-request/stacks/origin
```

Run the live assertion journey:

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
ORIGIN_DEMO_URL=http://127.0.0.1:4173 \
pnpm --filter @leather.io/extension test:integration \
tests/specs/rpc-sip30-requests/origin-mock-dapp.spec.ts --project=chromium
```

Run the deterministic contract-call suite:

```sh
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
pnpm --filter @leather.io/extension test:integration \
tests/specs/rpc-sip30-requests/rpc-stx-call-contract.spec.ts --project=chromium
```

Preflight passes only when all commands exit successfully and `testnet:verify` confirms the trusted
claim is still current.

## 2. Capture the complete live journey

Create fresh screenshots through the real extension flow without approving a transaction:

```sh
cd /Users/alexander/Code/leather-origin-demo
pnpm build:origin-demo
ORIGIN_DEMO_URL=http://127.0.0.1:4173 \
ORIGIN_STORYBOOK_DIR=/Users/alexander/Code/contract-provenance-certificate/docs/storybook/assets \
pnpm --filter @leather.io/extension test:integration \
tests/specs/rpc-sip30-requests/origin-storybook.spec.ts --project=chromium
```

This captures the extension install label, Acme page, connection approval, all three provenance
states, and every advanced disclosure. Every transaction popup is closed, so no call is broadcast.

Review the captures in this order:

1. `01-extension-installed.png`: unmistakable demo extension label.
2. `02-site-ready.png` and `03-connect-request.png`: page hierarchy and account permission clarity.
3. `04-site-connected.png`: connected site before a transaction request.
4. `06-known.png` and `09-known-advanced.png`: neutral identity treatment, trusted
   attribution, limitation sentence, exact subject, distinct issued/expiry heights.
5. `05-unrecognized.png` and `08-unrecognized-advanced.png`: no attacker-selected organization or role; untrusted
   attester principal remains inspectable.
6. `07-lookalike.png` and `10-lookalike-advanced.png`: unknown verdict remains separate from the warning; both
   deployers are visually comparable.
7. `site-confirmed.png`: the approved check-in updates the streak and activity feed without implying
   that Origin certified transaction safety.
8. `site-mobile.png`: no clipping, overlap, horizontal scroll, or undersized primary controls at
   390 by 844.

## 3. Manual primary-journey checks

Use Chrome with the unpacked extension from
`/Users/alexander/Code/leather-origin-demo/apps/extension/dist` and a disposable wallet.

### Connection

- Open `http://127.0.0.1:4173` in a fresh site-permission state.
- Select `Connect Leather`, approve the Testnet account, and confirm `Leather connected`.
- Reload once and confirm the site does not enter a duplicate connection-popup race.

### Known origin

- Select `Check in` on the `acme.example` weekly card.
- Confirm the exact `acme-action` principal, `Known origin`, `Acme`, and
  `Origin Testnet Attester` are visible.
- Confirm the safety-limitation sentence and the independent deny-mode post-condition message.
- Open Advanced details and inspect subject, attester, issued block, expiry block, and registry.
- Reject once and verify `Leather closed without returning a transaction.` appears under the correct card without claiming whether Leather signed.
- Repeat and approve once. Verify the streak reaches ten and a new activity row appears.

### Unrecognized claim

- Select the `northwind.example` bonus card.
- Confirm `Unrecognized identity claim` and the exact `claimed-action` principal.
- Confirm `Definitely Acme` and `Official contract` never appear.
- Confirm the claim signer is inspectable and clearly marked untrusted, then reject.

### Unknown lookalike

- Select the `mail.acme-rewards.example` weekly card.
- Confirm `Unknown origin` and `Potential lookalike contract` appear as separate signals.
- Compare the known deployer with the current deployer; confirm neither is truncated beyond
  recoverability and the exact checked principal remains available in Advanced details.
- Confirm no Acme or trusted-attester identity is applied to the lookalike, then reject.

## 4. Complete wallet state matrix

The three live fixtures deliberately remain stable. Exercise destructive or transient states with
Playwright routing in the deterministic contract-call suite rather than changing public claims.

| State                  | How to exercise today                                                   | Required UX result                                                                                      |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Loading                | Delay both configured `get-attestation` responses by three seconds      | Stable skeleton layout; `Checking who published this contract`; confirm action remains understandable   |
| Unavailable            | Abort `/v2/info` or return a malformed registry response                | `Origin unavailable`; never known; exact subject still available; signing safety signals remain present |
| Plain unknown          | Use an unattested contract whose name is not in the reference set       | `Unknown origin`; no lookalike warning; copy says absence alone is not a warning                        |
| Revoked trusted claim  | Mock a trusted tuple with `revoked: true`                               | `Attestation no longer valid`; withdrawal explanation; previous attester shown; no known label          |
| Expired trusted claim  | Mock `expires-at` equal to or below the mocked burn height              | Expiration block shown; no known label; treatment is equivalent in severity to revoked                  |
| Known plus lookalike   | Mock a trusted current claim for a same-name/different-deployer subject | Known verdict and lookalike warning both render; neither suppresses the other                           |
| Allow-mode transaction | Use the existing allow-mode browser fixture                             | Asset-transfer warning remains prominent regardless of Origin state                                     |

The current component tests assert all seven state combinations, but they do not create browser
screenshots for the first six deterministic rows. Before calling the visual matrix complete, extend
`rpc-stx-call-contract.spec.ts` or add a focused `origin-state-matrix.spec.ts` that uses the existing
route-mocking pattern and writes screenshots to `output/ux-review/2026-08-06/state-matrix`.

## 5. Site failure and recovery matrix

- **No provider:** open the site without Leather and confirm the control becomes retryable rather
  than enabling transaction requests.
- **Rejected connection:** reject `getAddresses`; confirm the site returns to an actionable idle
  state and does not immediately open another popup.
- **Rejected transaction:** confirm decline is neutral language, associated with the right card,
  and does not claim a transaction was sent.
- **Response timeout:** hold the provider response past the site timeout; confirm the card returns
  to idle rather than reporting a decline.
- **Slow registry:** throttle the registry requests; confirm the handoff and wallet loading states
  look intentional for at least 20 seconds.
- **Keyboard:** complete connection, disclosure, decline, and scenario navigation without a mouse;
  verify visible focus and logical order.
- **Zoom:** repeat the known and lookalike approvals at 200 percent browser zoom.
- **Reduced motion:** enable reduced motion and confirm no information depends on animation.

## 6. Evidence and disposition

Create `output/ux-review/2026-08-06/findings.md` with one row per finding:

| ID  | Surface | Scenario | Severity | Evidence file | Owner repo | Disposition |
| --- | ------- | -------- | -------- | ------------- | ---------- | ----------- |

Severity gates:

- **P0:** trust-boundary violation, wrong principal, attacker text promoted, known on failure, or
  Origin suppresses a transaction-safety signal. Stop and fix before any demo.
- **P1:** user can approve the wrong scenario, cannot recover, cannot inspect required identity
  detail, or a core state is inaccessible. Fix today and rerun the affected lane.
- **P2:** material hierarchy, clipping, responsive, keyboard, or copy problem. Fix before public
  presentation when feasible; otherwise record an explicit owner and deadline.
- **P3:** non-blocking polish. Record without expanding hackathon scope.

Today's UX exercise is complete when:

- both automated lanes pass;
- all live screenshots exist and have been reviewed;
- every row in the wallet and site matrices has a pass or finding ID;
- no P0 or unresolved P1 remains;
- the final disposition states `demo-ready`, `demo-ready with recorded P2/P3`, or `not ready`.
