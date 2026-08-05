# Origin Demo Runbook

## Demo outcome

A fresh mock-site origin connects to a locally built Leather extension, requests three harmless Stacks Testnet contract calls, and produces three different wallet-owned provenance results from live Origin registry state.

The demonstration proves that the wallet can derive and label the exact transaction principal without accepting identity, attester, trust-policy, canonical-contract, or verdict data from the requesting site. It does not prove that a contract or transaction is safe.

## Known-good checkpoints

| Surface                         | Checkpoint  | Evidence                                                                                             |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| Origin registry and fixtures    | `a40d080`   | Four live contracts, two claims, and one unattested lookalike in `deployments/testnet-fixtures.json` |
| Mock dapp                       | `8b0de1c`   | Retryable late provider injection, Testnet connection, and three manifest-pinned requests            |
| Leather live registry client    | `2675a3142` | Configured-attester reads and fail-neutral evaluation                                                |
| Leather three-scenario coverage | `ddee4f3e2` | Known, unrecognized, lookalike, and independent post-condition assertions                            |
| Leather live mock-dapp flow     | `2f2dcaf02` | Fresh connection followed by all three live Testnet states                                           |

The Leather checkpoints are local because this workspace has no authorized writable Leather fork. They are consecutive commits on `agent/origin-three-scenario-flow` in `/Users/alexander/Code/leather-origin-demo`.

## One-time setup

Use a dedicated browser profile and a disposable wallet. Do not import a wallet that controls production funds.

### Origin repository

```sh
cd /Users/alexander/Code/contract-provenance-certificate
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

Open the hosted transaction lab in the browser profile containing the unpacked extension:

```text
https://origin-umber-six.vercel.app
```

For a fully local fallback:

```sh
cd /Users/alexander/Code/contract-provenance-certificate
pnpm demo:dev
```

Then open `http://127.0.0.1:4173` in the same browser profile.

1. Select **Connect Leather**.
2. Approve the Stacks Testnet account request in Leather.
3. Confirm the dapp changes to **Leather connected**.

The transaction action remains disabled until this connection succeeds.

## Ninety-second sequence

### 1. Known origin

Select **Reference contract**, then **Inspect in Leather**.

Leather must show:

- `Known origin`
- `Acme`
- `Trusted Test Attester`
- `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`
- The explicit statement that the identity claim does not guarantee contract or transaction safety
- The separate Deny-mode post-condition statement that only fees can move

Narration: the site supplied the transaction, but Leather derived the exact principal and applied its own trusted-attester policy.

### 2. Unrecognized identity claim

Reject or close the first request. Select **Unrecognized claim**, then **Inspect in Leather**.

Leather must show:

- `Unrecognized identity claim`
- `ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action`
- No `Definitely Acme` or `Official contract` text

Narration: the registry is permissionless, but a claim does not make its attester trusted and attacker-selected organization text does not enter the default wallet surface.

### 3. Unknown lookalike

Reject or close the second request. Select **Name collision**, then **Inspect in Leather**.

Leather must show:

- `Unknown origin`
- `Potential lookalike contract`
- `ST3B1B5SN96FXEP2EC2SE6K2XWEEBYR7TK70WF6XA.acme-action`
- The explanation that the same contract name has a different deployer

Narration: deployer extraction is deterministic; the name collision is a separate heuristic and does not become an identity verdict.

Rejecting each request avoids consuming Testnet fees. The fixtures are deliberately state-only—`record-demo-action()` changes only an invocation counter and declares no asset movement—but that design does not turn Origin into a safety guarantee.

## Automated end-to-end preflight

The opt-in Leather test starts with no site permission, approves the dapp's normal `getAddresses` request, then checks all three approval states against live Testnet registry data. The primary preflight targets the production deployment:

```sh
cd /Users/alexander/Code/leather-origin-demo
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin pnpm --filter @leather.io/extension build:ext:test
PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/bin:/bin ORIGIN_DEMO_URL=https://origin-umber-six.vercel.app pnpm --filter @leather.io/extension test:integration tests/specs/rpc-sip30-requests/origin-mock-dapp.spec.ts --project=chromium
```

To test the local fallback, run `pnpm demo:dev` in the Origin repository and replace `ORIGIN_DEMO_URL` with `http://127.0.0.1:4173`. Without `ORIGIN_DEMO_URL`, this live-network test skips so normal Leather CI does not depend on a sibling repository or Testnet availability. The final production-origin run passed fresh connection and all three live states in 14.0 seconds on August 4, 2026 Pacific time.

## Failure behavior

- No injected provider: after a connection attempt, the dapp shows the retryable `Leather required` control and does not enable scenario requests.
- Rejected connection: the dapp shows `Connection rejected — retry`.
- Rejected transaction: the dapp shows `Request rejected — try again` and sends nothing.
- Registry timeout or malformed response: Leather shows `Origin unavailable`, never `Known origin`.
- Slow Testnet response: allow up to 20 seconds before treating the live lookup as failed.
- Wrong scenario wiring: `tests/demo-scenarios.test.ts` fails when a dapp subject diverges from the public fixture manifest.

## Reset

Reload the dapp to reset its local connection and request status. Remove the unpacked extension from the dedicated browser profile after the demo. The Testnet contracts and claims remain public fixtures; no secret material is stored in this repository.
