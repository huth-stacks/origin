# Testnet v2 Cutover Approval Packet

Status: pre-signing draft; no external write approved

Snapshot: August 7, 2026 at Bitcoin burn height `3,093` and Stacks tip height `12,334`

This packet is the G2 review boundary. It does not authorize a faucet request, signing, funding, deployment, issuance, manifest promotion, Leather configuration promotion, push, or release. Refresh every live value immediately before signing. If any reviewed value changes, issue a replacement packet.

## Gate status

| Gate                          | Evidence                                                                                                   | Status                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Seven isolated roles          | Seven separate ignored `settings/testnet-v2-<role>.local.json` files, each mode `0600`; secret scan passes | Ready                                      |
| Recoverable seed backup       | No Time Machine destination is configured and no independent recovery test is recorded                     | **Blocked**                                |
| First-run transaction journal | `deployments/testnet-transactions/` is absent                                                              | Ready                                      |
| Issuance intent               | `g2-cutover-2026-08-07-01`, ignored mode-`0600` file; arguments and request IDs below                      | Ready while expiry window remains valid    |
| Public applicant domain       | No controlled fictional eTLD+1 is selected                                                                 | **Blocks Day 3, not the G2 chain cutover** |
| Evidence/profile origin       | No custom evidence-site origin distinct from the Acme dapp is selected                                     | **Blocks profile/explorer release**        |
| Exact signed transaction IDs  | Signing is deliberately deferred until backup approval                                                     | **Blocked**                                |

## Repository and baseline pins

- Origin fee-freeze implementation: `agent/four-day-foundation` at `3bd85da`.
- Leather branch: `agent/four-day-foundation` at `9c48792b5`.
- Live v1 fixture manifest SHA-256: `d93cc95c0f647d28a5259a3aa62144556edd74e4d5dcffc93c605fb02ae3b925`.
- Live v1 remains canonical until the complete v2 wallet journey passes.
- The Origin and Leather foundation branches remain local and unpushed. Neither branch is represented here as merged.

## Public principals and current state

All balances are in micro-STX. All accounts reported nonce `0`, no detected mempool nonce, and zero matching mempool transactions at the snapshot.

