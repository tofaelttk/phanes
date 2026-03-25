# AEOS / Phanes — production overview

**AEOS** (Agent Economic Operating System), distributed as the PyPI package **`phanes`**, is a vertically integrated stack for **autonomous agents as economic actors**: identity, binding agreements, risk-aware execution, dispute handling, dual settlement rails (fiat + on-chain stablecoin), BFT-notarized history, and formal models for safety-critical paths.

This document aligns the **implementation** in this repository with the **public narrative** on [phanes.app](https://phanes.app).

## Problem framing (why not “payments only”)

Payment rails answer: *can value move?*  
Economic actors also need: *who is acting*, *under what rules*, *what happens on breach*, *how risk is metered*, *how history is proved*, and *how agents integrate without bespoke glue*.

AEOS treats those as **first-class modules** rather than ad hoc application logic.

## Nineteen modules (conceptual grouping)

The marketing site groups **19 modules** into six layers. The codebase maps as follows:

1. **Integration** — `aeos/server.py` (REST), `aeos/mcp_server.py` (MCP), `ts-sdk/` (typed client + local crypto helpers).  
2. **Economic** — `identity.py`, `contracts.py`, `disputes.py`, `risk.py`, `tokenization.py`.  
3. **Intelligence** — `ml_engine.py`, `graph_intelligence.py`, `state_channels.py`.  
4. **Cryptographic** — `crypto_primitives.py`, `threshold_crypto.py`, `bulletproofs_ffi.py` + `bulletproofs/` (Rust).  
5. **Consensus & settlement** — `bft_ledger.py`, `settlement.py` (Stripe), `usdc_settlement.py`.  
6. **Persistence & audit** — `persistence.py`, `ledger.py`.

**Formal verification** lives in `formal/` (TLA+); **security audit PDF** and **whitepaper PDF** live at repository root (referenced, not duplicated here).

## Design principles (engineering-level)

- **Cryptographic binding** — Mutations are tied to Ed25519 identities, hash-chained ledger entries, and (where used) threshold or zero-knowledge proofs.  
- **Deterministic protocol cores** — Contracts and PBFT messages use canonical JSON serialization for digests and signatures.  
- **Separation of concerns** — Risk consumes ML + graph signals; disputes consume contracts + risk context; settlement adapters do not redefine contract semantics.  
- **Verifiable history** — Local `Ledger` provides append-only hash chain + Merkle proofs; `DistributedLedger` adds PBFT quorum certificates for replicated commit.  
- **Optional heaviness** — FastAPI server, Stripe, scikit-learn/networkx ML graph extras are **optional extras** in `pyproject.toml` (`[server]`, `[settlement]`, `[ml]`).

## Version and test status

Package version is defined in `pyproject.toml` (e.g. `0.3.1` at time of writing).  
Run `python3 tests/test_all.py` from the repo root; with `phanes[server]` installed, REST tests execute as well.

## Where “industrial” docs stop today

The `industrial/` subdirectory contains **roadmap drafts** (marked **Coming soon**) for SOC2-style control matrices, SLO/SLA playbooks, and reproducible build provenance. Those are **not** fully specified in application code yet; they exist so docs.phanes.app can publish honest boundaries between *shipped primitives* and *enterprise program* work.

## Next reads

- [Layered architecture](architecture/layered-stack.md)  
- [Module matrix](protocol/module-matrix.md)  
- [REST API](integration/rest-api.md)  
