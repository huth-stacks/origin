# Origin

Origin lets Leather show who a trusted attester associates with the exact Stacks contract in a transaction before the user approves it.

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

Origin provides provenance, not a security guarantee. Stacks post-conditions remain an independent asset-protection signal in Leather.