| Role                                 | Principal                                   | Balance | Planned use                                   |
| ------------------------------------ | ------------------------------------------- | ------: | --------------------------------------------- |
| Registry deployer and funding sender | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN` |     `0` | Fund six roles; deploy registry v2            |
| Canonical attester                   | `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R` |     `0` | Issue canonical, lifecycle, and expiry claims |
| Domain attester                      | `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0` |     `0` | Day 3 only; no G2 issuance                    |
| Unrecognized issuer                  | `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ` |     `0` | Issue deterministic hostile claim             |
| Proof deployer                       | `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN` |     `0` | Deploy domain-proof fixture                   |
| Lifecycle deployer                   | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM` |     `0` | Deploy lifecycle fixture                      |
| Expiry deployer                      | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV`  |     `0` | Deploy short-expiry fixture                   |

## Funding packet

The registry deployer must first receive at least `70,036,000` micro-STX (`70.036 STX`) from the Testnet faucet. This is the exact minimum that funds six `10 STX` role targets, pays six fixed `1,000` micro-STX transfer fees, pays the registry's fixed `30,000` micro-STX deployment fee, and leaves a `10 STX` registry-deployer reserve. Testnet STX has no monetary value, but the faucet request remains an external write requiring approval.

After the faucet transaction confirms, rerun the read-only packet. Its confirmed balance and nonce replace this snapshot. The funding sender nonce is expected to begin at `0`; any other value regenerates every funding transaction identity and stops this packet.

| Nonce | Recipient role      | Recipient                                   |       Amount | Fixed fee | Expected journal key suffix |
| ----: | ------------------- | ------------------------------------------- | -----------: | --------: | --------------------------- |
|   `0` | Canonical attester  | `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R` | `10,000,000` |   `1,000` | `:0`                        |
|   `1` | Domain attester     | `ST123Q4PK82XAH10Y4W9YERH6FZHE5G0XK4XR0VB0` | `10,000,000` |   `1,000` | `:0`                        |
|   `2` | Unrecognized issuer | `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ` | `10,000,000` |   `1,000` | `:0`                        |
|   `3` | Proof deployer      | `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN` | `10,000,000` |   `1,000` | `:0`                        |
|   `4` | Lifecycle deployer  | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM` | `10,000,000` |   `1,000` | `:0`                        |
|   `5` | Expiry deployer     | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV`  | `10,000,000` |   `1,000` | `:0`                        |

Funding principal exposure is `60,000,000` micro-STX plus `6,000` micro-STX in fees. The script scans the complete `fund:` journal namespace, requires a contiguous per-recipient sequence, and aborts on legacy, malformed, pending, ambiguous, rejected, or absent-after-attempt journals.

## Deployment packet

The Simnet-only proxy is excluded.

| Order |                    Sender nonce | Intended principal                                                  | Source SHA-256                                                     | Fixed fee |
| ----: | ------------------------------: | ------------------------------------------------------------------- | ------------------------------------------------------------------ | --------: |
|   `1` | `6` after six funding transfers | `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2`      | `ee53af752d07e47e14e39030e75df5f1b35c2363cb65959c232d7fa507fffd2d` |  `30,000` |
|   `2` |                             `0` | `ST3WYMMN6AQ4AAQWBVKT2B72AVCCR574N9CGVQ4VN.origin-domain-proof`     | `36173f523618dfd471e2b6a330dedcd193fa1d5942e48e59e7e73d499ba7912b` |  `10,000` |
|   `3` |                             `0` | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM.origin-lifecycle-action` | `eacce940fd2594147d0e1529cc57162e11cc21ec98e0b6bc4dc53f14e1b493c1` |  `10,000` |
|   `4` |                             `0` | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV.origin-expiry-action`     | `eacce940fd2594147d0e1529cc57162e11cc21ec98e0b6bc4dc53f14e1b493c1` |  `10,000` |

Deployment fee exposure is `60,000` micro-STX. Every deployment must confirm with the exact source and expected principal before the next dependency proceeds.

## Issuance packet

Intent ID: `g2-cutover-2026-08-07-01`

- Candidate canonical expiry: `103,093`, exactly `100,000` blocks above the packet snapshot. Because `issued-at` is the later confirmation burn height, the resulting lifetime can only be shorter than the wallet's `100,000`-block cap.
- Candidate short expiry: `3,381`, exactly `288` blocks above the packet snapshot. It is intended to provide an active capture before expiring in roughly two days at a ten-minute burn-block cadence.
- Immediately before signing, both expiries must still be future values and the short fixture must leave enough time for confirmation and an active capture. If not, abandon this intent ID and generate a new packet and intent ID; never change arguments under the existing ID.
- Every issuance call has a fixed `10,000` micro-STX fee.

| Sender nonce | Attester role | Subject                                                             | Issuer name                | Role                |   Expiry | Request ID                                                         |
| -----------: | ------------- | ------------------------------------------------------------------- | -------------------------- | ------------------- | -------: | ------------------------------------------------------------------ |
|          `0` | Canonical     | `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`             | `Acme`                     | `Demo contract`     | `103093` | `7599002894633c078a31309a8a16be163e3de08344a1283d1406a7c779687dc7` |
|          `0` | Unrecognized  | `ST2EWCY9STYTS6FGJ0KP1FQNMKHJFXMP7KKM7FRX0.claimed-action`          | `Definitely Acme`          | `Official contract` | `103093` | `d53af6ca1dacb80953e882241469758ff94a8dd754187be7ef5a87a8c8993729` |
|          `1` | Canonical     | `ST1C46DJ923TYM70YZ8DJEET8F15F97B3X8FZPBQM.origin-lifecycle-action` | `Origin lifecycle fixture` | `Demo contract`     | `103093` | `426258cb3aaca83083f27aad820e3a164db79a9ca282ac1e0c000403ecfec507` |
|          `2` | Canonical     | `STH4M7M1NRTSSR737J03KQXHMJYB4JG4F4KVV9DV.origin-expiry-action`     | `Origin expiry fixture`    | `Demo contract`     |   `3381` | `8dafcbaab9bc2e9946ed8f091864925199802daa2d03da2bac5fc0b43a64b3be` |

Issuance fee exposure is `40,000` micro-STX. Combined fixed fee exposure for funding, deployment, and issuance is `106,000` micro-STX (`0.106 STX`).

## Signed transaction IDs

This section must be complete before funding or cutover approval. It is intentionally empty because no recoverable backup is confirmed and no local signing is authorized.

| Class      | Count | Transaction IDs                             |
| ---------- | ----: | ------------------------------------------- |
| Funding    |   `6` | **Pending backup confirmation and signing** |
| Deployment |   `4` | **Pending backup confirmation and signing** |
| Issuance   |   `4` | **Pending backup confirmation and signing** |

The signed bytes, exact nonce, fixed fee, semantic intent, and locally computed transaction ID must be persisted mode `0600` before any broadcast network request. A reviewer must compare all fourteen IDs and intent fields with the replacement final packet.

## Atomic compatibility cutover

The candidate compatibility object is generated only after all claims confirm. It must be one atomic versioned diff with:

- registry `ST23YP5Q1WZKDV87KDDB1FQ3W916CQ3MSD09A2VAN.origin-registry-v2` and schema version `2`;
- trusted attester `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R` only;
- explicit absence of old shared-mnemonic attester `ST121HDPNYM3PYBXM6EK0NY673DWCK54ZXEXX2HHC`;
- discovery principals `ST389QT3QNDV6A7K9SDTAKDJ7RY15FPCZ8RPZZ06R` and `ST3C1VMZB3SP3NCR93SMZGFDA7SKAN5TXVA2HW2MZ`;
- `validFromBurnBlock` derived from the confirmed canonical claim's chain-read `issued-at`;
- `maxClaimLifetimeBurnBlocks: 100000`;
- unchanged exact reference subject `ST14T2RC089K364JC6VX1310NER40F17FNCY8WPDY.acme-action`;
- final Origin/Leather commit pins and the selected profile/explorer link.

Neither manifest nor Leather configuration is promoted until the candidate pair builds and the complete installed-wallet journey passes.

## Stop conditions

Stop without another broadcast if any of the following occurs:

- backup recovery is unconfirmed;
- a live balance, nonce, source hash, expiry, request ID, fee, signed transaction ID, or principal differs from the final approved packet;
- the first-run transaction journal directory is unexpectedly non-empty;
- a prior journal is pending, ambiguous, rejected, malformed, legacy-shaped, or absent after a recorded attempt;
- mempool, transaction, contract, nonce, or body-complete API evidence is unavailable;
- a contract exists with different source or transaction evidence;
- a node returns an error, even if it also returns a transaction ID;
- the canonical claim's chain-read fields violate the wallet lifetime policy;
- the old attester appears anywhere in the candidate v2 trust configuration;
- the candidate manifest/config pair cannot pass the complete wallet journey together.

## Recovery and containment

- Keep live v1 unchanged and canonical until final promotion.
- Never pair the v2 registry with the old attester configuration.
- On a pending or unknown transaction, preserve the journal and reconcile the exact transaction; do not replace it.
- On incorrect v2 state, retain v1, quarantine the new attester from wallet trust, revoke an erroneous active claim only through a separately reviewed lifecycle action, and record abandoned principals.
- A post-deployment registry defect requires a new contract name and a new atomic compatibility object; v2 is immutable.

## Required approvals

1. **Backup approval:** identify the independent encrypted backup location and confirm a recovery check for all seven seed files without pasting seed material into chat or Git.
2. **Domain approval:** choose a controlled fictional eTLD+1 and a separate evidence/profile hostname; shared tenant suffixes such as `vercel.app` do not satisfy the applicant-domain proof.
3. **Faucet approval:** approve the Testnet faucet request to the registry deployer, then regenerate the live packet.
4. **Signing approval:** approve local preparation of all fourteen signed transactions with no broadcasts.
5. **Funding approval:** approve the six exact funding transaction IDs after review and confirmation of the funding-source balance.
6. **Cutover approval:** after funding confirms, approve the four deployments and four issuances in dependency order.
7. **Promotion approval:** after live verification and the complete installed-wallet journey, approve the atomic manifest/config promotion.

Approval of one stage does not authorize a later stage.
