# Review — Origin `agent/four-day-foundation` + Leather `3ae72d8c4`

Date: 2026-08-08. Three independent review legs: the high-effort code-review skill
(10 finder angles + self-verification) and Codex on the Origin repo, plus an Opus
subagent on the Leather side. Findings below are deduplicated and re-ranked, with the
top security cluster verified directly against source by the orchestrator.

Scope: Origin branch is ~12,500 insertions / 86 files vs base `b6025517` (mostly new
code): the v2 Clarity registry, the domain-control attester (fetch/store/signer/IPC/
broadcaster), Testnet broadcast tooling, and the evidence surface. Leather branch is
35 files / ~2,392 insertions vs upstream `dev` merge-base `d98bd9a61`.

---

## Correctness — Origin (fix before relying on the attester)

### C1. Isolated signer enforces no independent lifetime ceiling (VERIFIED)

`scripts/domain-attester/signer-policy.ts:187`
The signer bounds `expiresAt` only against `verifiedBurnHeight`, and both fields come
from the same caller-supplied authorization object. The signer has no independent chain
read (its only network dependency is the nonce fetch). A compromised/buggy verifier, or
anyone holding the static IPC token, submits `{verifiedBurnHeight: 9_000_000,
expiresAt: 9_004_320}`; both safe-integer checks pass and the relative bound holds, so
the signer signs an `issue-attestation` whose on-chain expiry is millions of burn blocks
past the real tip. The signing-key isolation boundary exists precisely so the signer
independently bounds lifetime; today it does not. Fix: pass a real burn-height reader
into the signer and bound `expiresAt` against the actual tip, not the echoed field.

### C2. Reserved-nonce orphaning bricks the attester (three distinct triggers) (mechanism VERIFIED)

The signer reserves a nonce as `MAX(signer_nonce)+1` and commits it before the signed
bytes can be durably recovered, with no fallback to the network nonce. Three separate
paths strand nonce N and permanently gap the sequence, after which every later
attestation transaction is unconfirmable:

- `scripts/domain-attester/store.ts:278` — `recordSigned` runs the stale-authorization
  sweep before the state check, so a signature produced microseconds before the
  challenge-derived `authorizationExpiresAt` gets flipped to `rejected` after the signer
  already committed nonce N and emitted bytes. The store row ends with no serialized
  transaction; the broadcaster never sees the bytes.
- `scripts/domain-attester/isolated-signer.ts:104` — staleness is validated before the
  idempotent request-ID replay lookup, and the nonce row is committed before
  `makeContractCall`. A crash/socket reset between commit and the caller's `recordSigned`
  loses the bytes; a retry after the short `authorizationExpiresAt` throws `stale` before
  it can return the journaled bytes.
- `scripts/domain-attester/signer-policy.ts:198` — `issuerName` is never length-bounded,
  but the registry types `issuer-name` as `(string-ascii 64)`. A canonical eTLD+1 longer
  than 64 chars (a 63-char label + TLD) yields a signed transaction the contract rejects
  at runtime, stranding the nonce it reserved.
  Root fix is shared: reserve against the network nonce with recovery, or make nonce
  commit + durable-bytes atomic, and add the `<= 64` guard.

### C3. IPC server crashes the sole key-holder on any peer reset (VERIFIED)

`scripts/domain-attester/signer-ipc.ts:81`
Accepted sockets get only `setTimeout` and `data` handlers, never `'error'`. Any local
process that can reach the Unix socket and sends an RST (or exits mid-request) makes the
socket emit `'error'` with no listener, which Node escalates to an uncaught exception:
the isolated signer exits. Self-inflicted variant: if signing exceeds `IPC_TIMEOUT_MS`
(5s), the server destroys the socket, then the async handler calls `socket.end(...)` on
the destroyed stream and throws `ERR_STREAM_DESTROYED`. Either way the process dies,
compounding C2's orphaned nonces. No token required for the reset variant. Fix: attach a
socket `'error'` handler and guard the post-timeout write.

### C4. SSRF service-address / internal-CIDR checks are dead in production (VERIFIED)

