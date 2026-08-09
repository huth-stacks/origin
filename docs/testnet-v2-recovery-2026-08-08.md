# Testnet v2 Recovery Record

Status: recovery-tested local and independent encrypted copies

The seven `testnet-v2` role files were created by an earlier agent run. They are disposable Testnet
identities, not user-supplied identities. Before any role received Testnet STX, the current run
validated every private file against its public address and created a versioned recovery bundle.

## Encryption and locations

- GPG recipient fingerprint: `3EBF603302FB76ACD31DEBF48942768061453E8F`
- Ciphertext SHA-256: `4d6ebc2ccf1c4be38b852c75e3131e7144d6157a304a0fe5055871c3502736b7`
- Local mode-`0600` copy: `/Users/alexander/Documents/Origin Recovery/testnet-v2-roles-2026-08-08.gpg`
- Independent copy: private `huth-stacks/origin` repository variable
  `ORIGIN_TESTNET_V2_RECOVERY_GPG_B64`
- Independent checksum: repository variable `ORIGIN_TESTNET_V2_RECOVERY_SHA256`

The independent copy is GPG ciphertext encoded as base64. It is repository metadata, not a Git
object, source file, Actions secret, plaintext mnemonic, or decrypting key.

## Recovery evidence

The backup command encrypted an in-memory bundle and immediately decrypted it, requiring exact
byte equality with the source bundle. The independent copy was then fetched from GitHub, decoded,
matched against the recorded SHA-256 and local ciphertext, decrypted, and validated as version `1`
with all seven roles. No mnemonic was written to a temporary plaintext file or printed.

The local iCloud Documents copy currently reports `needs-upload` because the account quota is
exceeded. It is not counted as off-device evidence; the GitHub repository-variable copy is the
independent recovery location.

To create a replacement encrypted bundle after an intentional identity rotation:

```sh
pnpm testnet:backup-accounts -- \
  --recipient 3EBF603302FB76ACD31DEBF48942768061453E8F \
  --output "/absolute/private/recovery/path/testnet-v2-roles.gpg"
```

The command refuses a short recipient ID, an existing destination, a non-`.gpg` destination, a
private role file with group/world permissions, or an account that does not derive to its public
manifest address.
