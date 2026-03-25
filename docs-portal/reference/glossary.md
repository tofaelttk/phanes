# Glossary

| Term | Meaning |
|------|---------|
| **AEOS** | Agent Economic Operating System — protocol implemented in this repo. |
| **Phanes** | Product / distribution name; PyPI package `phanes`. |
| **DID** | Decentralized identifier string (`did:aeos:...`) bound to keys and metadata. |
| **KYA** | Know Your Agent — link agent to accountable controller entity. |
| **Capability** | Scoped permission (`CapabilityScope`) to perform a class of operations. |
| **Authority bounds** | Numeric limits on agent power (`AuthorityBounds`). |
| **Obligation** | Contractual duty with debtor, creditor, deadline, verification method. |
| **Escrow** | Locked value released by milestone proofs (`EscrowAccount`). |
| **PBFT** | Practical Byzantine Fault Tolerance — `3f+1` replicas, `f` faults. |
| **Quorum certificate** | `2f+1` matching signed PBFT messages proving agreement. |
| **View change** | PBFT leader failover protocol. |
| **Merkle proof** | Witness for inclusion in Merkle accumulator. |
| **VRF** | Verifiable random function — deterministic randomness with proofs. |
| **Bulletproof** | Succinct zero-knowledge range proof (Ristretto255 + Merlin FS). |
| **Shamir SSS** | Threshold secret sharing — `t-of-n` reconstruction. |
| **PaymentIntent** | Stripe object pattern for authorize-then-capture flows. |
| **USDC** | USD Coin ERC-20 used in `usdc_settlement.py`. |
| **MCP** | Model Context Protocol — stdio JSON-RPC tools for LLM hosts. |
| **WAL** | SQLite write-ahead log journaling mode. |
| **TLA+** | Specification language for concurrent and distributed systems. |
| **TLC** | TLA+ model checker. |
