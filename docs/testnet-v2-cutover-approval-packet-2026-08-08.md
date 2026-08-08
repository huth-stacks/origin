# Testnet v2 Cutover Execution Packet

Status: current staged execution packet

Snapshot: August 8, 2026 at Bitcoin burn height `3,481` and Stacks tip height `21,868`

Intent ID: `g2-cutover-2026-08-08-01`

This packet supersedes the expired August 7 draft. It authorizes only the reviewed Testnet stages
described below. Mainnet, real-value transfers, production trust claims, upstream Leather changes,
Git pushes, and releases remain out of scope.

## Gate evidence

| Gate                  | Evidence                                                                                                                            | State                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| Seven isolated roles  | Seven ignored mode-`0600` role files; addresses re-derived                                                                          | Ready                 |
| Independent recovery  | GPG ciphertext fetched, hash-matched, decrypted, and validated for seven roles; see `testnet-v2-recovery-2026-08-08.md`             | Ready                 |
| Funding source        | Faucet transaction `0x7a8b23d08f36987d1e0c8ced8db5f50f98ef89004d104ee2d4807168ddd6b5c1`; balance `500,000,000` micro-STX; nonce `0` | Ready                 |
| Transaction journal   | Absent before first preparation                                                                                                     | Ready                 |
| Applicant host        | `origin-iota-ashy.vercel.app`, a controlled private-suffix tenant alias on Vercel project `stacks-endowment/origin`                 | Ready for publication |
| Evidence/profile host | `origin-stacks-endowment.vercel.app`, a distinct controlled tenant alias on the same project                                        | Ready for publication |

Vercel lists `vercel.app` in the Public Suffix List as a private suffix, so each exact first-level
tenant is its registrable control boundary. The verifier accepts an exact ICANN registrable domain
or an exact private-suffix tenant, rejects the shared suffix itself and nested hostnames, and still
requires public DNS, pinned TLS, and the fixed well-known path.

## Roles

| Role                | Principal                                   | Starting nonce |
| ------------------- | ------------------------------------------- | -------------: |
| Registry deployer   | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN` |              0 |
| Canonical attester  | `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R` |              0 |
| Domain attester     | `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0` |              0 |
| Unrecognized issuer | `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ` |              0 |
| Proof deployer      | `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN` |              0 |
| Lifecycle deployer  | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM` |              0 |
| Expiry deployer     | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV`  |              0 |

## Funding plan

The registry deployer sends `10,000,000` micro-STX to each of the other six roles at nonces `0`
through `5`, with a fixed `1,000` micro-STX fee per transfer. Total principal is `60,000,000`
micro-STX and total fee is `6,000` micro-STX. The sender retains ample Testnet reserve.

## Deployment plan

| Order | Sender nonce | Principal                                                           | Source SHA-256                                                     |    Fee |
| ----: | -----------: | ------------------------------------------------------------------- | ------------------------------------------------------------------ | -----: |
|     1 |            6 | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`      | `ee53af752d07e47e14e39030e75df5f1b35c2363cb65959c232d7fa507fffd2d` | 30,000 |
|     2 |            0 | `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN.origin-domain-proof`     | `36173f523618dfd471e2b6a330dedcd193fa1d5942e48e59e7e73d499ba7912b` | 10,000 |
|     3 |            0 | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM.origin-lifecycle-action` | `eacce940fd2594147d0e1529cc57162e11cc21ec98e0b6bc4dc53f14e1b493c1` | 10,000 |
|     4 |            0 | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV.origin-expiry-action`     | `eacce940fd2594147d0e1529cc57162e11cc21ec98e0b6bc4dc53f14e1b493c1` | 10,000 |

## Issuance plan

- Canonical expiry: `103,481` (snapshot plus `100,000` burn blocks).
- Short expiry: `3,769` (snapshot plus `288` burn blocks).
- Each issuance fee: `10,000` micro-STX.
- Exact request IDs and transaction IDs are derived under intent
  `g2-cutover-2026-08-08-01` and must be journaled before broadcast.
- If the short expiry is no longer safely in the future before preparation, abandon this intent and
  replace the packet; do not change arguments under this ID.

## Authorized sequence and stop conditions

The user directed the agent to solve the listed Testnet blockers autonomously. Within that scope,
the agent may execute each of these bounded stages only after verifying the preceding stage:

1. locally prepare and review the six funding transactions;
2. broadcast only those six exact transactions and wait for confirmation;
3. locally prepare and review the four deployment and four issuance transactions;
4. broadcast only those exact transactions in dependency order and wait for confirmation;
5. construct, sign, publish, fetch-verify, and issue one fictional managed-domain claim;
6. promote the v2 manifest/config only after live verification and the installed-wallet journey.

Stop on any mismatched source, address, fee, nonce, transaction ID, prepared bytes, live chain
state, request ID, hostname, signature, or expiry. Stop on unavailable preflight evidence, a node
error, an ambiguous transaction, a rate-limit response that prevents exact state classification,
or any attempt to use Mainnet.
