# Origin Demo Runbook

## Demo outcome

A fresh mock-site origin connects to a locally built Leather extension, requests three harmless Stacks Testnet contract calls, and produces three different wallet-owned provenance results from live Origin registry state.

The demonstration proves that the wallet can derive and label the exact transaction principal without accepting identity, attester, trust-policy, canonical-contract, or verdict data from the requesting site. It does not prove that a contract or transaction is safe.

## Known-good checkpoints

| Surface                         | Checkpoint  | Evidence                                                                                             |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Origin registry and fixtures    | `a40d080`   | Four live contracts, two claims, and one unattested lookalike in `deployments/testnet-fixtures.json` |
| Acme demo redesign              | `8b9251d`   | Final product-site UX, resilient provider flow, responsive capture, and adversarial-review fixes     |
| Leather live registry client    | `2675a3142` | Configured-attester reads and fail-neutral evaluation                                                |
| Leather three-scenario coverage | `2f2dcaf02` | Fresh connection, all live states, and independent post-condition assertions                         |
| Leather approver redesign       | `e6675e94d` | Native approver section, advanced details, exact principals, and final review fixes                  |

The current reviews are [Origin PR #11](https://github.com/huth-stacks/origin/pull/11) and [Leather fork PR #1](https://github.com/huth-stacks/leather-origin-demo/pull/1). Neither changes upstream Leather until a separate `leather-io/mono` proposal is opened.

## One-time setup

Use a dedicated browser profile and a disposable wallet. Do not import a wallet that controls production funds.

### Origin repository

```sh
cd /Users/alexander/Code/origin-feat-demo-visual
pnpm install --frozen-lockfile
pnpm verify
pnpm testnet:verify
```

### Leather repository

Leather requires Node 22 for its supported local toolchain.

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm install --frozen-lockfile
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension build:dev
```

The development build is emitted to:

```text
/Users/alexander/Code/leather-origin-demo/apps/extension/dist
```

In the dedicated Chrome profile:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select the `dist` directory above.
4. Create or import a disposable wallet and leave production funds out of this profile.

The development build currently completes with the baseline missing `.env`, stale Browserslist data, and `HiroMessage` re-export warnings recorded for this checkout. A successful `webpack ... compiled` result is the build gate.

## Start the demo

The public URL is the release target. If its page title is still `Origin · Transaction Lab`, Vercel has not yet promoted the Acme build and the local branch should be used instead:

```text
https://origin-umber-six.vercel.app
```

For a review pinned to the final Acme source, use the local worktree because the PR preview is protected by Vercel SSO:

```sh
cd /Users/alexander/Code/origin-feat-demo-visual
pnpm demo:dev
```

Then open `http://127.0.0.1:4173` in the same browser profile.

1. Select **Connect Leather**.
2. Approve the Stacks Testnet account request in Leather.
3. Confirm the dapp changes to **Leather connected**.

The transaction action remains disabled until this connection succeeds.

## Ninety-second sequence

The site presents three check-in request cards inside the fictional Acme product. Cards one and three are byte-identical except for the exact target principal and the sending host; only the wallet separates them.

### 1. Known origin

On the **Weekly check-in** card from `acme.example`, select **Check in**.

Leather must show:

- `Known origin`
- `Acme`
- `Origin Testnet Attester`
- `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`
- The explicit statement that the identity claim does not guarantee contract or transaction safety
- The separate Deny-mode post-condition statement that only fees can move

Narration: the site supplied the transaction, but Leather derived the exact principal and applied its own trusted-attester policy.

### 2. Unrecognized identity claim

Reject or close the first request; the card reports "Declined in Leather. Nothing was signed." On the **Bonus check-in** card from `northwind.example`, select **Check in**.

Leather must show:

- `Unrecognized identity claim`
- `ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action`
- No `Definitely Acme` or `Official contract` text

Narration: the registry is permissionless, but a claim does not make its attester trusted and attacker-selected organization text does not enter the default wallet surface.

### 3. Unknown lookalike

Reject or close the second request. On the second **Weekly check-in** card, the one from `mail.acme-rewards.example`, select **Check in**.

Leather must show:

- `Unknown origin`
- `Potential lookalike contract`
- `ST3B1B5SN96FXEP2EC2SE6K2XWEEBYR7TK70WF6XA.acme-action`
- The explanation that the same contract name has a different deployer

Narration: deployer extraction is deterministic; the name collision is a separate heuristic and does not become an identity verdict.

Rejecting each request avoids consuming Testnet fees. The fixtures are deliberately state-only—`record-demo-action()` changes only an invocation counter and declares no asset movement—but that design does not turn Origin into a safety guarantee.

## Automated end-to-end preflight

The opt-in Leather test starts with no site permission, approves the dapp's normal `getAddresses` request, then checks all three approval states against live Testnet registry data. The source-pinned preflight targets the final Acme branch locally:

```sh
cd /Users/alexander/Code/origin-feat-demo-visual
pnpm demo:dev
```

Keep that server running, then use a second terminal:

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension build:ext:test
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin ORIGIN_DEMO_URL=http://127.0.0.1:4173 pnpm --filter @leather.io/extension test:integration tests/specs/rpc-sip30-requests/origin-mock-dapp.spec.ts --project=chromium
```

Repeat the same command with `ORIGIN_DEMO_URL=https://origin-umber-six.vercel.app` as the release gate once the public page serves the Acme UI. Without `ORIGIN_DEMO_URL`, this live-network test skips so normal Leather CI does not depend on a sibling repository or Testnet availability. Before the redesign, the final production-origin run passed fresh connection and all three live states in 14.0 seconds on August 4, 2026 Pacific time; the redesigned local Acme journey subsequently passed in 13.2 seconds.

## Screenshot capture

`tests/specs/rpc-sip30-requests/origin-screenshots.spec.ts` in the Leather repository walks the full journey (site, connect, all three approval states with the advanced disclosure, one approved broadcast, mobile) and writes PNGs to `ORIGIN_SHOT_DIR`. Vercel preview deployments sit behind SSO, so captures run against the local dev server with a company-shaped hostname mapped inside the capture browser:

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin \
ORIGIN_DEMO_URL=http://acme.example:4173 \
PLAYWRIGHT_CHROMIUM_EXTRA_ARGS='--host-resolver-rules=MAP acme.example 127.0.0.1' \
ORIGIN_SHOT_DIR=output/playwright/shots \
pnpm --filter @leather.io/extension test:integration tests/specs/rpc-sip30-requests/origin-screenshots.spec.ts --project=chromium
```

The Vite demo config allows the `acme.example` host, so the Leather approver header reads `Requested by acme.example` in captures. The known-origin scenario approves and broadcasts one real Testnet transaction; the other two scenarios reject.

## Failure behavior

- No injected provider: after a connection attempt, the dapp shows the retryable `Leather required` control and does not enable scenario requests.
- Rejected connection: the dapp shows `Connection rejected — retry`.
- Rejected transaction: the card shows `Declined in Leather. Nothing was signed.` and sends nothing.
- Registry timeout or malformed response: Leather shows `Origin unavailable`, never `Known origin`.
- Slow Testnet response: allow up to 20 seconds before treating the live lookup as failed.
- Wrong scenario wiring: `tests/demo-scenarios.test.ts` fails when a dapp subject diverges from the public fixture manifest.

## Reset

Reload the dapp to reset its local connection and request status. Remove the unpacked extension from the dedicated browser profile after the demo. The Testnet contracts and claims remain public fixtures; no secret material is stored in this repository.