`scripts/domain-attester/service.ts:131` + `run-domain-attester.ts:139`
The production service is constructed with no `fetchProof`, so it uses the default
`secureFetchDomainProof` with `serviceAddresses`/`internalCidrs` both `undefined`, and
`network-policy.ts:143-152` short-circuits both branches. The base `isGloballyRoutable`
check still blocks RFC1918/loopback, so classic private-range SSRF is NOT open — but a
domain whose A record equals the attester's own public IP, or a publicly-numbered address
the operator treats as internal, is pinned and fetched. Fix: thread the operator's
service-address set and internal CIDRs into the production construction.

### C5. Evidence theme bleeds onto the Acme applicant surface (Codex P1) (VERIFIED)

`demo/src/main.tsx:10`
`evidence.css` is imported unconditionally, after `styles.css`. Its top-level `:root`
sets `color`, `background`, and `font-family`, and being later in source order it wins
the cascade: on the `/` route the app renders in the evidence Inter/system font and ink
color instead of IBM Plex Sans, even though `<EvidenceApp>` isn't mounted. This is subtle
enough (font substitution) that a functional browser journey passes over it. Fix: scope
the evidence `:root` rules under `.evidence-page` (the file already scopes everything else
that way via `body:has(.evidence-page)`), or lazy-import the stylesheet on the evidence
branch only.

### C6. Evidence page bricks once the registry passes 100 lifecycle events (Codex P2 + skill #6) (VERIFIED)

`demo/src/origin-current-state.ts:146`
`maxPairs` is enforced against the raw one-pair-per-event array before the dedup at
line 153, and `EvidenceApp.tsx:445` passes one pair per lifecycle event. Because the
registry is permissionless, anyone can push past 100 events (101 issuances, or repeated
reissue/revoke) and force the whole public evidence surface into "Registry evidence is
unavailable", even though only a handful of unique `{attester, subject}` pairs exist.
Two-line fix: cap on `uniquePairs.length`, i.e. move the dedup above the cap check.

### C7. Mempool preflight parses the wrong shape and fails the multi-tx flow closed

`scripts/testnet-transaction-preflight.ts:107` (dup at `testnet-deployment-preflight.ts:124`)
`parseMempoolTransaction` expects nested `sender.address` / `sender.nonce`, but the Hiro
mempool schema exposes flat `sender_address` and top-level `nonce`. Every real mempool
entry parses to `null`, so a non-empty mempool always classifies as
`stop / mempool-unavailable`. Only an empty mempool parses (vacuously), which is why
single-tx cutovers never hit it. Any back-to-back multi-recipient funding / multi-issuance
run where the deployer already has a pending tx deterministically stops mid-run, disabling
the exact-pending "wait" path and conflicting-nonce detection. Fail-closed but wrong.
Confirm the `/extended` mempool response shape, then read the flat fields.

### C8. Broadcast-attempted temp file defeats its own crash recovery

`scripts/testnet-transaction-utils.ts:130`
The marker writes `${txId}.attempted.tmp.local.json`, which matches the `.local.json`
glob the journal scanner reads. A crash between `writeFile` and `rename` leaves two files
under the same journal key; the next run either throws "Multiple prepared transactions",
or hits a bare `JSON.parse` `SyntaxError` on the partial temp, and the retry fails
`EEXIST` (`flag: 'wx'`). The crash-safety journal is unrecoverable on exactly the crash it
exists to survive. Fix: use a temp suffix outside the `.local.json` glob (e.g. `.tmp`).

### C9. Renewal gate ignores the on-chain `revoked` flag

`scripts/domain-attester/service.ts:151`
`readCurrentClaim` returns `revoked`, but the renewal branch only computes an 80%-of-
lifetime `renewalHeight` and never checks it. A claim revoked shortly after issuance
(mis-issuance, key rotation, domain changing hands) leaves the subject un-attestable for
~3,400 burn blocks (~24 days) because `burnHeight < renewalHeight` throws "not yet
eligible for renewal" — inverting the intended effect of revocation. Fix: treat
`current.revoked === true` as immediately eligible for fresh attestation.

---

## Correctness — Leather

### L1. `currentBurnBlockHeight` fail-open outside the lookup union

