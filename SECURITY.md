# Security Policy

## Project status

Origin is a Stacks Testnet proof of concept. It is not a production identity service, attester, wallet release, or custody system. Do not use its disposable Testnet keys or operational workflows with assets of value.

The security boundary includes:

- Clarity registry authorization and lifecycle semantics;
- wallet-owned subject derivation and attester policy;
- quarantine of unrecognized claim text;
- domain-proof fetching and SSRF resistance;
- verifier, isolated-signer, IPC, nonce, journal, and recovery behavior; and
- evidence indexing and fail-neutral current-state reconciliation.

Origin establishes provenance claims, not contract or transaction safety.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or include exploit details in a public pull request.

Use [GitHub private vulnerability reporting](https://github.com/huth-stacks/origin/security/advisories/new). Include:

- affected commit and component;
- reproduction steps or a minimal proof of concept;
- expected and observed behavior;
- impact on the trust boundary;
- whether Testnet state or credentials were touched; and
- a safe contact method for follow-up.

Never send seed phrases, private keys, IPC tokens, or decrypted recovery material. If a credential may have been exposed, report the exposure without reproducing the credential itself.

## Supported version

Security fixes target the current `main` branch. Historical plans, reviews, v1 contract code, and dated deployment records are retained for transparency but are not maintained release lines.

## Public discussion

After a fix is available, maintainers may publish a concise advisory describing affected versions, impact, and remediation. Reporters will be credited when requested and appropriate.
