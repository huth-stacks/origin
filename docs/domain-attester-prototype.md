# Domain-Control Attester Prototype

Status: local safe-floor implementation, August 8, 2026

This is the operator guide for Origin's Day 3 domain-control attester. The implementation reaches
Rung C of the four-day execution plan: the durable verifier, constrained fetcher, proof policy,
isolated signer, and adversarial suite exist locally. It does not authorize a Testnet write. A
controlled public domain, outbound-firewall evidence, v2 trust cutover, isolated-key provisioning,
and separate G3 approval are still required before signing or broadcasting.

## Protocol shape

The operator creates a five-minute challenge for one canonical ICANN registrable eTLD+1, one exact
contract principal, and one role from the published enum:

- `Application contract`
- `Protocol contract`
- `Treasury contract`

The applicant publishes the challenge plus `deployerSignature` at exactly:

```text
https://<domain>/.well-known/stacks-origin.json
```

The JSON object has this exact version-1 shape. Unknown fields, duplicate keys, non-canonical
domains, non-enumerated roles, and altered challenge values are rejected.

```json
{
  "version": 1,
  "domain": "copperline.example",
  "subject": "ST000000000000000000002AMW42H.copperline-app",
  "attester": "ST000000000000000000002AMW42H",
  "nonce": "<32-byte-lowercase-hex>",
  "requestId": "<32-byte-lowercase-hex>",
  "policyVersion": "origin-domain-testnet-v1",
  "issuedAt": 1786224000,
  "expiresAt": 1786224300,
  "claimExpiresAt": 7500,
  "issuerName": "copperline.example",
  "role": "Application contract",
  "verificationMethod": "https-sip018-deployer-control",
  "deployerSignature": "<65-byte-lowercase-hex>"
}
```

The sample principals and domain are placeholders, not deployable fixture values. The service
generates every field except `deployerSignature`; applicants must not invent or edit challenge
values. `issuerName` always equals the canonical proven domain.

The signature is an RSV SIP-018 signature from the standard principal that deployed `subject`.
The Origin-specific domain tuple is `Origin Domain Attestation`, version `1`, Testnet chain ID
`0x80000000`. The signed message binds every challenge field, including the intended attester,
request ID, policy, role, and absolute claim expiry.

## Static publication check

After publishing the generated and signed document, check the exact public object without sending
credentials or following a redirect:

```sh
curl --fail --silent --show-error \
  --proto '=https' \
  --max-redirs 0 \
  --max-time 5 \
  --header 'Accept: application/json' \
  https://copperline.example/.well-known/stacks-origin.json
```

This curl command is an operator visibility check only. It does not replace the verifier, whose
DNS pinning, address classification, TLS, decompression, duplicate-key, body-size, and deadline
rules are stricter.

## Local verification

```sh
pnpm attester:test
pnpm verify
```

The attester suite uses generated disposable keys, injected HTTPS responses, and fake signers. It
never loads a live Testnet signing key or broadcasts a transaction.

The normative controls in `domain-control-fetch-security.md` map to local evidence as follows:

| Control boundary                                                       | Implementation                            | Test evidence                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Canonical eTLD+1, exact fixed URL, role/name bounds                    | `domain-policy.ts`, `secure-fetch.ts`     | `domain-attester-policy`, `domain-attester-fetch`                          |
| Public-only A/AAAA answers, mixed-answer rejection, DNS pinning        | `network-policy.ts`, `requestPinnedHttps` | blocked-range, internal/service-address, and rebinding cases               |
| TLS, redirect, proxy/credential, header/body/decompression/time limits | `secure-fetch.ts`                         | redirect matrix, exact request shape, type/size/slow-response cases        |
| Strict JSON, exact challenge, SIP-018 deployer signature               | `strict-json.ts`, `proof-signature.ts`    | duplicate/malformed, altered, stale, and wrong-signer cases                |
| Replay, concurrency, expiry, and crash-safe state                      | `store.ts`, `service.ts`                  | uniqueness, abandoned-work expiry, rate-limit, renewal, and restart cases  |
| Narrow signer calls, nonce ownership, kill switch, daily ceiling       | `signer-policy.ts`, `isolated-signer.ts`  | altered authorization, lifecycle, deterministic journal, and ceiling cases |
| Authenticated local-only signing boundary                              | `signer-ipc.ts`                           | exact-shape/authentication, socket mode, and coarse-rejection cases        |
| Reviewable operator sequencing with no broadcast action                | `operator.ts`, `run-domain-attester.ts`   | command allowlist, expanded arguments, and output-containment cases        |

