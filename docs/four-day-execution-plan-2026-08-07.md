# Origin Four-Day Testnet Execution Plan

Status: proposed for external review on August 7, 2026

## 1. Purpose

This plan turns the reviewed Origin proof of concept into a more complete Testnet product story over four focused build days. The target is one coherent, inspectable lifecycle:

1. Leather identifies the exact principal in a contract-call transaction.
2. Leather explains which attester it trusts and links to public evidence.
3. A claim explorer discovers registry activity without relying on a hand-maintained fixture list.
4. A fictional organization proves domain and deployer control to an isolated Testnet attester.
5. The attester issues, revokes, and reissues a bounded claim on Testnet.
6. Leather reflects each state without accepting identity or trust hints from the requesting site.

This is a Testnet prototype, not a production identity, KYB, contract-audit, or transaction-safety system.

This document is an implementation proposal and does not itself authorize implementation or external writes. In particular, it does **not** authorize funding accounts, broadcasting transactions, rotating the live wallet trust entry, or changing the deployed demo. Each external-write phase has a separate approval gate.

## 2. Reviewed starting point

### Origin repository

- Repository: `huth-stacks/origin`
- Merged hardening PR: `#13`
- Reviewed head: `514010ad2ff7302e7c903f8c32022a21529e9a0a`
- Merge commit: `b6025517ea94ced10c261e038caf1dd05388193d`
- Owns the registry, Testnet scripts and manifest, Acme demo, public documentation, storybook, future attester, and claim explorer.

### Leather repository

- Repository: `huth-stacks/leather-origin-demo`
- Merged hardening PR: `#2`
- Reviewed head: `a3f2a07c2f410bc33536438ed0ae100d741e0e32`
- Merge commit: `64a1353c6bc8bbb82a90b78f6c9264af72f1e40f`
- Merge target: the fork's `agent/origin-demo-build` staging branch, not upstream Leather.
- Owns decoded-principal derivation, wallet-pinned lookup transport, trust configuration, evaluation, approval UX, and extension tests.

### Verified baseline

- Origin verification passes with 33 contract and application tests.
- Secret-free live Testnet verification passes against the restored v1 deployment.
- Leather's full extension suite passes 613 tests.
- The production-manifest/testing-runtime demo build is labeled `Leather Origin Demo`.
- The captured known, unrecognized, and lookalike states render complete copy and evidence links.
- Registry/network failure is fail-neutral and cannot produce `Known origin`.
- No Tier 1 hardening or review command broadcast a Testnet transaction.

### Deliberately unfinished work

- The live registry is still v1.
- The live trusted attester still comes from the old shared disposable mnemonic and must never be put behind a network service.
- Registry v2 exists and is tested in Simnet only.
- The event index, claim explorer, public attester profile, and domain-control service do not yet exist.
- The Day 3 and lifecycle fixtures have not been deployed.
- The Leather branch has not been rebased or proposed to upstream `leather-io/mono`.

## 3. Product and security invariants

Every work item and review should preserve these constraints:

1. Leather derives the exact transaction subject from the decoded request. The site cannot supply identity, verdict, attester, trust policy, or canonical-contract hints.
2. The registry is permissionless. A claim is trusted only when the wallet independently trusts its attester and all lifecycle checks pass.
3. Attacker-controlled organization and role strings from unrecognized claims never enter trusted wallet chrome.
4. Registry, RPC, parsing, timeout, or trusted-attester failure is neutral or unavailable, never known.
5. Origin provenance remains independent from post conditions, simulation, asset protection, and lookalike warnings.
6. UI language says who attested to responsibility for an exact principal. It never says a contract or transaction is safe, audited, official, legal, or verified in a general sense.
7. Leather's Testnet registry and burn-height reads remain pinned to wallet-owned transport.
8. The network-facing verifier never receives the attester mnemonic or private key.
9. A Testnet broadcast requires an explicit operator command and a reviewed, recorded plan.
10. The canonical known scenario remains available as rollback evidence until the replacement is independently verified.
11. Domain control cannot authorize arbitrary wallet branding: the proven registrable domain determines `issuer-name`, the signed challenge binds it byte-for-byte, and `role` comes from a fixed signer-enforced enum.
12. Registry, attester principals, trust intervals, transport, schema version, profile, and compatibility metadata ship as one versioned wallet configuration. Partial registry/trust reverts are invalid.
13. The old shared-mnemonic attester is absent from every post-cutover trust configuration, including rollback configurations.

## 4. End-state user journeys

The build is successful when these journeys can be shown without explaining hidden setup:

### A. Existing three-scenario wallet journey

1. Install or open the unmistakably labeled `Leather Origin Demo` extension.
2. Open the Acme Testnet site and connect through the normal Leather provider path.
3. Start the unrecognized scenario and see a complete warning that a claim exists but Leather does not trust its issuer. Hostile brand text is not repeated in trusted chrome.
4. Start the known scenario and see `Known origin`, the exact subject, `Origin Testnet Attester`, its Explorer link, the registry link, issue height, expiry, and the separate post-condition signal.
5. Start the lookalike scenario and see no trusted claim plus an independent same-name/different-deployer warning.
6. Reject or approve the harmless transaction normally; Origin does not bypass wallet consent.

### B. Public evidence journey

1. Follow the wallet-configured link from Leather to an attester-operated profile hosted separately from the requesting dapp.
2. See the operator, current and historical principals, validity intervals, verification method, policy version, revocation policy, status, and security contact.
3. Follow a claim link to the claim explorer.
4. Inspect the exact subject, attester, organization, role, issue and expiry heights, current lifecycle state, registry, and issuance/revocation transactions.
5. See a newly issued claim without editing `deployments/testnet-fixtures.json`.

### C. Domain-control issuance journey

1. A fictional organization requests a short-lived challenge for one exact domain and contract subject.
2. The proven eTLD+1 becomes the claim's `issuer-name`; the applicant selects a role from the published enum, and both values are bound into the versioned challenge.
3. It signs the challenge with the subject deployer's standard principal.
4. It publishes the challenge at `https://<domain>/.well-known/stacks-origin.json`.
5. The verifier performs the complete hardened fetch and policy evaluation.
6. The isolated signer issues a claim capped at 4,320 burn blocks.
7. The claim appears in the explorer and Leather recognizes it using wallet-owned configuration, with no change to the requesting dapp.

The on-chain nonce-proof fixture may be predeployed, but multisig/contract-deployer verification is designed-not-implemented during this four-day build.

### D. Lifecycle journey

1. Issue a claim for the dedicated lifecycle fixture and observe `Known origin`.
2. Revoke it and observe `No longer valid`, including the persisted revocation height.
3. Reissue it and observe a fresh active record with `revoked-at` cleared.
4. Show that the event history preserves all three transitions while `get-attestation` supplies current-state truth.

## 5. Delivery strategy and gates

Work proceeds through four gates. A failed gate stops later phases without disturbing the current v1 demo.

| Gate                  | Permitted work                                                                                               | Exit evidence                                                         | External writes                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------- |
| G0: baseline          | Branching, tests, design freeze, local fixtures                                                              | Both merged baselines reproduced                                      | None                                |
| G1: read-only product | Profile, event index, explorer, dry-run cutover package                                                      | Deterministic tests and read-only live index                          | None                                |
| G2: v2 cutover        | Fund isolated roles, deploy v2 and future fixtures, issue canonical claims, update manifest and Leather pins | Confirmed transactions, live verifier, wallet journey, fresh captures | Explicit approval required          |
| G3: live attester     | Domain fetch, proof verification, isolated signer, lifecycle broadcasts                                      | Adversarial security suite and approved issuance/revocation plan      | Separate explicit approval required |

The implementation should use small reviewable PRs. Origin and Leather changes remain separate and are joined by one machine-enforced compatibility record containing the exact schema version, registry principal, trusted-attester principal and validity interval, maximum claim lifetime, fixture subjects, API network, profile URL, and tested commit pair. Leather tests assert that its single versioned configuration equals this record; the Origin verifier asserts that the candidate manifest equals it.

The four-day evidence site is a static browser application hosted on an origin distinct from the Acme requesting dapp. It owns the attester profile and claim explorer. The index runs in the browser; no serverless index is planned.

## 6. Day 1 — Freeze, index core, and cutover preparation

Goal: freeze every immutable decision, build the event-index core against fixtures, provision wall-clock external dependencies, and produce a complete v2 cutover packet without touching Testnet state. Profile and explorer UI construction moves into Day 2 confirmation waits.

### 6.1 Reproduce and freeze the baseline

Tasks:

