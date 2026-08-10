# Testnet v2 Recovery Record

Status: recovery-tested encrypted backup retained outside the public repository

The seven disposable `testnet-v2` role files were created for the coordinated v2 deployment. Before any role received Testnet STX, each private file was validated against its public address and included in a versioned encrypted recovery bundle.

## Recovery evidence

The backup workflow:

1. validated owner-only permissions on every role file;
2. derived and matched every expected public address;
3. encrypted an in-memory versioned bundle to a full GPG recipient fingerprint;
4. immediately decrypted it and required exact byte equality; and
5. validated the recovered bundle schema and all seven roles.

No mnemonic was written to a temporary plaintext file or printed by the workflow.

The encrypted backup is stored outside Git and outside GitHub repository variables. Its location, recipient fingerprint, and checksum are intentionally excluded from this public record. The independent GitHub repository-variable copy used during the private deployment phase was removed when the repository became public.

## Rotation

To create a replacement encrypted bundle after an intentional identity rotation:

```sh
pnpm testnet:backup-accounts -- \
  --recipient <full-gpg-recipient-fingerprint> \
  --output /absolute/private/recovery/path/testnet-v2-roles.gpg
```

The command refuses:

- a short recipient ID;
- an existing or non-`.gpg` destination;
- a private role file with group or world permissions; and
- an account that does not derive to its public manifest address.

This record proves that a recovery procedure was exercised for disposable Testnet identities. It is not a production custody design.