The outbound firewall, actual pinned socket/TLS capture, process mount isolation, and controlled
public host are deployment evidence and cannot be established by unit tests. They remain explicit
G3 stop conditions below.

The implementation is split along the trust boundary:

```text
domain-attester/service.ts
  -> durable store.ts
  -> secure-fetch.ts + domain-policy.ts + proof-signature.ts
  -> canonical authorization
  -> authenticated signer-ipc.ts
  -> isolated-signer.ts
  -> signed bytes returned to the verifier journal
```

The verifier may receive the IPC token, but it must not mount the signer key. The signer accepts an
authorization object, not an arbitrary contract call, and derives the only allowed v2 registry
call itself.

## Signer provisioning

Do not run these commands until the isolated account files have a recovery-tested backup and the
reviewed v2 compatibility cutover identifies the same attester principal.

```sh
pnpm attester:provision-signer --role domain_attester
pnpm attester:signer --role domain_attester
```

Provisioning copies only the selected role's raw key into a mode-`0600` signer file and creates a
separate mode-`0600` IPC token. It refuses to overwrite either file. The signer checks its private
key against the configured public attester, listens on a mode-`0600` Unix socket, keeps its own
mode-`0600` SQLite nonce/transaction journal, supports a filesystem kill switch, and enforces a
daily issuance ceiling.

The canonical attester uses the separate `canonical_attester` role and enables only the operator
lifecycle authorization. Domain and lifecycle policies cannot be selected through an arbitrary
request field.

## Local operator flow

The operator command exposes only four staged actions. There is deliberately no broadcast action.

```sh
pnpm attester:operator challenge \
  --domain copperline.example \
  --subject ST000000000000000000002AMW42H.copperline-app \
  --role "Application contract" \
  --source-address 203.0.113.10

pnpm attester:operator verify --request-id <request-id>
pnpm attester:operator sign --request-id <request-id>
pnpm attester:operator status --request-id <request-id>
```

The sample domain, principal, and source address are non-routable documentation placeholders. Use
the reviewed fictional domain, its exact deployed subject, and the actual public requester address
during an approved exercise.

`challenge` stores and prints the exact document to sign and publish. `verify` performs the pinned
HTTPS fetch, strict proof checks, renewal read, and durable authorization. `sign` requests the
isolated signer over authenticated IPC and prints only the request ID, signer nonce, and local
transaction ID; serialized bytes stay in the mode-`0600` SQLite journals. `status` prints the
reviewable recovery state without private key material or the deployer signature.

The defaults can be redirected without command-line secret values:

```text
ORIGIN_ATTESTER_DATABASE
ORIGIN_ATTESTER_SIGNER_SOCKET
ORIGIN_ATTESTER_IPC_TOKEN_FILE
ORIGIN_ATTESTER_API_URL
```

The token file must remain mode `0600`. The operator process receives the IPC token but never the
signer key.

## Durable request lifecycle

```text
challenge-issued -> verified -> authorized -> signed
  -> broadcast-unknown -> pending -> confirmed/rejected
```

Several unverified challenges may exist for one domain and subject. Only one authorization may be
in flight for an `(attester, subject)` pair. Expired abandoned challenges and unsigned stale
authorizations are durably rejected so they cannot exhaust concurrency forever. Once signed, the
exact serialized bytes, signer nonce, and local transaction ID remain the recovery identity; an
uncertain attempt must be reconciled and never replaced blindly.

## G3 gate still required

Before the first live domain claim, the reviewer must verify all of the following in the actual
execution environment:

1. The public hostname is a controlled fictional eTLD+1 with valid TLS and no redirects.
2. Egress policy independently blocks loopback, private, link-local, metadata, and internal ranges.
3. A packet capture or equivalent proves the TLS socket uses the validated pinned address while
   certificate verification uses the canonical hostname.
4. The verifier cannot read or mount the signer key, and the signer holds only the isolated role.
5. The domain attester and validity interval already exist in wallet-owned v2 configuration.
6. The reviewed authorization, fee, nonce, signed bytes, and local transaction ID are journaled
   before any network request.
7. A separate approval explicitly permits the one bounded Testnet broadcast.

Until that gate is complete, stop after local tests and authorization review.
