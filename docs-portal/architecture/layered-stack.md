# Layered system architecture

This document mirrors the **six-layer spine** described on [phanes.app/architecture](https://phanes.app/architecture) and grounds it in **this repository’s modules**.

## Layer 1 — Integration surface

**Role:** Ingress for humans, backends, and frontier models.

| Capability | Implementation | Notes |
|------------|----------------|-------|
| REST API | `aeos/server.py` | FastAPI; **17 HTTP routes** when `phanes[server]` installed |
| MCP | `aeos/mcp_server.py` | **11 tools**; JSON-RPC over stdio |
| TypeScript SDK | `ts-sdk/src/*` | Local crypto + `PhanesClient` HTTP wrapper |

**Design choice:** MCP and REST share the same conceptual operations (agents, contracts, disputes, risk, ledger) but different transport and schema (OpenAPI vs MCP tool schemas).

## Layer 2 — Economic state

**Role:** Agents as entities that can **contract**, **dispute**, and **hold risk posture**.

| Module | File | Core abstractions |
|--------|------|---------------------|
| Identity | `identity.py` | `AgentIdentity`, `AgentType`, `CapabilityScope`, `AuthorityBounds`, delegation, VC-style credentials, selective disclosure hooks |
| Contracts | `contracts.py` | `Contract`, `ContractState`, `Obligation`, `EscrowAccount`, `ContractFactory` templates |
| Disputes | `disputes.py` | `Dispute`, evidence, VRF-flavored arbitrator selection, tiered resolution |
| Risk | `risk.py` | `RiskEngine`, `RiskScore`, `BehavioralProfile`, circuit breakers, insurance primitives |
| Tokenization | `tokenization.py` | Programmable balances, decay/staking/accrual semantics |

**Dependency intuition (high level):** Contracts reference identities; disputes reference contracts; risk scores actions using profiles that can be informed by ML/graph modules.

## Layer 3 — Intelligence

**Role:** Online inference over **streams** and **graphs**; latency compression via channels.

| Module | File | Techniques |
|--------|------|------------|
| ML engine | `ml_engine.py` | Feature extraction, Isolation Forest-style anomaly scoring, Markov behavioral model, entropy drift, ensemble scorer |
| Graph intelligence | `graph_intelligence.py` | Trust diffusion (PageRank-like), community structure, cascade simulation, Sybil-oriented signals |
| State channels | `state_channels.py` | Bilateral updates, cooperative vs force-close narrative |

**Coupling:** `RiskEngine` can incorporate behavioral and graph-derived signals (see `risk.py` imports and usage patterns in tests).

## Layer 4 — Cryptography

**Role:** Keys, commitments, proofs, and shared secrets without central key escrow.

| Module | File | Highlights |
|--------|------|------------|
| Primitives | `crypto_primitives.py` | Ed25519 `KeyPair`, SHA-256 Merkle (domain-separated leaves), Pedersen-style commitments, VRF, AES-GCM, HKDF |
| Threshold | `threshold_crypto.py` | Shamir shares, Lagrange reconstruction, threshold signatures, time-lock puzzle hooks |
| Bulletproofs | `bulletproofs/` + `bulletproofs_ffi.py` | Ristretto255 range proofs; Rust core, Python FFI |

## Layer 5 — Consensus & settlement

**Role:** Agree on ordering/finality; move value on **fiat** or **chain**.

| Module | File | Highlights |
|--------|------|------------|
| PBFT ledger | `bft_ledger.py` | Castro–Liskov PBFT; `PRE_PREPARE` / `PREPARE` / `COMMIT`; view change; Ed25519-signed `PBFTMessage`; `QuorumCertificate` |
| Stripe | `settlement.py` | PaymentIntent-style authorize/capture/refund mapping |
| USDC | `usdc_settlement.py` | ERC-20 approve + `transferFrom`; multi-chain config; unsigned tx builders for wallet signing |

## Layer 6 — Persistence & audit

**Role:** Durable operator state + **portable integrity story**.

| Module | File | Highlights |
|--------|------|------------|
| Immutable ledger (logical) | `ledger.py` | `Ledger`, `LedgerEntry`, `EventType`, hash chain, Merkle proofs |
| Storage engine | `persistence.py` | SQLite WAL, migrations, CRUD for agents/contracts, append ledger |

In deployment, the **single-node** `StorageEngine` and **replicated** `DistributedLedger` address different topologies; both preserve hash-linked semantics at the logical layer.

## Formal verification (orthogonal plane)

`formal/AEOSContract.tla` and `formal/AEOSPBFT.tla` model **safety/liveness** properties for escrow state machines and PBFT agreement. They are not runtime dependencies but **design oracles** for regressions and audits.

## Related

- [Data flows & invariants](data-flows-and-invariants.md)  
- [Consensus & ledger](../protocol/consensus-ledger.md)  