- Start Origin work from merged `main` and Leather work from the merged fork staging branch.
- Record the exact starting commits in the working PRs.
- Run `pnpm verify` and `pnpm testnet:verify` in Origin.
- Run Leather's full required checks under Node 22 and preserve the documented four unrelated `apps/web` lint errors and Knip baseline rather than attributing them to Origin.
- Confirm that no local account file, mnemonic, private key, environment file, or built extension output is tracked.
- Freeze the complete registry v2 ABI before deployment: contract name, map key/value shapes, public/read-only signatures, response/error codes, string types and bounds, request-ID type, event tags and complete tuple shapes, direct-call guard, expiry layering, replacement/reissue behavior, repeat-revoke behavior, and absence of a permanent tombstone.
- Add `version: u2` to every v2 lifecycle event and expose `get-schema-version`; publish exact tuple vectors. Index decoders are selected by exact configured contract principal and must also validate the in-band version.
- Add a fixed 32-byte request correlator to issue/revoke operations, stored and emitted with lifecycle state, plus attester-scoped replay rejection. Every issuance batch has a reviewed intent ID persisted with its exact arguments and derived request IDs: an identical retry reuses the intent and signed-transaction journals, while renewal or lifecycle reissue requires a new intent ID. The off-chain state machine still persists signed bytes and the locally computed transaction ID before network I/O.
- Keep `revoked-at` as explicit lifecycle metadata and update the canonical schema decision: seven base provenance fields plus v2 lifecycle/request metadata.
- Deliberately keep expiry policy off-chain. The permissionless contract enforces only future expiry; the signer enforces policy and Leather applies a per-attester maximum-lifetime clamp.
- Record the immutable limitations: ASCII does not prevent control/confusable display content, contract-principal attesters are excluded by the direct-call design, reissue clears revocation, and there is no permanent compromise tombstone.
- Add the post-canonical-defect path now: scripts accept a reviewed registry contract name/schema version for a v3-style cutover; wallet trust intervals cap the defective principal; response latency is extension rebuild and redistribution because runtime trust updates remain out of scope.
- Resolve the two accepted Leather maintenance items before adding more network and packaging behavior: compose a caller-provided abort signal with Origin's overall lookup budget instead of replacing it, and replace or mechanically validate the hand-written `generate-manifest.d.ts` declaration against the actual generator.

Acceptance:

- Baseline results and commit pair are recorded.
- v1 remains the canonical live demo.
- The exact v2 source hash, ABI, error table, state/event vectors, expiry layering, limitations, and v3 escape path are reviewable.

### 6.2 Provision external dependencies

- Select and configure a public evidence-site origin distinct from the Acme dapp origin. It will host the attester profile and browser-side claim explorer.
- Select a controlled fictional eTLD+1 for the Day 3 applicant. Provision DNS, valid TLS, and static `/.well-known/stacks-origin.json` hosting.
- Provision controlled negative-test hosts for public-to-blocked DNS, redirect, slow-response, wrong-content-type, and oversized-response cases where local fixtures cannot prove the deployed network behavior.
- Keep the Day 3 challenge API operator-local for this build. It is not an account-bearing public service.
- If the domain, TLS, or test hosts are not usable by early Day 3, select the documented descope rung rather than weakening a security test.

### 6.3 Build the minimal event-index core

Implementation:

- Use Hiro's cursor-paginated v2 smart-contract-logs endpoint for the one configured registry principal; do not mix offset and cursor APIs.
- Fetch an anchored/canonical snapshot to a recorded moving-tip boundary. Persist the returned cursor, reject a non-progressing cursor, and stop with an explicit partial/unavailable result at the configured flood limit.
- Retain only contract-log `print` events produced by the configured registry.
- Select the decoder by exact registry principal from project-owned configuration, never by a friendly name, dapp data, or event text alone. Validate the v2 in-band `version` field as a second check.
- Decode the current v1 and frozen v2 issue/revoke tuple shapes with explicit runtime validation. Backfill a partial v1 revoke only from the preceding indexed issue event for the same `{attester, subject}`; if none exists, keep it explicitly partial. Never backfill historical data from current map state.
- Deduplicate by `(tx_id, event_index)`. Key history by `{attester, subject}` and order same-block events by the endpoint cursor's complete chain order, not arrival time.
- Treat the endpoint as a refreshed canonical history view and replace browser history on each complete refresh. The four-day browser index does not independently detect reorgs because the log payload exposes no index-block hash; this limitation is explicit, and `get-attestation` remains the sole current-state truth.
- Reconcile every indexed subject with the registry's read-only `get-attestation`; map state is authoritative for the current record and events are authoritative only for history/enumeration.
- Preserve transaction IDs and block heights for evidence links.
- Treat malformed, unknown-version, reorged, incomplete, or unavailable data as unavailable. Never synthesize a trusted current state from a partial history.
- Add bounded caching, request deadlines, pagination limits, and explicit stale/partial/unavailable indicators. Event-flood degradation never affects Leather and never disables direct lookup of a manifest-known or user-supplied exact subject.

