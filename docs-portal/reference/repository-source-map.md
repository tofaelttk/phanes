# Repository source map

All paths relative to repository root **outside** `docs-portal/`.

## Python protocol (`aeos/`)

| File | Responsibility |
|------|----------------|
| `__init__.py` | Package metadata |
| `crypto_primitives.py` | Ed25519, hashes, Merkle, commitments, VRF, AES-GCM, HKDF |
| `identity.py` | Agents, DIDs, delegation, VCs, selective disclosure |
| `contracts.py` | Contracts, obligations, escrow, factory templates |
| `disputes.py` | Disputes, evidence, resolution, VRF arbitration |
| `risk.py` | Risk scoring, profiles, circuit breakers, insurance hooks |
| `ml_engine.py` | Features, isolation forest, Markov, drift, ensemble |
| `graph_intelligence.py` | Trust, communities, cascades, Sybil signals |
| `threshold_crypto.py` | Shamir, threshold sigs, time-locks |
| `tokenization.py` | Programmable tokens |
| `state_channels.py` | Bilateral channels |
| `ledger.py` | Immutable hash chain + Merkle |
| `bft_ledger.py` | PBFT distributed ledger |
| `persistence.py` | SQLite storage engine |
| `settlement.py` | Stripe escrow |
| `usdc_settlement.py` | Multi-chain ERC-20 escrow tx builders |
| `bulletproofs_ffi.py` | Rust Bulletproofs bridge |
| `server.py` | FastAPI REST |
| `mcp_server.py` | MCP tools |

## Root scripts

| File | Responsibility |
|------|----------------|
| `demo.py` | End-to-end demonstration |

## Rust (`bulletproofs/`)

| Path | Responsibility |
|------|----------------|
| `src/lib.rs`, `src/main.rs` | Bulletproofs implementation |
| `Cargo.toml` | Crate manifest |

## TypeScript (`ts-sdk/`)

| Path | Responsibility |
|------|----------------|
| `src/crypto.ts` | Crypto helpers |
| `src/identity.ts` | Identity parity |
| `src/contracts.ts` | Contract parity |
| `src/client.ts` | HTTP client |
| `src/index.ts` | Exports |

## Formal (`formal/`)

| File | Responsibility |
|------|----------------|
| `AEOSContract.tla` | Escrow FSM spec |
| `AEOSPBFT.tla` | Consensus spec |

## Tests & tooling

| Path | Responsibility |
|------|----------------|
| `tests/test_all.py` | Unified test runner |
| `pyproject.toml` | Packaging, extras, entry points |
| `Dockerfile`, `docker-compose.yml`, `fly.toml` | Deployment |

## Publications (PDF)

| File | Responsibility |
|------|----------------|
| `AEOS_Whitepaper_v0.1.pdf` | Technical narrative |
| `AEOS_Security_Audit_v0.1.pdf` | STRIDE audit |

These PDFs are **not** copied into `docs-portal/`; link from your docs site static host.
