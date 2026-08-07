# Origin Testnet Attester and Four-Day Roadmap

Status: August 7, 2026

## Executive summary

The current Origin Testnet attester is a dedicated disposable Stacks account that issues narrowly scoped identity claims for exact Stacks principals. It is trusted only because the Leather Testnet build pins its principal in wallet-owned configuration. The registry itself is permissionless and does not decide who is trustworthy.

This is real on-chain Testnet behavior, but it is intentionally not yet a real verification business. The current attester does not perform domain control, KYB, representative-authority checks, audits, or automated revocation. It signs the fixture claim needed to prove the wallet trust model.

The next credible step is an automated domain-control attester: an organization publishes a signed statement under a well-known HTTPS URL, proves control of the contract deployer, and receives a short-lived on-chain claim from a wallet-recognized attester. Four focused days are enough to make that path tangible on Testnet without pretending it is production-ready.

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

The issuer script sets expiration to the current burn height plus 100,000 Bitcoin blocks. The registry derives `issued-at` from `burn-block-height`; callers cannot choose an arbitrary issue time.

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
  -> requests a short-lived challenge
  -> signs a structured statement with the subject deployer's key
  -> publishes the statement at /.well-known/stacks-origin.json

Origin attester
  -> fetches the statement over HTTPS
  -> checks domain, freshness, nonce, role, subject, and deployer signature
  -> records its evidence hash and policy version
  -> issues a short-lived Testnet attestation

Leather
  -> derives the transaction subject
  -> reads the attestation from a configured attester
  -> displays the verified domain, attester, policy, and evidence links
```

The fetch is a signing authorization boundary, not ordinary application data loading. [`domain-control-fetch-security.md`](domain-control-fetch-security.md) defines the required fixed URL shape, redirect denial, SSRF and metadata-address blocking, DNS-rebinding resistance, response limits, signer separation, logging, and adversarial test gate.

For a contract principal, the signer should be the standard principal that deployed the contract. That makes the proof specific to both the internet domain and the on-chain deployer. A future countersignature schema could make the organization's consent to the exact subject relationship independently inspectable.

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

The wallet should link to this profile and to the attester principal on Explorer. The profile explains who operates the attester and what it checks; Explorer verifies which principal actually issued the on-chain record.

### Evidence and privacy

The registry should remain small. Detailed verification artifacts should normally stay off-chain, with the attestation committing to a canonical evidence document or policy version. Public evidence should prove the narrow fact without publishing KYB documents, personal data, or reusable authentication material.

### Discovery

Leather can directly query every trusted attester because the trust list should remain small. Discovering arbitrary unrecognized claims is different: a production implementation should index issuance and revocation events rather than add an unbounded on-chain list or trust an attester hint from the requesting application.

### Key management and lifecycle

A production operator should separate the public service from the signing key, use an HSM or managed signer, maintain explicit key-rotation records, monitor issuance, and support prompt revocation. The network-facing fetcher must never receive a mnemonic. High-assurance providers may use multisig or governed signing policies, but the wallet still needs an unambiguous mapping from operator profile to active attester principal.

### Registry v2 migration decision

All known state-model changes are bundled in `origin-registry-v2.clar` so Testnet pays one redeployment and re-issuance cost:

- write calls require `tx-sender` to equal `contract-caller`, preventing an intermediary contract from forwarding a user's transaction authority into issuance or revocation;
- records persist `revoked-at` as an optional burn height;
- issuance and revocation events both contain the complete lifecycle record required by the event index;
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
- Show operator, principal, method, policy version, active key, revocation policy, and status.
- Build the minimal event index now. Fetch the [Hiro contract-events endpoint](https://docs.hiro.so/en/apis/stacks-blockchain-api/reference/smart-contracts/events), retain only this registry's `print` events, decode the versioned issue/revoke tuples, page to the last stored event, and use `get-attestation` as current-state truth.
- Build a small claim explorer on that index for subject, organization, role, issue height, expiry, status, issuance transaction, and registry. The checked-in manifest remains deployment evidence, not the enumeration source.
- Link the Leather known-origin state to both the profile and Explorer.
- Freeze and deploy the bundled v2 registry once, rotate the trusted attester to an independently seeded principal, and reissue the canonical claims.
- Predeploy the Day 3 organization and Day 4 lifecycle fixture contracts so later work does not wait on Testnet confirmation.

Acceptance: a user can answer “who did Leather trust, what do they claim to verify, and where is the on-chain proof?” without reading source code; a newly issued claim appears without editing the manifest; and v2 plus the isolated key pass a fresh live verification.

### Day 3 — Domain-control issuance prototype

- Define a canonical `stacks-origin.json` challenge document.
- Add a developer page that generates a nonce and exact subject statement.
- Implement and adversarially test every control in `domain-control-fetch-security.md` before enabling a broadcast path.
- Verify a deployer signature and the hardened well-known HTTPS response.
- Issue a short-lived Testnet attestation through the isolated signer and rotated attester principal.
- Persist only public request status and evidence commitments; keep the signing key outside application logs and client code.

Acceptance: a second fictional organization can prove domain plus deployer control and receive a real Testnet claim without editing Leather's code.

### Day 4 — Lifecycle, recovery, and demo polish

- Add a separate lifecycle fixture so revocation never destroys the canonical known demo.
- Demonstrate issue, known, revoke, no-longer-valid, and reissue transitions.
- Make reset recovery produce an updated public manifest automatically.
- Add end-to-end tests for profile links, issuance, revocation, registry failure, and capture stability.

Acceptance: the demo shows not just a static badge but an attester operating a claim through its lifecycle on Testnet.

## Scope to avoid in four days

Do not spend the four days on mainnet deployment, real KYB document handling, generalized assurance scores, decentralized attester governance, arbitrary schema design, or production custody claims. Those would increase risk and narrative surface without making the Testnet proof materially more convincing.

## Recommended product narrative after four days

> Origin is an open registry with wallet-owned trust. A domain can prove control of its deployer, a recognized attester can issue or revoke a narrow claim on Testnet, and Leather can verify the exact transaction principal without trusting the requesting site. The wallet shows who attested, what they checked, and where the evidence lives—without calling provenance a safety guarantee.