The four-day implementation fetches and reduces events in the evidence site's browser. Its interface may permit persistent storage later, but no serverless index is in scope.

Tests:

- Single and multi-page ingestion.
- v1 and v2 schema selection, including the partial v1 revoke event.
- v1 `issue(A) -> revoke -> issue(B)`, proving the revoke never inherits B.
- Duplicate-page and duplicate-event idempotence.
- Issue, revoke, reissue ordering.
- Multiple attesters for one subject.
- Same attester across multiple subjects.
- Unknown event and malformed tuple quarantine.
- API timeout, non-2xx, truncated page, and chain-read failure.
- Current map state disagreeing with stale event history.
- Foreign-contract injection, full-refresh event removal, same-block tie ordering, out-of-order pages, cursor non-progress, and pagination exhaustion.
- A newly injected event appears without a manifest edit.

### 6.4 Prepare the v2 cutover packet

Complete all non-broadcasting work:

- Generate independently seeded roles for registry deployer, canonical trusted attester, Day 3 online attester, unrecognized issuer, and new fixture deployers. The online attester is deliberately unable to alter canonical claims.
- Store each seed in its own ignored `*.local.*` file. The signer receives only its raw key/own credential through a restrictive local-only Unix socket or equivalent OS identity; neither verifier nor signer parses a shared multi-role settings file.
- Broaden ignore rules to `**/*.local.*`, scan tracked and untracked-but-unignored paths for secret patterns, and prove the verifier execution identity cannot read the signer credential.
- Update deployment configuration to target `origin-registry-v2` and exclude the Simnet-only `origin-registry-caller` proxy.
- Add the Day 3 proof fixture and Day 4 lifecycle fixture sources and Simnet tests.
- Make all deployment, issuance, verifier, and manifest tooling schema/contract-name parameterized and v2-shaped. The manifest carries the schema discriminator and compatibility record.
- Implement the pending-aware preflight and crash-safe journal before G2. Evidence comes from the confirmed contract endpoint, principal mempool transactions, and latest-nonce `possible_next_nonce` endpoint. States are: exact pending (wait), same nonce/principal with different bytes (stop), exact confirmed (continue idempotently), confirmed mismatched source (stop), prior attempt now absent (operator reconciliation), and mempool evidence unavailable (stop).
- Preserve the existing rejection gate for node responses containing `error`, even when they contain a `txid`.
- Persist intent, nonce, serialized signed bytes, and locally computed transaction ID before network I/O. Generate exact deployment/issuance intent: sender, nonce, fee, contract/function, arguments, expected principal, and expected transaction ID.
- Estimate faucet funding and leave a margin without consolidating role keys.
- Prepare a candidate manifest and one atomic versioned Leather configuration. It explicitly removes the shared-mnemonic attester, adds chain-derived `validFromBurnBlock` and per-attester maximum lifetime, and cannot pair the v2 registry with an old/open-ended trust entry.
- Write a one-page operator checklist with stop conditions and rollback.

G1 acceptance:

- The index core passes fixture and read-only live tests; profile/explorer UI work is queued for Day 2 confirmation waits.
- All new deterministic tests pass.
- The v2 contract and future fixtures pass Simnet.
- The cutover packet names every principal, transaction, cost, expected effect, and verification command.
- A reviewer can approve or reject G2 without asking for missing operational details.

## 7. Day 2 — Coordinated v2 Testnet cutover

Goal: move the demo once to the final registry schema and isolated trusted key, while retaining v1 as rollback evidence.

### 7.1 Approval checkpoint

Before any broadcast, present:

- new public principals and proof that they are independently seeded;
- exact contracts to deploy, confirming the proxy is absent;
- source hashes and intended contract principals;
- funding transfers, per-role minimum balances, and maximum STX exposure;
- exact issuance arguments and absolute `expires-at` integers for the canonical, hostile, and dedicated short-expiry claims;
- the reason the long-lived canonical fixture is exempt from the Day 3 4,320-block policy and an expiry-watch runbook entry;
- the atomic Leather configuration diff, including explicit removal of the old shared-mnemonic attester, chain-derived trust start, maximum claim lifetimes, registry/schema pin, profile, and compatibility record;
- the candidate manifest and promotion procedure;
- stop conditions and rollback path.

Faucet funding is a separate earlier low-risk approval and must be confirmed before the cutover window. An explicit cutover approval is required after this packet is shown. Approval of this plan alone is insufficient.

### 7.2 Execute in dependency order

