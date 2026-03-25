# Identity, credentials, and delegation

## Purpose

`aeos/identity.py` implements **cryptographic agent identity** suitable for an agent economy:

- **DID-style addressing** — Agents and controllers are identified by strings (`did:aeos:...`) with keys bound via `KeyPair` (`crypto_primitives.py`).  
- **KYA-style linkage** — Each agent associates to a **controller DID** (legal or organizational anchor).  
- **Scoped capabilities** — `CapabilityScope` enumerates actions (`TRANSACT`, `SIGN_CONTRACT`, `DELEGATE`, `DISPUTE`, …).  
- **Quantitative bounds** — `AuthorityBounds` caps transaction size, daily volume, contract duration, delegation depth, concurrency, counterparties, geo/time windows.  
- **Delegation trees** — Sub-agents receive **strictly weaker** bounds (enforced by `AuthorityBounds.contains`).  
- **Selective disclosure** — `SelectiveDisclosure` combines Pedersen commitments, Merkle membership proofs, and optional ZK proof bytes to reveal **one** claim without leaking the credential bundle.

## Agent taxonomy

`AgentType`:

- `AUTONOMOUS` — Full automated decision loop within bounds.  
- `SEMI_AUTONOMOUS` — Human-in-the-loop for high-stakes branches (policy outside this file).  
- `DELEGATED` — Instruction-following sub-agent.  
- `COMPOSITE` — Multi-agent aggregate presented as one entity.

## Verifiable credentials

`VerifiableCredential` carries typed claims (`capability`, `reputation`, `compliance`, `insurance`, …), issuance/expiry, issuer/subject DIDs, Ed25519 signature over canonical JSON (`to_bytes`), and a `revocation_id` for status queries.

## Cryptographic hooks

Identity imports:

- `KeyPair`, `sha256`, `hash_to_scalar`, `Commitment`, `RangeProof`, `MerkleAccumulator`, `MerkleProof`, `TimestampAuthority`, `leaf_hash`

Range proofs and commitments allow **proving** authority limits (e.g., transaction cap) without revealing exact balances elsewhere in the system.

## Operational notes

- **Registry:** `AgentRegistry` tracks active agents and supports revocation workflows.  
- **Revocation** is first-class in the credential model (`revocation_id`).  
- **Persistence:** Long-term storage of registry state is via `persistence.py` in server-backed deployments.

## Related

- [Cryptography primitives](../cryptography/primitives-proofs-threshold.md)  
- [REST: `/agents`](../integration/rest-api.md)  
