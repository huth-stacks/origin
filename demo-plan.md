# Origin Demo Plan

## Outcome

A user initiates a harmless Stacks Testnet contract call from a mock site. A locally built Leather extension derives the exact contract principal from the transaction request and shows provenance from the Origin registry before approval.

The proof of concept is intended to support a later proposal for an Origin addendum to Stacks Connect. The hackathon validates the wallet behavior directly in Leather; it does not modify Stacks.js, Connect, or the wallet request protocol.

The demo must make one distinction memorable:

```text
A claim exists != Leather trusts the claim's attester
```

## Demonstration sequence

Target length: 90 seconds, plus an optional question-driven lifecycle coda.

### 1. Known origin

The mock site presents an action as an Acme contract interaction and requests a state-only call to the known Testnet fixture.

Leather shows:

- **Known origin: Acme**
- The exact contract principal decoded by Leather
- The configured trusted Test Attester
- The claimed role
- Asset protection as a separate post-condition signal

Narration: the site supplied the transaction, but it did not supply the identity verdict.

### 2. Unrecognized identity claim

The mock site requests the same harmless function on a second contract. The configured demonstration-untrusted attester has issued a claim for it.

Leather shows:

- **Unrecognized identity claim**
- No attacker-selected organization name in the default wallet surface
- The exact contract principal
- Advanced raw claim details only if they are visually quarantined as untrusted

Narration: Origin is permissionless, while Leather controls which attesters it trusts.

### 3. Unknown lookalike

The mock site requests the function on an unattested contract whose name resembles the known fixture but whose deployer differs.

Leather shows two separate signals:

- **Unknown origin**
- **Potential lookalike contract**

Narration: deployer extraction is deterministic; deciding which contract names are canonical uses the wallet's configured fixture reference set and remains a heuristic.

### Lifecycle coda

The trusted attester revokes the Scenario A record. Repeating the same request shows **Attestation no longer valid** instead of **Known origin**. This is a state transition on Scenario A, not a fourth scenario.

## Transaction design

Each example contract exposes the same state-only public function. All three requests use Deny post-condition mode with no declared asset movements so the demo isolates provenance rather than transaction-risk differences.

Leather must derive the subject as:

```text
contract principal = contractAddress + "." + contractName
```

The mock site must not send an organization name, attestation verdict, attester hint, or canonical-contract hint to Leather.

## Approval UI

The active integration point is:

```text
apps/extension/src/app/pages/rpc-stx-call-contract/rpc-stx-call-contract.tsx
```

Place the Origin section immediately after `ContractCallDetailsLayout` and before fee and nonce controls. The existing post-condition section remains unchanged and independent.

The Origin feature has five provenance states:

1. Known origin
2. Unrecognized identity claim
3. Unknown origin
4. Potential lookalike contract
5. Attestation no longer valid

Loading and registry-unavailable conditions are operational conditions rather than provenance verdicts. A failed lookup must never be rendered as Known origin.

## Data flow

```text
Mock site
  -> stx_callContract request
  -> Leather decodes exact contract principal
  -> Origin evaluator queries configured attesters
  -> evaluator checks trust, expiry, revocation, and lookalike fixture
  -> Leather renders provenance and asset protection independently
  -> user approves or rejects
```

The Testnet build contains two configured attester principals:

- One trusted mock attester
- One demonstration-untrusted attester, queried only so Scenario B is deterministic

Arbitrary unrecognized-claim discovery requires event indexing and is explicitly outside the proof of concept.

## Code boundaries

### Origin repository

This repository owns:

- Clarity registry and Clarinet tests
- Three harmless example contracts
- Testnet deployment plans and fixture manifest
- Mock demonstration site
- Shared fixture values consumed by the demo
- Product, demo, and integration documentation

### Leather monorepo

The Leather modification owns:

- Deriving the subject from decoded RPC transaction options
- Testnet Origin client and configured attester list
- Pure provenance evaluation
- Approval-surface Origin components
- Unit, component, and extension integration tests

### Archived extension repository

`leather-io/extension` is reference-only. It is archived, deprecated, and must not receive demo changes.

### Future Stacks Connect proposal

After the proof of concept, propose the stable parts as a Stacks Connect addendum:

- Principal derivation rules for supported request types
- Shared provenance result types
- Attestation lifecycle semantics
- Wallet-owned trust-policy requirements
- Required separation from post-condition and security verdicts
- Safe rendering rules for untrusted claim data

The application must not supply identity claims, attester hints, trust policy, or a provenance verdict. No Stacks Connect or Stacks.js repository is a hackathon modification target.

## Test plan

### 1. Clarity contract tests

- An attester can issue and replace only its own `{attester, subject}` record.
- A second attester cannot overwrite the first attester's record.
- Revocation changes lifecycle validity.
- Expiration uses `burn-block-height`.
- Wallet and contract principals are accepted by the schema.
- Registry calls move no assets.

### 2. Leather evaluator unit tests

- Model evaluator output as a discriminated union. The unrecognized-claim variant must not contain an organization display-name field.
- Current trusted claim -> Known origin.
- Untrusted claim -> Unrecognized identity claim without its organization name.
- No configured claim -> Unknown origin.
- Trusted revoked or expired claim -> Attestation no longer valid.
- Unknown matching contract name with a different deployer -> separate lookalike warning.
- Known origin never suppresses Allow-mode asset warnings.
- Restrictive post-conditions never upgrade provenance.
- Registry failure never produces Known origin.

### 3. Leather component tests

- Each state renders the approved language and exact principal.
- Known origin uses neutral styling, identifies the trusted attester and role, and states that provenance is not a safety guarantee.
- Unrecognized state does not render attacker-controlled brand text.
- Lookalike warning is visually distinct from the Origin verdict.
- Loading and unavailable behavior are neutral.

### 4. Extension integration tests

- A real `stx_callContract` request reaches the modified approval route.
- The lookup subject comes from decoded `contractAddress` and `contractName`, not site metadata.
- The three fixture requests render their expected states.
- Reject leaves the request unsigned; approve follows Leather's existing harmless Testnet path.
- Existing post-condition warnings remain visible and unchanged.

CI integration tests should use deterministic mocked registry responses. The recorded hackathon demonstration should use live Testnet state.

## Delivery phases

### Phase 0: Workspace and risk spike

1. Clone the active Leather monorepo and archived extension reference.
2. Create the Origin repository.
3. Install the monorepo's pinned Node and pnpm versions.
4. Build the extension unmodified.
5. Insert a hardcoded dummy Origin section and verify it in a locally loaded extension.

The first-half-day checkpoint is whether the approval surface can host the new section cleanly. If not, preserve the demo with a standalone approval preview, while recording that Leather integration remains incomplete.

### Phase 1: Pure evaluation and UI

1. Define the five-state result model as a discriminated union whose unrecognized-claim variant has no organization display-name field.
2. Implement the evaluator without React or network dependencies.
3. Add exhaustive evaluator tests.
4. Implement the Origin approval section with neutral known-origin styling and the explicit safety limitation.
5. Add component tests, including attacker-name quarantine.

### Phase 2: Registry and fixtures

1. Implement the minimal Clarity registry and tests.
2. Implement the three state-only example contracts.
3. Deploy the registry and fixtures to Testnet.
4. Record principals, burn heights, and transaction IDs in a fixture manifest.

### Phase 3: Live integration

1. Implement the read-only Testnet registry client.
2. Configure trusted and demonstration-untrusted attesters locally.
3. Connect the evaluator to the approval route.
4. Implement the mock site using the normal Leather RPC request path.

### Phase 4: Verification and recording

1. Run focused unit and component tests.
2. Run Leather's required format, lint, typecheck, dependency, and unused-export checks.
3. Build the extension and run the three-scenario integration flow.
4. Record the live Testnet demonstration and lifecycle coda.

### Phase 5: Post-hackathon proposal

1. Extract the validated principal-derivation and evaluation interfaces from the Leather implementation.
2. Draft the Stacks Connect addendum without introducing application-supplied trust inputs.
3. Propose the reusable types and evaluator for the appropriate Stacks Connect or Stacks.js package.
4. Validate the addendum with at least one additional Stacks wallet before treating it as an ecosystem standard.

## Completion criteria

The demo is ready when the three scenarios originate on the mock site, open the locally built extension, derive their exact subjects inside Leather, read live Testnet Origin state, preserve post-condition warnings, and render the expected provenance language without trusting site-supplied identity data.
