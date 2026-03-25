# Module matrix (19 modules → code)

Quick reference: **marketing module** → **primary source file(s)**.

| # | Module (as on phanes.app) | Primary implementation |
|---|---------------------------|----------------------|
| 1 | Identity | `aeos/identity.py` |
| 2 | Contracts | `aeos/contracts.py` |
| 3 | Disputes | `aeos/disputes.py` |
| 4 | Risk Engine | `aeos/risk.py` |
| 5 | ML Engine | `aeos/ml_engine.py` |
| 6 | Graph Intelligence | `aeos/graph_intelligence.py` |
| 7 | Threshold Crypto | `aeos/threshold_crypto.py` |
| 8 | Tokenization | `aeos/tokenization.py` |
| 9 | State Channels | `aeos/state_channels.py` |
| 10 | BFT Consensus | `aeos/bft_ledger.py` |
| 11 | Stripe Settlement | `aeos/settlement.py` |
| 12 | USDC Settlement | `aeos/usdc_settlement.py` |
| 13 | Persistence | `aeos/persistence.py` |
| 14 | MCP Server | `aeos/mcp_server.py` |
| 15 | REST API | `aeos/server.py` |
| 16 | TypeScript SDK | `ts-sdk/src/*.ts` |
| 17 | Bulletproofs | `bulletproofs/` (Rust), `aeos/bulletproofs_ffi.py` |
| 18 | Formal Verification | `formal/AEOSContract.tla`, `formal/AEOSPBFT.tla` |
| 19 | Immutable Ledger | `aeos/ledger.py` |

**Cryptographic primitives** underpinning many rows: `aeos/crypto_primitives.py`.

## Optional dependency groups

From `pyproject.toml`:

- `phanes[server]` — FastAPI + uvicorn for REST.  
- `phanes[settlement]` — Stripe SDK.  
- `phanes[ml]` — scikit-learn, scipy, networkx for full ML/graph paths.  
- `phanes[dev]` — pytest, httpx.  
- `phanes[all]` — union of the above.

## Test coverage map

`tests/test_all.py` exercises crypto, identity, contracts, threshold crypto, tokenization, state channels, ML, graph, disputes, risk, ledger, BFT, MCP, settlement, bulletproofs FFI, persistence, USDC, cross-module signature consistency, and (when installed) REST.

## Deep dives

- [Identity](identity.md)  
- [Contracts & escrow](contracts-escrow.md)  
- [Risk, ML, graph](risk-ml-graph.md)  
- [Consensus & ledger](consensus-ledger.md)  
