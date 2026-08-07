# Aggregated Review Response

Status: all 17 review findings dispositioned on August 7, 2026; coordinated Testnet cutover pending

Five independent reviews found no Critical implementation issue in either repository and agreed that the current proof of concept is ready to extend with design changes. The complete 17-item aggregate report was supplied on August 7 and is reflected below.

## Tier 1 disposition

| Finding                                                                                                | Response                                                                                                                                                                                                                                                        | Deployment state                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Domain fetcher lacked SSRF, redirect, DNS-rebinding, metadata-address, and response-limit requirements | `domain-control-fetch-security.md` is now the normative Day 3 gate, including signer separation and adversarial acceptance tests                                                                                                                                | Specification only; no fetcher or signer is online                                                                  |
| Trusted attester shared a disposable mnemonic with other roles                                         | New account generation creates one independent seed per role; every transaction script loads only its named role                                                                                                                                                | New-environment behavior complete; current live attester must rotate during the coordinated v2 cutover              |
| Request-selected Testnet node could answer Leather's Origin lookup                                     | Leather requires both the Testnet chain ID and the wallet's pinned Testnet API, then pins burn-height and registry reads to that same wallet-owned endpoint                                                                                                     | Implemented and unit-tested; the August 7 rebuild and live-safe capture show both Explorer evidence links rendering |
| Contract changes risked repeated redeployments                                                         | `origin-registry-v2.clar` bundles direct-call enforcement, persisted `revoked-at`, full lifecycle events, and explicit reissue reset semantics                                                                                                                  | Simnet only; no Testnet deployment or re-issuance has occurred                                                      |
| Day 2 claim explorer had no enumeration source                                                         | Minimal Hiro contract-event ingestion moved to Day 2; read-only registry state remains authoritative and the manifest is no longer treated as an index                                                                                                          | Roadmap and v2 event shape complete; index implementation belongs to Day 2                                          |
| Day 3 and Day 4 fixtures could lose time to Testnet confirmation                                       | Both future fixture contracts are now scheduled for Day 2 predeployment                                                                                                                                                                                         | Planned; no Testnet writes have occurred                                                                            |
| Deployment script treated rejected broadcasts as success because rejection objects contain `txid`      | Shared transaction handling now rejects every response containing `error`; tests cover `ContractAlreadyExists` with a transaction ID. Direct script execution also requires `--broadcast`, and contract deployment refuses an existing principal before signing | Implemented and tested without broadcasting                                                                         |
| Claim issue height was true on-chain but absent from the cited manifest                                | Both claims now record `issuedAt`, and the live verifier asserts it against registry state                                                                                                                                                                      | Implemented; secret-free live verification passed at burn height 3,003                                              |

## Tier 2 disposition

| Finding                                            | Response                                                                                                                                                                                          | State                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Claim explorer had no enumeration source           | Day 2 now starts with a paginated index of versioned registry print events and treats `get-attestation` as current-state truth                                                                    | Design complete; Day 2 implementation pending |
| Key rotation would orphan claims                   | Leather trust entries now carry principal validity intervals. A claim is eligible only when its chain-derived issue height falls inside the interval; compromise may remove the interval entirely | Implemented and tested in the evaluator       |
| Runtime profile content could enter trusted chrome | Trusted display names and policy remain bundled. A fetched profile is only an outbound link unless a future build pins its hash                                                                   | Policy fixed; profile implementation pending  |
| Expiry semantics were under-tested                 | Simnet mines through expiry and proves the registry retains the record; Leather's fixed-height evaluator test proves consumers reject it at the boundary                                          | Implemented and tested                        |
| Live verifier omitted central negative invariants  | The verifier ties both claims to their configured attesters, proves the hostile issuer differs, and proves the trusted attester has no claim on the unrecognized fixture                          | Implemented; live verification passed         |
| Rejected broadcasts appeared successful            | Node responses containing `error` are failures even when they include a transaction ID; direct scripts require `--broadcast` and contract deploys preflight existing principals                   | Implemented and tested without broadcasting   |

## Tier 3 disposition

| Finding                                                             | Response                                                                                                                                                                                                                                                                        | State                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Demo extension used development packaging                           | `build:origin-demo` now selects the production manifest branch while retaining the explicit `Leather Origin Demo` name; the production icon and CSP are unit-tested                                                                                                             | Implemented                      |
| Explorer links could mislabel custom Testnet-like networks          | Origin now enables only when the active wallet network has the Testnet chain ID and exact pinned Hiro API. Devnet or hostile custom URLs receive no Origin evaluation                                                                                                           | Implemented and tested           |
| One attester failure or a hanging request erased/stalled provenance | Attester reads use `allSettled`; the burn-height read remains mandatory; the complete lookup has one eight-second abort budget and no retry multiplication                                                                                                                      | Implemented and tested           |
| Deployed principals were duplicated                                 | Demo scenarios and footer links derive from the public fixture manifest, and tests pin all three subjects plus registry. Fresh deployment issuance derives its registry deployer from validated account settings                                                                | Implemented                      |
| Demo chrome asserted unknown outcomes                               | Closed and timed-out requests now use neutral language; fresh successful responses and activity say `Broadcast`, not `Confirmed`                                                                                                                                                | Implemented and freshly captured |
| Rendered evidence predated Leather changes                          | A fresh production-style demo build and non-broadcasting local capture render the complete warning, unmistakable extension label, and both Explorer evidence links                                                                                                              | Complete                         |
| Assorted lifecycle and process debt                                 | The duplicate broadcasting capture spec and superseded Testnet plan are removed; `output/` is ignored; the manifest em dash is removed; v2 revoke is event-idempotent; funding validates every recipient; issue heights are manifest-verified; confirmation drift is documented | Implemented and tested           |

The fork deliberately keeps Origin active across this branch only for the exact official Testnet transport; `ORIGIN_DEMO` controls unmistakable packaging, not the trust decision. An upstream Leather proposal must choose its product feature-flag channel before merge. Existing RPC coverage still exercises a real serialized contract argument independently of the three argument-free demo fixtures.

## Roadmap amendments

- Day 3 uses one versioned challenge document, not a general-purpose claim schema.
- The fetch policy requires registrable eTLD+1 control and an explicit subdomain delegation policy.
- Standard deployers use an Origin-domain-separated SIP-018 message; multisig or contract deployers use a confirmed on-chain nonce proof.
- Day 3 claims are capped at 4,320 burn blocks and renew only after 80% of the interval.
- Trusted labels never come from runtime profile text, and the four-day profile makes no rapid trust-list update SLA promise.
- The scope exclusions now explicitly forbid unhardened outbound fetches, shared online seeds, site-supplied attester hints, and “verified” or “safe” trusted-chrome language.

## Coordinated v2 cutover gate

The v2 cutover is one explicit external-state decision, not an incidental test step. Before broadcasting:

1. Generate or select independently seeded Testnet roles.
2. Fund the isolated attester and required fixture deployers.
3. Deploy `origin-registry-v2` plus the Day 3 and lifecycle fixtures once.
4. Issue canonical claims from the isolated trusted attester.
5. Replace the public manifest with confirmed transaction IDs and issue heights.
6. Update Leather's registry and trusted-attester principals together.
7. Run the secret-free verifier, live three-scenario browser journey, and fresh capture.
8. Keep v1 available as rollback evidence until the v2 demo is independently verified.

No command in ordinary formatting, typechecking, unit testing, or review should broadcast a Testnet transaction. Deployment commands remain operator actions with an explicit flag and must not run in read-only review jobs.
