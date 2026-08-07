# Origin Testnet Attester and Four-Day Roadmap

Status: August 7, 2026

## Executive summary

The current Origin Testnet attester is a dedicated disposable Stacks account that issues narrowly scoped identity claims for exact Stacks principals. It is trusted only because the Leather Testnet build pins its principal in wallet-owned configuration. The registry itself is permissionless and does not decide who is trustworthy.

This is real on-chain Testnet behavior, but it is intentionally not yet a real verification business. The current attester does not perform domain control, KYB, representative-authority checks, audits, or automated revocation. It signs the fixture claim needed to prove the wallet trust model.

The next credible step is an automated domain-control attester: an organization publishes a signed statement under a well-known HTTPS URL, proves control of the contract deployer, and receives a bounded on-chain claim from a wallet-recognized attester. Four focused days are enough to make that path tangible on Testnet without pretending it is production-ready.

## Live Testnet anchors

Stacks Testnet reset on August 6, 2026. The project was redeployed after the reset, preserving the same principals while replacing every transaction ID and block height.

| Item                      | Current value                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry                  | [`ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.origin-registry`](https://explorer.hiro.so/address/ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.origin-registry?chain=testnet) |
| Wallet-trusted attester   | [`ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC`](https://explorer.hiro.so/address/ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC?chain=testnet)                                 |
| Wallet display name       | `Origin Testnet Attester`                                                                                                                                               |
| Known subject             | [`ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`](https://explorer.hiro.so/address/ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action?chain=testnet)         |
| Trusted claim transaction | [`0x57950d…b4025`](https://explorer.hiro.so/txid/0x57950d981c3a596aded2d28c0dec9bd2b225bb68895740eeae305dc2fe0b4025?chain=testnet)                                      |
| Claim                     | `Origin Testnet Attester` says `Acme` is responsible for the exact subject in the role `Demo contract`                                                                  |
| Issued at                 | Bitcoin burn block 2,745                                                                                                                                                |
| Expires at                | Bitcoin burn block 102,745                                                                                                                                              |

The complete public record, including claim issue heights and all contract and claim transaction IDs, is in [`deployments/testnet-fixtures.json`](../deployments/testnet-fixtures.json).

## How the current attester works

### 1. Leather derives the subject

The Acme application sends a normal `stx_callContract` request. Leather decodes the requested contract address and contract name and constructs the exact contract principal itself:

```text
ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action
```

The application does not supply the organization name, role, attester, trust policy, reference contract, or verdict.

### 2. Leather chooses which attesters to query

The Testnet wallet build contains a small discovery list:

- `Origin Testnet Attester`, which is in the wallet trust set.
- A demonstration-unrecognized issuer, queried only so the hostile-claim scenario is deterministic.

This distinction matters: querying an attester does not mean trusting it. The wallet owns both discovery and trust decisions.

### 3. The registry returns one attester-scoped record

The registry stores records under a composite map key:

```clarity
{ attester: principal, subject: principal }
```

The value contains:

```text
issuer-name
role
issued-at
expires-at
revoked
```

`issue-attestation` uses `tx-sender` as the attester. The Stacks transaction therefore authenticates the issuer without a second custom signature scheme. Because the attester is part of the map key, one issuer cannot overwrite another issuer's record.

`get-attestation` is read-only. It returns the current optional record for one exact `(attester, subject)` pair and cannot write state.

### 4. Leather evaluates the record

Leather treats the registry response as untrusted input and independently checks:

1. The claim subject equals the decoded transaction subject.
2. The claim's attester principal is in Leather's trust set.
3. The claim is not revoked.
4. The current Bitcoin burn height is below `expires-at`.
5. The lookup itself completed successfully.

Only a claim that passes all five checks becomes **Known origin**. A registry or network failure is neutral and can never become a known result.

The Origin lookup transport is also wallet-owned. Leather uses the request's chain ID only to decide whether Origin is enabled; the requesting application cannot select the API base URL used for burn height or registry reads. Both calls are pinned to Leather's configured Testnet API.

### 5. Leather controls what enters trusted chrome

For the trusted record, Leather can render `Acme`, `Demo contract`, and `Origin Testnet Attester`. For the demonstration-unrecognized record, Leather shows that a claim exists but quarantines its attacker-selected organization and role strings.

The known-origin surface now links directly to the attester's Testnet Explorer page. Advanced details expose the exact checked principal, attester principal, issue and expiry heights, registry principal, and a registry Explorer link.

## How issuance works today

The current process is operator-driven:

1. `scripts/create-testnet-accounts.ts` creates four disposable accounts from four independent seed phrases and writes them only to ignored local files.
2. The deployer receives faucet STX.
3. `pnpm testnet:fund-accounts` funds the attester and fixture deployers.
4. `pnpm testnet:deploy-fixtures` publishes the registry and three harmless fixture contracts.
5. `pnpm testnet:issue-attestations` signs and broadcasts one trusted claim and one deliberately unrecognized claim.
6. The operator records the confirmed public transaction IDs and block heights in the fixture manifest.
7. `pnpm testnet:verify` performs a secret-free live check of four contract sources, two claims, claim expiry, and the unknown lookalike.

The fixture issuer script sets expiration to the submission burn height plus 100,000 Bitcoin blocks so the narrated demo survives Testnet scheduling and resets. This is a long-lived fixture policy, not the Day 3 issuance policy. The registry derives `issued-at` from the confirmation block's `burn-block-height`; callers cannot choose an arbitrary issue time, so automation must record the confirmed issue height rather than infer an exact lifetime from submission time.

The currently restored fixtures predate the isolated-seed generator and were derived from one shared disposable mnemonic. They remain safe for the narrated offline demo, but that trusted attester must not be placed in a network service. Day 2 rotates the trusted attester to a new independently seeded principal before Day 3 can issue.

## What the current attester does not prove

The Testnet attester does not currently prove:

- legal identity;
- ownership of the `Acme` name;
- control of an internet domain;
- representative authority;
- contract source safety or audit status;
- transaction intent or asset safety;
- production key management quality.

It proves one narrower fact: the holder of the configured Testnet attester key issued the current on-chain record for one exact subject. Leather's decision to trust that key is local wallet policy.

## A credible future attester

### Automated domain-control flow

The most practical bootstrap attester is an automated domain-control service:

```text
Organization
  -> requests a five-minute challenge
  -> signs a structured statement with the subject deployer's key
  -> publishes the statement at /.well-known/stacks-origin.json

Origin attester
  -> fetches the statement over HTTPS
  -> checks domain, freshness, nonce, role, subject, and deployer signature
  -> records its evidence hash and policy version
  -> issues a Testnet attestation bounded to 4,320 burn blocks

Leather
  -> derives the transaction subject
  -> reads the attestation from a configured attester
  -> displays the verified domain, attester, policy, and evidence links
```

The fetch is a signing authorization boundary, not ordinary application data loading. [`domain-control-fetch-security.md`](domain-control-fetch-security.md) defines the required fixed URL shape, redirect denial, SSRF and metadata-address blocking, DNS-rebinding resistance, response limits, signer separation, logging, and adversarial test gate.

For a contract principal, the proof must come from the standard principal that deployed the contract. The off-chain path uses one versioned SIP-018 structured-data message with an Origin-specific domain separator. A multisig or contract deployer that cannot produce that signature uses the on-chain alternative: it broadcasts the server nonce through a dedicated proof fixture, and the attester verifies the confirmed transaction sender before issuance. Both paths bind the exact domain, subject, nonce, attester, and policy version.

The prototype accepts only a registrable eTLD+1 derived with the Public Suffix List. A subdomain may host the file only when the eTLD+1 challenge explicitly delegates that exact canonical subdomain. Shared-platform suffixes such as `github.io` and `vercel.app` do not establish control of the organization named in a claim merely because a tenant controls one hosted subdomain.

Day 3 claims last at most 4,320 Bitcoin burn blocks from submission, approximately one month at the target cadence. Renewal repeats domain and deployer control after 80% of that window has elapsed. A claim never renews silently, and confirmation drift can only shorten the resulting lifetime.

### Attester profile

Leather should never learn who to trust from the transaction request or from an untrusted claim. Instead, each wallet trust-list entry should contain or resolve wallet-controlled metadata:

```text
display name
attester principal
operator website
verification method
policy version and effective date
supported claim types
public evidence format
key-rotation history
revocation policy and response target
status page
security contact
```

The wallet should link to this profile and to the attester principal on Explorer. The profile explains who operates the attester and what it checks; Explorer verifies which principal actually issued the on-chain record. Profile text fetched at runtime is never rendered in trusted wallet chrome. Trusted display names and policy are bundled with Leather; the runtime profile is only an outbound destination unless a future wallet release pins its content hash.

### Evidence and privacy

The registry should remain small. Detailed verification artifacts should normally stay off-chain, with the attestation committing to a canonical evidence document or policy version. Public evidence should prove the narrow fact without publishing KYB documents, personal data, or reusable authentication material.

### Discovery

Leather can directly query every trusted attester because the trust list should remain small. Discovering arbitrary unrecognized claims is different: a production implementation should index issuance and revocation events rather than add an unbounded on-chain list or trust an attester hint from the requesting application.

### Key management and lifecycle

A production operator should separate the public service from the signing key, use an HSM or managed signer, maintain explicit key-rotation records, monitor issuance, and support prompt revocation. The network-facing fetcher must never receive a mnemonic. High-assurance providers may use multisig or governed signing policies, but the wallet still needs an unambiguous mapping from operator profile to active attester principal.

Each Leather trust entry is a wallet-owned ordered list of principals with inclusive `valid-from` and optional exclusive `valid-until` burn heights. A claim is eligible only when its chain-derived `issued-at` falls inside that principal's interval. Rotation adds the new principal and closes the old interval; claims issued by the old key before its cutoff remain eligible only until their own expiry. A compromise may instead remove the old interval entirely, making all of its claims immediately untrusted. For this four-day build the policy ships with the extension; the profile makes no rapid-response SLA promise. A signed out-of-band policy channel is production follow-up, not an untrusted profile fetch.

### Registry v2 migration decision

All known state-model changes are bundled in `origin-registry-v2.clar` so Testnet pays one redeployment and re-issuance cost:

- write calls require `tx-sender` to equal `contract-caller`, preventing an intermediary contract from forwarding a user's transaction authority into issuance or revocation;
- organization and role strings must be non-empty;
- records persist `revoked-at` as an optional burn height;
- issuance and revocation events both contain the complete lifecycle record required by the event index;
- a repeated revoke returns `(ok false)` without emitting another lifecycle event;
- reissuance explicitly replaces the prior record, sets `revoked` to false, and clears `revoked-at` to `none`.

The v2 contract and its direct-call test proxy run only in Simnet today. Deployment, isolated-attester rotation, fixture predeployment, manifest replacement, re-issuance, Leather configuration changes, and a fresh live verification are one coordinated Day 2 cutover. The current live v1 registry remains the canonical demo until that decision is executed.

### Optional KYB providers

KYB is an attester class, not a protocol requirement. A participating provider could verify legal entity, representative authority, principal control, and the exact operational contract before issuing from its own recognized principal. Leather could describe that provider's verification method without converting provenance into a general safety score.

## Recommended four-day build

The highest-value plan is to make one real issuance lifecycle work end to end rather than add more static scenarios.

### Day 1 — Evidence-complete wallet UX

Status: substantially complete.

- Render full warning copy in review captures.
- Rename the generic trusted issuer to `Origin Testnet Attester`.
- Add attester and registry Explorer links.
- Restore all fixtures after the Testnet reset.
- Add a direct Stacks.js fixture deployment command.
- Refresh the storybook from the restored live state.

Acceptance: every provenance state is legible, every trusted result has inspectable on-chain anchors, and the live verifier passes.

### Day 2 — Public attester profile and claim explorer

- Publish a wallet-owned attester profile page and machine-readable profile document.
- Show operator, principal validity intervals, method, policy version, revocation policy, and status. Treat this page only as linked explanatory content; trusted Leather labels remain bundled.
- Build the minimal event index now. Fetch the [Hiro contract-events endpoint](https://docs.hiro.so/en/apis/stacks-blockchain-api/reference/smart-contracts/events), retain only this registry's `print` events, decode the versioned issue/revoke tuples, page to the last stored event, and use `get-attestation` as current-state truth.
- Build a small claim explorer on that index for subject, organization, role, issue height, expiry, status, issuance transaction, and registry. The checked-in manifest remains deployment evidence, not the enumeration source.
- Link the Leather known-origin state to both the profile and Explorer.
- Freeze and deploy the bundled v2 registry once, rotate the trusted attester to an independently seeded principal, and reissue the canonical claims.
- Predeploy the Day 3 organization and Day 4 lifecycle fixture contracts so later work does not wait on Testnet confirmation.

Acceptance: a user can answer “who did Leather trust, what do they claim to verify, and where is the on-chain proof?” without reading source code; a newly issued claim appears without editing the manifest; and v2 plus the isolated key pass a fresh live verification.

### Day 3 — Domain-control issuance prototype

- Define one canonical, versioned `stacks-origin.json` challenge document rather than a general-purpose claim schema.
- Publish the exact JSON shape and a curl example first; build a developer page only if the security and lifecycle gates finish early.
- Implement and adversarially test every control in `domain-control-fetch-security.md` before enabling a broadcast path.
- Verify either a domain-separated SIP-018 deployer signature or the confirmed on-chain multisig proof, plus the hardened well-known HTTPS response and eTLD+1 policy.
- Issue a Testnet attestation capped at 4,320 burn blocks through the isolated signer and rotated attester principal.
- Persist only public request status and evidence commitments; keep the signing key outside application logs and client code.

Acceptance: a second fictional organization can prove domain plus deployer control and receive a real Testnet claim without editing Leather's code.

### Day 4 — Lifecycle, recovery, and demo polish

- Add a separate lifecycle fixture so revocation never destroys the canonical known demo.
- Demonstrate issue, known, revoke, no-longer-valid, and reissue transitions.
- Make reset recovery produce an updated public manifest automatically.
- Add end-to-end tests for profile links, issuance, revocation, registry failure, and capture stability.

Acceptance: the demo shows not just a static badge but an attester operating a claim through its lifecycle on Testnet.

## Scope to avoid in four days

Do not spend the four days on mainnet deployment, real KYB document handling, generalized assurance scores, decentralized attester governance, a general-purpose claim schema, or production custody claims. Do not ship an unhardened outbound fetch, shared-seed material in the online attester, requesting-site attester hints, runtime profile text in trusted chrome, or “verified”/“safe” vocabulary. The build has one versioned domain-control challenge and one minimal registry event index; neither is a generalized identity platform.

## Recommended product narrative after four days

> Origin is an open registry with wallet-owned trust. A domain can prove control of its deployer, a recognized attester can issue or revoke a narrow claim on Testnet, and Leather can verify the exact transaction principal without trusting the requesting site. The wallet shows who attested, what they checked, and where the evidence lives—without calling provenance a safety guarantee.