1. Record current burn height, v1 verifier result, wallet result, and manifest checksum.
2. Confirm every role meets the packet's minimum balance and nonce expectation; insufficient funding stops the cutover.
3. Deploy `origin-registry-v2` through the journaled preflight state machine.
4. Confirm source, schema version, and principal on-chain before continuing. A 404 with a pending deployment is a wait state, not permission to rebroadcast.
5. During confirmation waits, build the profile/explorer work in section 7.3.
6. Deploy the domain-control proof fixture, lifecycle fixture, and dedicated short-expiry fixture. Keep all existing canonical subject contracts unchanged.
7. Issue the canonical trusted claim from the isolated canonical attester at the packet's absolute long-lived expiry.
8. Issue the deterministic unrecognized claim from the separate hostile issuer.
9. Issue the dedicated short-expiry claim using reviewed burn-height arithmetic that makes the Day 4 expired state observable after a bounded wait.
10. Wait for confirmations and read every record directly from v2.
11. Derive the new attester's `validFromBurnBlock` from the canonical claim's chain-read `issued-at`; assert `validFromBurnBlock <= issuedAt`.
12. Generate, but do not promote, the candidate manifest and atomic Leather configuration from confirmed state.
13. Build both repositories against the candidate pair and exercise all existing scenarios without approving a transaction during capture.
14. Only after the complete live journey passes, promote the candidate manifest and matching Leather configuration together and rebuild the published artifacts.

Stop immediately on nonce mismatch, unexpected sender, unexpected contract source/schema, rejected broadcast, unknown transaction state, wrong tuple, wrong issue height, missing event, insufficient balance, any appearance of the old attester in a post-cutover trust configuration, or a proposed compatibility record that differs from the packet.

### 7.3 Build the profile and explorer during confirmation waits

Profile deliverables:

- A human-readable attester-operated profile and machine-readable versioned JSON generated from the same validated source.
- Operator, current/historical principals, validity intervals, network, method, policy version/effective date, supported claim type, evidence format, revocation policy, status, security contact, rotation history, and Explorer links.
- Clear Testnet language. Leather bundles trusted labels and mapping; runtime profile content cannot alter chrome or verdicts.

Explorer containment and display:

- Search/direct lookup by exact subject or attester. A transaction-ID search resolves only transactions proven to touch the configured registry.
- Escape and length-cap all claim strings, strip control characters, disable autolinking, and visually quarantine hostile text.
- Never place claim strings in document titles, metadata, or Open Graph fields.
- Show a dominant unrecognized-attester banner and `noindex` on non-recognized claim pages.
- Resolve attester-to-profile links only from evidence-site configuration, never claim data.
- Show exact principals, active/revoked/expired/replaced/unavailable status, burn heights, registry/lifecycle links, and a clear separation between event history and current map truth.

The fixture manifest remains deployment/recovery evidence, not the enumeration source.

### 7.4 Verify and release

Required evidence:

- Secret-free verifier confirms the v2 source, every fixture source, attester separation, claim fields, issue heights, expiry, unknown lookalike, and no trusted claim on the unrecognized fixture.
- Event index discovers both claims and reconciles them with `get-attestation`.
- Leather shows known, unrecognized, lookalike, and unavailable states correctly.
- Known-origin details show the new attester and registry links.
- Origin and Leather deterministic suites pass.
- Fresh extension build and captures postdate every runtime source change.
- A human reviews Explorer links against the manifest.

Rollback:

- Do not delete, revoke, or relabel v1.
- If v2 deployment or claims fail, keep Leather pinned to v1 and repair scripts offline.
- If v2 chain state is correct but Leather fails, retain the complete prior v1 configuration object. Never combine the v2 registry with the old attester entry or perform a partial pin-only revert.
- For irreversible bad writes, quarantine the new attester from wallet trust, revoke erroneous active claims where safe, reconcile every pending nonce/transaction ID, and record abandoned principals.
- Promote v2 to canonical only after the independent live journey passes.

## 8. Day 3 — Hardened domain-control attester

Goal: let a second fictional organization obtain a bounded Testnet claim through a real proof flow without exposing the signing key to the public verifier.

### 8.1 Freeze the protocol

Define one versioned challenge, not a generalized identity schema. It binds:

- exact canonical eTLD+1; delegated subdomains are not supported in the four-day protocol;
- exact subject principal;
- exact intended attester principal;
- server nonce and request ID;
- policy version;
- issue-request and expiry timestamps;
- `issuer-name`, derived exactly from the proven eTLD+1;
- `role`, selected from a fixed published enum;
- verification method and deployer signature.

