# Origin

Origin is a proposed future Stacks Connect addendum for wallet-side provenance of the exact principal targeted by a transaction. The hackathon proof of concept implements the idea directly in Leather as the first reference integration.

This repository contains the hackathon product plan, demo application, Origin registry contract, Testnet fixtures, and integration notes. Leather source remains in its own repository and is not vendored here.

## Start here

- [Hackathon plan](origin-hackathon-plan.md)
- [Executable demo plan](demo-plan.md)
- [Repository map](repository-map.md)
- [Leather baseline](leather-baseline.md)
- [Original proposal](contract-provenance-certificate-plan.md)

## Proof-of-concept boundary

- One Clarity registry contract
- Seven logical attestation fields
- Three harmless contract-call scenarios
- Five provenance UI states
- One active Leather extension integration
- Configured Testnet attesters; no claim indexer or application-supplied hints
- A proposal path toward Stacks Connect after the proof of concept, with no Stacks.js or Connect changes during the hackathon

Origin provides provenance, not a security guarantee. Wallet trust policy remains wallet-owned, and Stacks post-conditions remain an independent asset-protection signal.
