# Domain-Control Fetch Security

Status: required design for the Day 3 Testnet attester

The Origin attester will fetch a public challenge document from an organization's domain before it signs an on-chain claim. That fetch crosses a hostile trust boundary: an applicant controls the hostname, DNS answers, HTTP response, and response timing, while the service sits behind a live signing key. The fetcher must therefore be a constrained verifier, not a general URL fetch facility.

This specification is normative for the prototype. A Day 3 implementation is incomplete unless the requirements and adversarial tests below are enforced.

## Fixed request shape

- The applicant supplies a normalized DNS domain, not a URL.
- The service constructs exactly `https://<domain>/.well-known/stacks-origin.json`.
- Only HTTPS on port 443 is permitted.
- Userinfo, fragments, query strings, alternate ports, IP literals, wildcard hostnames, Unicode ambiguity, and embedded credentials are rejected.
- The hostname is converted to its canonical ASCII form once. The canonical value must equal the domain inside the signed challenge.
- Redirects are not followed. Any 3xx response fails verification.
- The request sends no cookies, authorization headers, client certificates, referrer, or ambient proxy credentials.

## Address validation and DNS rebinding

Before opening a connection, the fetcher resolves every A and AAAA answer and rejects the request if any answer is not globally routable public unicast. At minimum, it must reject:

- IPv4 and IPv6 loopback, unspecified, private, link-local, multicast, documentation, benchmarking, and reserved ranges;
- IPv4 carrier-grade NAT and IPv4-mapped IPv6 representations of a blocked address;
- cloud and platform metadata destinations, including `169.254.169.254`, even when reached through DNS aliases or unusual textual encodings;
- the attester's own public and private service addresses and any configured internal network ranges.

The validated address must be pinned for the actual TCP/TLS connection while preserving the canonical hostname for SNI and certificate validation. The HTTP client must not perform a second uncontrolled DNS resolution. Every retry is a new verification attempt and must repeat resolution and address validation before connecting.

An outbound firewall must independently deny loopback, private, link-local, metadata, and internal service networks. Application checks are the primary control; egress policy is defense in depth.

## TLS and HTTP limits

- Use the platform trust store and verify the certificate against the canonical hostname.
- Do not disable TLS verification or accept self-signed certificates.
- Allow only `GET` and require a successful 2xx response.
- Require `Content-Type: application/json`, allowing an optional UTF-8 charset.
- Limit response headers, compressed bytes, and decompressed body size. The prototype body limit is 64 KiB.
- Apply a five-second total deadline with tighter connection and first-byte deadlines where supported.
- Abort slow streams after the size or time limit; do not continue reading in the background.
- Do not automatically retry status codes. A caller may initiate a new rate-limited verification attempt.

## Challenge validation before signing

The service signs nothing unless the fetched document:

1. parses as one JSON object with no duplicate keys;
2. matches the versioned Origin schema and rejects unknown security-sensitive fields;
3. contains the exact canonical domain and exact Stacks subject from the pending request;
4. contains the server-issued nonce, intended attester principal, policy version, and an unexpired timestamp window;
5. carries a valid signature from the standard principal that deployed the subject contract;
6. has not been consumed before;
7. passes the configured role and display-name bounds before those strings enter a transaction.

Nonce consumption and issuance recording must be atomic from the service's perspective. A retry after an uncertain broadcast must reconcile the transaction by its locally computed transaction ID or request ID rather than issue a second claim blindly.

## Signing-key boundary

The network-facing verifier must not receive a mnemonic. It submits a canonical, policy-complete issuance request to a separate signer interface. The signer accepts only the Origin registry contract, `issue-attestation`, bounded arguments, the configured Testnet chain ID, and a short expiration window.

For the prototype, the trusted attester must use a seed that is not shared with the registry deployer, hostile issuer, or fixture deployers. The current restored fixture key must be rotated before the Day 3 service is allowed to issue.

## Logging and user-visible errors

- Log the request ID, canonical domain, subject, policy result, resolved public address class, response size, and final disposition.
- Never log a mnemonic, private key, raw signature material beyond the public challenge signature, cookies, or complete response bodies.
- Return coarse public errors. Detailed DNS and network failures remain in restricted operator logs so the endpoint cannot be used as an internal-network oracle.
- Rate-limit by account, domain, subject, and source address, with a global concurrency ceiling.

## Required adversarial tests

The implementation must prove rejection of:

- direct loopback, RFC1918, link-local, metadata, IPv6 local, and IPv4-mapped IPv6 targets;
- a public hostname that resolves to any blocked address;
- a DNS-rebinding fixture whose validation answer is public but connection-time answer is private;
- redirects to same-host, cross-host, HTTP, alternate-port, and blocked-address destinations;
- oversized, compressed-oversized, slow, malformed, duplicate-key, wrong-content-type, stale, replayed, wrong-domain, wrong-subject, and wrong-signer documents;
- automatic environment-proxy routing and leakage of ambient credentials;
- signer requests with a different contract, function, network, attester, expiration policy, or argument shape.

Positive tests must use a controlled public test host and a fake signer. Unit and integration tests must never invoke the live Testnet signing key.

## Operational acceptance gate

Before Day 3 can broadcast a claim, all fetch-hardening tests must pass, the isolated attester principal must be recorded in wallet-owned configuration, the signer must hold only that isolated key, and outbound network policy must be demonstrated from the deployed environment.
