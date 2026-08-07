# Aggregated Review Response

Status: surfaced Tier 1 implementation complete on August 7, 2026; coordinated Testnet cutover pending

Five independent reviews found no Critical implementation issue in either repository and agreed that the current proof of concept is ready to extend with design changes. This response tracks the Tier 1 findings surfaced in the aggregate handoff. It does not claim to reproduce the unattached full 17-item report.

## Tier 1 disposition

| Finding                                                                                                | Response                                                                                                                                                                                                                                                        | Deployment state                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Domain fetcher lacked SSRF, redirect, DNS-rebinding, metadata-address, and response-limit requirements | `domain-control-fetch-security.md` is now the normative Day 3 gate, including signer separation and adversarial acceptance tests                                                                                                                                | Specification only; no fetcher or signer is online                                                                  |
| Trusted attester shared a disposable mnemonic with other roles                                         | New account generation creates one independent seed per role; every transaction script loads only its named role                                                                                                                                                | New-environment behavior complete; current live attester must rotate during the coordinated v2 cutover              |
| Request-selected Testnet node could answer Leather's Origin lookup                                     | Leather now uses the request chain ID only as an enablement gate and pins burn-height and registry reads to the wallet-owned Testnet API                                                                                                                        | Implemented and unit-tested; the August 7 rebuild and live-safe capture show both Explorer evidence links rendering |
| Contract changes risked repeated redeployments                                                         | `origin-registry-v2.clar` bundles direct-call enforcement, persisted `revoked-at`, full lifecycle events, and explicit reissue reset semantics                                                                                                                  | Simnet only; no Testnet deployment or re-issuance has occurred                                                      |
| Day 2 claim explorer had no enumeration source                                                         | Minimal Hiro contract-event ingestion moved to Day 2; read-only registry state remains authoritative and the manifest is no longer treated as an index                                                                                                          | Roadmap and v2 event shape complete; index implementation belongs to Day 2                                          |
| Day 3 and Day 4 fixtures could lose time to Testnet confirmation                                       | Both future fixture contracts are now scheduled for Day 2 predeployment                                                                                                                                                                                         | Planned; no Testnet writes have occurred                                                                            |
| Deployment script treated rejected broadcasts as success because rejection objects contain `txid`      | Shared transaction handling now rejects every response containing `error`; tests cover `ContractAlreadyExists` with a transaction ID. Direct script execution also requires `--broadcast`, and contract deployment refuses an existing principal before signing | Implemented and tested without broadcasting                                                                         |
| Claim issue height was true on-chain but absent from the cited manifest                                | Both claims now record `issuedAt`, and the live verifier asserts it against registry state                                                                                                                                                                      | Implemented; secret-free live verification passed at burn height 2,996                                              |

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