`apps/extension/.../use-origin-evaluation.ts:69`
`currentBurnBlockHeight: query.data?.currentBurnBlockHeight ?? 0` threads the height as a
separate arg. Unreachable today (`ready` is only assigned when `query.data` is truthy),
but if that coupling ever breaks, height 0 means `getInvalidReason` never marks a claim
expired, so an expired attestation renders as "Known origin" — fail-open in the one place
that must fail closed. Fix: move `currentBurnBlockHeight` into `OriginLookupReady` next to
`claims`; the `?? 0` disappears and the unsafe state becomes unrepresentable.

### L2. `trustedAttesters ⊆ discoveryAttesters` is now a hand-maintained invariant

`origin-testnet.compatibility.json:10-30` + `origin-testnet.config.ts:17-31`
The discovery list used to be derived from the trusted list; flattening config into JSON
split it into two hand-kept arrays. Add a trusted attester without mirroring it into
discovery and its attestation is never fetched, so a validly-attested contract renders
"Unknown origin" with no error (the `requiredAttesters` net only inspects attesters that
were queried). Fix: reconstruct the union in `origin-testnet.config.ts`, or assert the
subset at module load next to the existing registry-principal validation.

---

## Simplification & clarity (the priority ask)

### Leather

- **The reviewed commit `3ae72d8c4` is a runtime no-op.** `profileUrl` in
  `origin-testnet.compatibility.json` is read nowhere — repo-wide grep hits only the
  model declaration and the two JSON values. The commit message promises a "public
  evidence profile" but no user-visible surface changed. Either render it in
  `KnownOrigin`/`OriginAdvancedDetails` (with the `rel="noopener noreferrer"
target="_blank"` treatment `OriginExplorerLink` already uses, plus a scheme allowlist),
  or delete the field and both JSON values. Deleting is the honest default.
- `evaluate-origin.ts:121-140` — `evaluateReadyLookup` calls `getInvalidReason` three
  times per claim and has a dead `if (reason)` branch (line 129 already selected on
  `!== null`). Assess each claim once into `{claim, attester, reason}`, then two `find`s.
  Related: the `flatMap` + inner `find` at 114-120 can only ever match one element, since
  `readOriginRegistry` fetches exactly one claim per attester — a `Map` keyed by attester
  says that directly.
- `origin-registry-client.ts:93-102` — `readBurnBlockHeight` guards `burn_block_height`
  twice, `Number.isSafeInteger` before `typeof === 'number'`; reorder so `typeof` comes
  first and one guard subsumes the other.
- `origin-network.ts:8` — trailing slash is stripped from `baseUrl` but not `apiUrl`; a
  stray slash in the JSON makes `isOriginTestnetNetwork` silently false and the Origin
  section never renders. Normalize both sides.
- `origin-details.layout.tsx:321-324` — `getSubject` exists only because `subject` sits on
  some variants but is reached via `provenance.subject` on the ready one. Hoist `subject`
  to a common field on `OriginEvaluation` and delete the helper.

### Origin (surfaced by the reuse/altitude angles, cut from the top-10 as lower severity)

- Duplicated CLI-arg / preflight / journal helpers across the Testnet scripts; the
  mempool-parse bug (C7) is literally duplicated in two files, which is how it survived.
- Per-script journal state machines could share one implementation.
- A live missing-guard bug in `backup-testnet-accounts.ts` argument parsing (flagged by a
  finder; not independently verified here — worth a look).
- O(n^2) event dedup in the evidence path (the same `findIndex`-in-`filter` pattern as
  C6); a `Set` keyed on `attester|subject` is O(n) and clearer.

---

## Verified non-findings (checked, not missed)

- Leather `referenceContracts` deployer (`ST14T2RC...`) is the v1 registry deployer used
  as the "known good" subject across three specs; consistent and intentional, not stale.
- Leather post-`Promise.all` abort check (`origin-registry-client.ts:146`) is load-bearing:
  `allSettled` swallows aborted fetches, so without it an aborted lookup would render a
  confident "Unknown origin" instead of "unavailable".
- Origin base SSRF protection (block non-globally-routable) is intact; only the extra
  service/internal layers are dead (C4).
- AGENTS.md product invariants — registry-failure neutrality, hostile-text quarantine,
  exact-principal display, secrets hygiene — checked clean.
- Clarinet's three permissionless-input warnings (`subject`, `issuer-name`, `role`) are
  documented as intentional in `contracts/README.md`.
