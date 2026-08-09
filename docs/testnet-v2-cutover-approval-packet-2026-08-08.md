# Testnet v2 Cutover Execution Packet

Status: completed on Testnet, August 8, 2026

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
| Evidence/profile host | `origin-evidence.vercel.app`, a distinct controlled production tenant on Vercel project `stacks-endowment/origin-evidence`          | Published             |

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

## Completion record

All authorized stages completed without changing the reviewed principals, sources, fees, request
IDs, or signed transaction bytes.

| Stage                                                     | Confirmed transaction IDs                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Six funding transfers                                     | `c45602191837765141816bad4b08608de10d1ac639cd893945bfa5277ba54c6c`, `2a250740d76152aeeafac7e12b4a042fbcb11cc74f219ef20950abcf1ce42bd1`, `e40d246ffe3763e6f2194dae7df7f0ddc0da668079457b05eae22dfe4a5df8e5`, `4469c51f143d3652b19ac7081620485fd6ee30273e31d5849747e0f7e923a0cc`, `1a567b00840fc13922b1ab14b187f407140bbf8289d4ea59cfa2b4a610d49e15`, `164a22478b2e512e755802d788f97f2af66a10760fbfac6a6271d6655c2a03d0` |
| Registry, domain-proof, lifecycle, and expiry deployments | `0x8a2c71ba986643dab5a4e992e0edecf5b5c6c4752fdd1cbd9f42f572a8646de3`, `0x99ea368657b88dbc1bdd0b32e2651ce3ebfec64b781bcb084250c64362245826`, `0xcc942c21e4a83737e7f7c1f1e98a2a0b9f254114ea48874a7bcf4d86d6a242af`, `0xa7e2227856df851e784b336c6a519118dc99a2da3bcbb6abf84d53ec0d0246bc`                                                                                                                                 |
| Four fixture claims                                       | `0xeeaa16f586079c7096433fa77d1496b6816cf294d789c2b84420a81d38279cb6`, `0x03c14e194dad96598ba55faaff7db1b9f3fb0c4645cd63878fce4c390eb53f15`, `0xbd7ed241f7c333d2cc3375a1c0759c47a4d350ccef959b5873a23bc8eea7e29e`, `0x43d2017d5e5132e8de35aa59557856e3f60ef6dd9aa593f4b4870b1dedfcb572`                                                                                                                                 |
| Domain-control claim                                      | `0xcba260a1d50d67ee75b99db89c8ce26a56e075323f21bbff9eeebdd68a009f18`                                                                                                                                                                                                                                                                                                                                                   |

The domain claim proves control of `origin-iota-ashy.vercel.app` for
`ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN.origin-domain-proof`. It was issued
at burn height `3,486`, expires at `7,806`, and uses request ID
`fe080f3642ba3e18cede0e07a579b368654e423644c75c3458d8d87de4dc2306`.

The v2 manifest and Leather compatibility configuration were promoted after chain reads confirmed
the deployments and claims. Final `pnpm testnet:verify` passed at burn height `3,487` with seven
contracts, five claims, and the deliberately unknown lookalike. A fresh production
testing-runtime extension build then passed the installed Chromium journey against the public
applicant host, rendering all three live Testnet provenance states in 14.5 seconds without an
application transaction broadcast.
