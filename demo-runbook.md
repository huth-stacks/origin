# Origin Demo Runbook

## Demo outcome

The applicant site sends three ordinary, harmless Stacks Testnet contract calls to a locally built Leather extension. Leather derives the exact target, reads live Origin v2 state, and renders three wallet-owned provenance outcomes. The recording then uses the registry explainer to open the underlying contracts and transactions in Stacks Explorer.

Origin proves public provenance and wallet-owned trust policy. It does not prove that a contract or transaction is safe.

## Current locations

- Origin repository: `/Users/alexander/Code/contract-provenance-certificate`
- Leather repository: `/Users/alexander/Code/leather-origin-demo`
- Applicant: <https://origin-iota-ashy.vercel.app>
- Registry explainer: `http://127.0.0.1:4173/registry` until the production deployment includes it
- Evidence explorer: <https://origin-evidence.vercel.app/evidence>
- Leather build: `/Users/alexander/Code/leather-origin-demo/apps/extension/dist`

## One-time setup

Use a dedicated Chrome profile and a disposable Stacks Testnet wallet. Do not import an account that controls production funds.

### Verify Origin and its live fixtures

```sh
cd /Users/alexander/Code/contract-provenance-certificate
pnpm install --frozen-lockfile
pnpm verify
pnpm testnet:verify
```

### Build the unmistakably labeled Leather demo

Leather requires Node 22.

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm install --frozen-lockfile
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm build:origin-demo
```

In the dedicated Chrome profile:

1. Open `chrome://extensions` and enable Developer mode.
2. Disable the regular Leather extension so two providers do not compete.
3. Choose **Load unpacked** and select the `dist` directory above.
4. Confirm the extension is named **Leather Origin Demo**.
5. Pin it, use a disposable account, and select **Stacks Testnet**.

After rebuilding, press **Reload** on the unpacked extension before rehearsing.

## Start the local presentation build

The local build includes all three routes and is the safest recording target:

```sh
cd /Users/alexander/Code/contract-provenance-certificate
pnpm demo:dev
```

Open these tabs in the same Chrome profile:

1. `http://127.0.0.1:4173/`
2. `http://127.0.0.1:4173/registry`
3. `http://127.0.0.1:4173/evidence`

The deployed applicant and evidence URLs may be substituted after confirming they show the same current v2 data.

On the applicant tab, select **Connect Leather**, approve only the address request, and confirm both the site and wallet are on Stacks Testnet.

## Recording sequence

Never approve the three contract calls. Close each popup after showing its state; this avoids broadcasts and Testnet fees.

### 1. Known origin

On the Acme **Weekly check-in** card, select **Check in**. Confirm:

- `Known origin`
- `Acme`
- `Origin Testnet Attester`
- `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`
- The provenance-not-safety statement
- Separate Deny-mode asset protection

### 2. Unrecognized identity claim

Close the first request. On the Northwind **Bonus check-in** card, select **Check in**. Confirm:

- `Unrecognized identity claim`
- `ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action`
- No promoted attacker-selected organization name

### 3. Unknown lookalike

Close the second request. On the Acme Rewards **Weekly check-in** card, select **Check in**. Confirm:

- `Unknown origin`
- `Potential lookalike contract`
- `ST3B1B5SN96FXEP2EC2SE6K2XWEEBYR7TK70WF6XA.acme-action`
- Same contract name, different deployer

### 4. Registry and Explorer proof

Close the third request and switch to `/registry`.

1. Point out that the registry is a public Clarity contract on Stacks Testnet.
2. Show that attesters publish claims while Leather independently decides whom to recognize.
3. Open the registry contract in Explorer.
4. Open the canonical Acme claim transaction in Explorer.
5. Return to the explainer and connect those public facts to the Known origin result.

Use `/evidence` only as an optional coda for lifecycle and domain-control evidence.

## Automated preflight

Keep `pnpm demo:dev` running, then in another terminal:

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm build:origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin ORIGIN_DEMO_URL=http://127.0.0.1:4173 pnpm --filter @leather.io/extension test:integration specs/rpc-sip30-requests/origin-mock-dapp.spec.ts --project=chromium --config=tests/playwright.origin-demo.config.ts
```

The test starts with no site permission, connects through the normal address request, checks all three approval states against Testnet, and closes without broadcasting.

## Refresh the checked-in storybook

With the local demo server running:

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin ORIGIN_DEMO_URL=http://127.0.0.1:4173 \
  ORIGIN_STORYBOOK_DIR=/Users/alexander/Code/contract-provenance-certificate/docs/storybook/assets \
  pnpm --filter @leather.io/extension test:integration specs/rpc-sip30-requests/origin-storybook.spec.ts --project=chromium --config=tests/playwright.origin-demo.config.ts
```

This capture closes every request without approval and replaces the storybook images only after the current extension build exists.

## Pre-recording checklist

- Run `pnpm testnet:verify` immediately before recording.
- Confirm **Leather Origin Demo**, Stacks Testnet, and the disposable account.
- Use 1440 × 900 or 1920 × 1080 at 100% browser zoom.
- Hide notifications, bookmarks, unrelated extensions, and personal profile details.
- Pre-open applicant, registry, evidence, and the two Explorer targets.
- Keep the sequence Known → Unrecognized → Lookalike → Registry proof.
- Allow up to 20–30 seconds for a live Testnet lookup.
- Open Advanced only for the known case if time permits.
- Keep the attester signer stopped.
- Do not issue, revoke, renew, or reissue canonical claims.
- Record one complete rehearsal before the final take.

## Failure and reset behavior

- No provider: the applicant offers a retryable **Leather required** control.
- Rejected connection: it shows **Connection rejected — retry**.
- Closed request: the card says Leather closed without returning a transaction.
- Timed-out request: check Leather before retrying because the request may still settle.
- Registry timeout or malformed response: Leather shows **Origin unavailable**, never Known origin.
- Wrong scenario wiring: `tests/demo-scenarios.test.ts` fails when a subject diverges from the fixture manifest.

Reload the applicant to reset local connection and request state. Remove the unpacked extension from the dedicated profile after recording. The public Testnet fixtures remain unchanged.