Use an Origin-specific SIP-018 domain separator. Standard-principal deployers sign off-chain. The on-chain proof fixture is predeployed, but multisig/contract-deployer verification is deferred as designed-not-implemented.

The verifier and signer enforce byte-for-byte agreement for domain-derived `issuer-name` and the enumerated role. The prototype denies protected/impersonation-prone names, and the operator reviews the first live issuance.

### 8.2 Implement the verifier as an isolated policy engine

Suggested prototype boundary:

```text
public challenge API
  -> durable request/nonce state
  -> constrained HTTPS fetcher
  -> pure proof and policy evaluator
  -> canonical issuance authorization
  -> isolated signer process
  -> Testnet broadcast reconciler
```

The planned target is a local operator service with durable SQLite state and an isolated signer process; only the static challenge document is public. The challenge API is not exposed publicly. A future hosted service requires transactional storage, authenticated service boundaries, and egress controls; an in-memory nonce store is never acceptable for live issuance.

The verifier must implement every control in `docs/domain-control-fetch-security.md`, including fixed URL construction, eTLD+1 policy, redirect denial, public-address validation, DNS pinning, TLS verification, response/decompression limits, total deadline, duplicate-key rejection, replay prevention, rate limits by source address/domain/subject, coarse public errors, restricted logs, and outbound firewall defense in depth. Several concurrent nonces per `(domain, subject)` are permitted so one requester cannot squat on the pair; only one verified authorization may progress for the same attester/subject.

Persist transactional states `challenge-issued -> verified -> authorized -> signed -> broadcast-unknown -> pending -> confirmed/rejected`. Before network I/O, store the canonical authorization, exclusive signer nonce, serialized signed transaction, and locally computed transaction ID. A retry rebroadcasts identical bytes. Unique request-ID/nonce constraints and the one-in-flight attester/subject rule are enforced under `BEGIN IMMEDIATE`.

### 8.3 Implement the signer boundary

- The signer receives one of two separate versioned authorization shapes: domain-policy issue or operator lifecycle revoke/reissue. It never accepts an arbitrary transaction request.
- The signer is reachable only over narrow authenticated local IPC, such as a restrictive Unix socket unavailable from the verifier's namespace. Its credential is a signer-only raw key/own file and never a shared settings mount.
- It allows only Testnet, the reviewed v2 registry, the matching issue/revoke function, its dedicated Day 3 attester, bounded strings, exact subject/request ID, fixed role enum, domain-derived name, fee cap, and a pinned absolute expiry no later than the verified-height ceiling plus 4,320 burn blocks.
- The signer has exclusive nonce authority, a per-day issuance ceiling, kill switch, and denylist containing every canonical demo subject.
- It refuses replayed request IDs, altered arguments, unknown policy versions, stale authorizations, and unsupported contracts/functions.
- It logs request ID and transaction ID but never seed, private key, or mnemonic.
- An uncertain broadcast is reconciled by locally computed transaction ID/request ID before retrying.
- Domain renewal is allowed only after 80% of the current interval. Revocation resets eligibility only for the distinct operator lifecycle authorization used on the dedicated fixture; it does not let ordinary domain requests bypass renewal policy.

### 8.4 Adversarial gate

All security-spec tests must pass using a fake signer. The live key is never used by unit or integration tests. Required cases include blocked address classes, mixed public/private DNS answers, DNS rebinding, all redirect variants, alternate ports, oversized and compressed-oversized bodies, slow streams, malformed/duplicate-key JSON, wrong content type, stale/replayed challenges, wrong domain/subject/signer/attester/policy/name/role, premature renewal, ambient proxy leakage, and altered signer requests.

The G3 packet contains a requirement-to-test evidence table for every fetch-spec rule and demonstrates in the actual execution environment that the outbound firewall is enforced, the real socket uses the validated pinned address while TLS verifies the canonical host, the signer holds only its isolated key, the verifier cannot read it, and the attester/config interval are already wallet-owned.

### 8.5 First live issuance

After a separate G3 approval:

1. Use a fictional organization and controlled public domain.
2. Complete the challenge and proof flow without manual database edits.
3. Review the canonical signer authorization.
4. Broadcast one bounded claim from the isolated attester.
5. Confirm it on-chain and reconcile the request state.
6. Verify it appears in the explorer without editing the fixture manifest.
7. Add it to the wallet discovery/trust test configuration only through a reviewed wallet-owned change; the dapp supplies no hint.

### 8.6 Day 3 descope ladder

Declare the achieved rung by early afternoon:

- Rung A: durable hosted service with isolated signer and full live issuance.
- Rung B, planned target: local durable service, isolated operator signer, public static well-known document, complete adversarial suite, and live issuance.
- Rung C, safe floor: complete adversarial suite with fake signer and no live Day 3 issuance; Day 4 lifecycle uses the isolated canonical/lifecycle operator.

No rung may remove, skip, or weaken a security test class.

Day 3 acceptance:

- The public verifier cannot access the seed.
- Every required adversarial test passes.
- One real Testnet claim is issued through the documented flow.
- The explorer and Leather show the same chain-derived current state.

## 9. Day 4 — Lifecycle, recovery, and complete UX exercise

Goal: prove Origin is an operable lifecycle rather than a static badge and leave a repeatable demonstration package.

### 9.1 Lifecycle controls

- Add operator actions for issue, revoke, inspect, and reissue against the dedicated lifecycle fixture.
- Require the same canonical authorization and isolated signer restrictions for revocation.
- Confirm repeated revocation is idempotent and emits no duplicate lifecycle event.
- Confirm reissuance replaces the record, clears `revoked-at`, and produces a new complete issue event.
- Show the history as issue -> revoke -> reissue while current state comes from `get-attestation`.
- Suppress issuer/role strings from the revoked wallet state; show the exact subject, attester, revocation status/height, and reason without repeating potentially compromised branding.
- Let the dedicated operator lifecycle authorization reissue immediately after revocation; the ordinary domain renewal path remains subject to the 80% threshold.

### 9.2 Reset and recovery

- Make the recovery command generate a proposed manifest from confirmed chain data rather than printing success optimistically.
- Validate every broadcast response, confirmation, source hash, principal, nonce, and issue height.
- Never overwrite the canonical manifest until the entire replacement deployment verifies.
- Produce a machine-readable run report containing planned transactions, actual transaction IDs, confirmation heights, verifier results, and final manifest checksum.
- Preserve the prior manifest and deployment links as rollback history.

### 9.3 Complete UX matrix

Exercise and capture:

| Surface            | Required states                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Extension identity | Installed and visibly labeled `Leather Origin Demo`                                            |
| Connection         | Site ready, connect request, connected                                                         |
| Provenance         | Loading, known, unrecognized, unknown, expired, revoked, unavailable                           |
| Lookalike          | Same contract name/different deployer, independent from provenance                             |
| Details            | Exact subject, attester, issue/expiry/revocation heights, registry, Explorer and profile links |
| Transaction result | Reject, close, timeout, submitted without txid, broadcast with txid                            |
| Explorer           | Active claim, revoked history, reissued current record, unavailable/stale indicator            |
| Attester evidence  | CLI/log transcript for challenge requested, proof accepted, rejected, pending, confirmed       |

Captures must use the final built bundle, postdate all runtime source changes, close each popup, avoid transaction broadcasts unless that exact case is approved, and render complete warning text at the recorded viewport.

### 9.4 Final evidence packet

Publish:

- current architecture and trust-boundary diagram;
- attester profile and machine-readable policy;
- v2 deployment and lifecycle manifest;
- security-test summary;
- full UX storybook with annotations;
- demo runbook and reset/recovery runbook;
- exact Origin/Leather commit pair;
- list of Testnet writes and Explorer links;
- known limitations and post-hackathon work.

Day 4 acceptance:

- A reviewer can reproduce the wallet demo and inspect every public claim without secrets.
- The narrated flow covers issuance, known, revoke, no-longer-valid, and reissue.
- The complete test and capture suite passes from a clean checkout.
- Reset recovery is dry-run by default and cannot overwrite verified state on partial failure.

## 10. Verification matrix

### Origin

- `pnpm verify`
- Simnet v2 issuance, replacement, revocation, expiry, principal, event, and cross-principal-write tests.
- Account isolation, transaction-response, pending-preflight, manifest-generation, event-index, profile-schema, explorer, verifier, proof-policy, and signer-allowlist tests.
- `pnpm testnet:verify` after approved chain changes.

### Leather

- Targeted registry client, trust interval, evaluator, unavailable, UI, link, manifest, and RPC rendering tests.
- Full extension unit suite.
- Full repository commands required by Leather's `AGENTS.md` under Node 22:

```text
pnpm format
pnpm lint
pnpm typecheck
pnpm knip
pnpm --filter @leather.io/extension lint:unused-exports
```

- Compare root lint and Knip results to the recorded baseline; no new failure is accepted.
- Browser tests must prove the subject came from the serialized transaction and not dapp metadata.

### Live but read-only

- Confirm source and state through the wallet-pinned Testnet API.
- Confirm registry/attester/transaction links independently in Explorer.
- Run event pagination against the live contract and reconcile every discovered current claim.
- Test unavailable behavior by controlled RPC failure, not by changing the dapp-selected node.

### Live external writes

- Run only after the applicable approval gate.
- Record intent before signing and chain results after confirmation.
- Never treat a returned transaction ID as confirmation or a response containing `error` as success.

## 11. Risk register and stop conditions

| Risk                                 | Mitigation                                                                         | Stop condition                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Shared or exposed signing seed       | Independent role seed; verifier/signer separation; ignored local secret files      | Any evidence the verifier, logs, Git, browser bundle, or test process can read the seed |
| SSRF or DNS rebinding                | Normative fetch spec, address pinning, egress deny rules, adversarial suite        | Any required fetch-security test missing or failing                                     |
| Partial or duplicate deployment      | Dry-run intent, pending-aware preflight, nonce checks, confirmation reconciliation | Unknown/pending nonce or contract principal                                             |
| Event index lies about current state | `get-attestation` is authoritative; stale/unavailable UI                           | Event/map disagreement without explicit degraded state                                  |
| Runtime profile changes wallet trust | Bundled trust entry; profile is outbound only                                      | Runtime content can change trusted label, principal, or verdict                         |
| Old shared-mnemonic attester trusted | Atomic versioned config; explicit removal and compatibility assertions             | Old principal appears in any post-cutover or rollback trust configuration               |
| Testnet reset or reorg               | Versioned manifests, generated run report, confirmation checks, v1 rollback        | Source/state cannot be independently reproduced                                         |
| UI implies safety                    | Constrained vocabulary and screenshot review                                       | `safe`, `official`, generalized `verified`, or equivalent claim appears                 |
| Fresh evidence mismatch              | Build-before-capture timestamp and commit checks                                   | Captures predate runtime bundle or omit required warning/details                        |
| Scope expansion                      | One schema, one registry, one index, fictional organizations                       | Work requires generalized identity/KYB/governance before core journey passes            |

Known limitations must explicitly record that Leather discovers unrecognized claims only from configured discovery principals, unpacked extension builds do not auto-update and must be reinstalled for trust-config changes, and compromise response requires an extension rebuild and redistribution.

## 12. Explicit non-goals

- Mainnet deployment.
- Real company names or branding without permission.
- KYB/KYC document handling.
- Contract audits, safety scores, or transaction-risk scoring.
- Decentralized attester discovery or governance.
- A general-purpose identity schema.
- Runtime trust-list updates from profiles, claims, or requesting sites.
- Custody claims suitable for production.
- An upstream Leather merge during the four-day build; upstream preparation begins only after the forked prototype is stable and rebased.

## 13. Reviewer decision checklist

The external reviewer should explicitly answer:

1. Are the wallet-owned trust boundary and fail-neutral rules preserved in every new flow?
2. Is the v2 event shape sufficiently versioned and complete before immutable deployment?
3. Does the event index safely distinguish history, current state, stale data, and unavailable data?
4. Is the attester profile incapable of changing trusted wallet chrome at runtime?
5. Is the pending-aware deployment plan safe against duplicate broadcasts and ambiguous node responses?
6. Are all Testnet roles independently seeded and is the public verifier unable to access the signing key?
7. Does the domain fetch design meet every control and adversarial test in the normative security specification?
8. Are nonce consumption, issuance authorization, and uncertain-broadcast reconciliation durable and replay-safe?
9. Are the proposed 4,320-block lifetime and 80% renewal threshold appropriate for the prototype?
10. Are rollback and stop conditions sufficient to preserve the current known-good v1 demo?
11. Can every user-visible claim be traced to exact wallet configuration or public chain state without trusting the dapp?
12. Is any task unnecessary for demonstrating the issuance-to-revocation lifecycle within four days?

## 14. Definition of done

The four-day extension is complete only when:

- the original three-scenario demo still passes;
- v2 and the isolated attester are canonical and independently verified;
- the profile and event-backed explorer are public and accurate;
- one fictional domain completes the hardened proof and bounded issuance flow;
- a separate fixture completes issue, revoke, and reissue;
- Leather renders the correct state for each transition from wallet-derived subjects and wallet-owned trust policy;
- all deterministic, live read-only, approved live-write, and browser verification passes;
- the final evidence packet contains no secret and exactly records every chain write; and
- v1 remains available as documented rollback evidence until the final review accepts v2.
