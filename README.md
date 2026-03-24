# AEOS Protocol

**The economic operating system for autonomous AI agents.**

Identity. Contracts. Disputes. Risk. Settlement. Consensus. — Everything an AI agent needs to exist as an economic entity.

[![Tests](https://img.shields.io/badge/tests-85%2F85-brightgreen)]()
[![PyPI](https://img.shields.io/pypi/v/phanes)](https://pypi.org/project/phanes/)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)]()
[![TypeScript](https://img.shields.io/badge/typescript-SDK-blue)]()
[![Rust](https://img.shields.io/badge/rust-bulletproofs-orange)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-orange)]()

---

## The Problem

Stripe launched Machine Payments Protocol on March 18, 2026. Visa shipped agent CLI. Mastercard, Google, Coinbase — everyone is racing to let AI agents **send money**.

But payments are 5% of what an economic actor needs.

When a human starts a business, there's an entire infrastructure: LLC formation, bank accounts, contracts, insurance, compliance, tax filing. For AI agents, none of this exists.

**We built all of it.**

## Install

```bash
pip install phanes
```

## What AEOS Does

| Layer | What It Solves | Status |
|---|---|---|
| **Identity** | DID-based agent identity, selective disclosure, delegation chains | ✅ Complete |
| **Contracts** | Binding agreements, escrow, milestone release, penalty enforcement | ✅ Complete |
| **Disputes** | Auto-resolution, VRF arbitrator selection, confidence-weighted voting | ✅ Complete |
| **Risk** | Behavioral profiling, circuit breakers, counterparty scoring, insurance pools | ✅ Complete |
| **ML Engine** | Isolation Forest anomaly detection, Markov models, entropy drift detection | ✅ Complete |
| **Graph Intel** | PageRank trust, collusion detection, cascade simulation, Sybil detection | ✅ Complete |
| **Threshold Crypto** | Shamir secret sharing, t-of-n signatures, time-lock puzzles | ✅ Complete |
| **Tokenization** | Programmable tokens with decay, staking, accrual, governance | ✅ Complete |
| **State Channels** | Off-chain micro-transactions, cooperative/force close | ✅ Complete |
| **BFT Consensus** | PBFT distributed ledger, view changes, quorum certificates | ✅ Complete |
| **Stripe Settlement** | PaymentIntent escrow, authorize-then-capture, refund on dispute | ✅ Complete |
| **USDC Settlement** | On-chain ERC-20 escrow on Ethereum, Base, Arbitrum, Polygon | ✅ Complete |
| **Persistence** | SQLite WAL-mode, ACID transactions, schema migrations, crash recovery | ✅ Complete |
| **MCP Server** | 11 tools for Claude/GPT native integration via Model Context Protocol | ✅ Complete |
| **REST API** | FastAPI server, 17 endpoints | ✅ Complete |
| **TypeScript SDK** | Full client library with crypto, identity, contracts, typed HTTP client | ✅ Complete |
| **Bulletproofs** | Rust Ristretto255 zero-knowledge range proofs with Python FFI | ✅ Complete |
| **Formal Verification** | TLA+ specs for contract escrow and PBFT consensus safety proofs | ✅ Complete |
| **Ledger** | Append-only hash chain, Merkle proofs, full audit trail | ✅ Complete |

## Quick Start

### Create an agent and sign a contract:

```python
from aeos.identity import AgentIdentity, AgentType, CapabilityScope, AuthorityBounds
from aeos.contracts import ContractFactory

alice = AgentIdentity.create(
    controller_did="did:aeos:acme-corp",
    agent_type=AgentType.AUTONOMOUS,
    capabilities={CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT},
    bounds=AuthorityBounds(max_transaction_value=100_000_00),
)

bob = AgentIdentity.create(
    controller_did="did:aeos:compute-inc",
    agent_type=AgentType.AUTONOMOUS,
    capabilities={CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT},
    bounds=AuthorityBounds(max_transaction_value=100_000_00),
)

contract = ContractFactory.service_agreement(
    alice.did, bob.did, "ML inference job", price=25_000_00
)
contract.sign(alice)
contract.sign(bob)
# Contract is now ACTIVE with $25,000 in escrow
```

### Run the API server:

```bash
pip install phanes[server]
phanes-server
# → http://localhost:8420/docs
```

### Use the MCP server (Claude Desktop / any MCP client):

```json
{
  "mcpServers": {
    "aeos": {
      "command": "python",
      "args": ["-m", "aeos.mcp_server"]
    }
  }
}
```

### Stripe Settlement:

```python
from aeos.settlement import StripeSettlementEngine

engine = StripeSettlementEngine("sk_test_...")
result = engine.create_escrow("contract-001", 25000, "usd", "did:alice", "did:bob")
engine.capture_escrow("contract-001")    # On fulfillment
engine.refund_escrow("contract-001")     # On dispute
```

### USDC On-Chain Settlement:

```python
from aeos.usdc_settlement import USDCSettlementEngine, Chain

engine = USDCSettlementEngine(chain=Chain.BASE)
escrow = engine.create_escrow("contract-001", 25000.00,
    "0xPayerAddress...", "0xPayeeAddress...",
    payer_did="did:alice", payee_did="did:bob")

approve_tx = engine.build_approve_tx(escrow)   # Payer signs
lock_tx = engine.build_lock_tx(escrow)         # Lock funds
release_tx = engine.build_release_tx(escrow)   # Release to payee
```

### BFT Consensus:

```python
from aeos.bft_ledger import DistributedLedger

ledger = DistributedLedger(num_replicas=4)  # Tolerates 1 Byzantine fault
result = ledger.submit({"type": "agent_registered", "did": "did:aeos:alice"})
assert result["committed"]
```

### Persistent Storage:

```python
from aeos.persistence import StorageEngine

db = StorageEngine("aeos_data.db")  # SQLite WAL mode, ACID
db.put_agent({...})
db.put_contract({...})
db.append_ledger(...)  # Immutable, hash-chained
ok, _ = db.verify_ledger_chain()  # Verify integrity
```

### Docker Deployment:

```bash
docker compose up -d
# → http://localhost:8420/docs
```

### TypeScript SDK:

```typescript
import { AgentIdentity, AgentType, Capability, PhanesClient } from "@phanes/sdk";

const agent = AgentIdentity.create("did:aeos:corp", AgentType.AUTONOMOUS,
  [Capability.TRANSACT, Capability.SIGN_CONTRACT],
  { maxTransactionValue: 100_000_00 });
```

## Run Tests

```bash
python tests/test_all.py
```

```
═══ CRYPTO PRIMITIVES ═══       (11 tests — incl. Fiat-Shamir tamper detection)
═══ IDENTITY ═══                (5 tests)
═══ CONTRACTS ═══               (3 tests)
═══ THRESHOLD CRYPTO ═══        (8 tests — incl. VSS tamper detection)
═══ TOKENIZATION ═══            (6 tests)
═══ STATE CHANNELS ═══          (5 tests)
═══ ML ENGINE ═══               (2 tests)
═══ GRAPH INTELLIGENCE ═══      (4 tests)
═══ DISPUTE RESOLUTION ═══      (1 test)
═══ RISK ENGINE ═══             (2 tests)
═══ LEDGER ═══                  (2 tests)
═══ BFT DISTRIBUTED LEDGER ═══  (8 tests)
═══ MCP SERVER ═══              (4 tests)
═══ SETTLEMENT ENGINE ═══       (3 tests)
═══ BULLETPROOFS FFI ═══        (3 tests — incl. tamper rejection)
═══ REST API SERVER ═══         (4 tests)
═══ PERSISTENCE ENGINE ═══      (5 tests)
═══ USDC ON-CHAIN SETTLEMENT ══ (6 tests — incl. ChainClient)
═══ CROSS-MODULE ═══            (1 test)

══════════════════════════════════════
  RESULTS: 84 passed, 0 failed
══════════════════════════════════════
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              MCP Server (11 tools)  │  REST API (17 routes) │
├─────────────────────────────────────────────────────────────┤
│  Identity  │ Contracts │ Disputes │  Risk  │ Tokenization   │
├────────────┼───────────┼──────────┼────────┼────────────────┤
│  ML Engine │   Graph Intelligence  │ State Channels         │
├─────────────────────────────────────────────────────────────┤
│  Threshold Crypto  │  Bulletproofs (Rust FFI)               │
├─────────────────────────────────────────────────────────────┤
│            Cryptographic Primitives (Ed25519)                │
├─────────────────────────────────────────────────────────────┤
│   BFT Consensus (PBFT)   │   Stripe + USDC Settlement      │
├─────────────────────────────────────────────────────────────┤
│      Persistent Storage (SQLite WAL)  │  Immutable Ledger   │
└─────────────────────────────────────────────────────────────┘
```

## Cryptographic Foundations

- **Signatures:** Ed25519 (RFC 8032) via PyNaCl/cryptography
- **Commitments:** SHA-256 Pedersen-style with blinding factors
- **Key Derivation:** HKDF-SHA256 for deterministic child keys
- **Encryption:** AES-256-GCM authenticated encryption
- **VRF:** Ed25519-based verifiable random function
- **Merkle Trees:** SHA-256 with domain separation (leaf vs. internal)
- **Secret Sharing:** Shamir over GF(L) with Lagrange interpolation
- **Threshold Sigs:** t-of-n via polynomial evaluation on shares
- **Range Proofs:** Bulletproofs (Ristretto255, Merlin transcripts) via Rust FFI
- **Consensus:** PBFT with Ed25519-signed quorum certificates
- **Formal Verification:** TLA+ specs with safety and liveness proofs

## Comparison

| Feature | Stripe MPP | Skyfire KYA | Google AP2 | **AEOS** |
|---|---|---|---|---|
| Agent payments | ✅ | ✅ | ✅ | ✅ (Stripe + USDC) |
| Agent identity | ❌ | ✅ | Partial | ✅ |
| Binding contracts | ❌ | ❌ | ❌ | ✅ |
| Escrow + milestones | ❌ | ❌ | ❌ | ✅ |
| Dispute resolution | ❌ | ❌ | ❌ | ✅ |
| Risk engine | ❌ | ❌ | ❌ | ✅ |
| Anomaly detection (ML) | ❌ | ❌ | ❌ | ✅ |
| Threshold crypto | ❌ | ❌ | ❌ | ✅ |
| State channels | ❌ | ❌ | ❌ | ✅ |
| Graph intelligence | ❌ | ❌ | ❌ | ✅ |
| BFT consensus | ❌ | ❌ | ❌ | ✅ |
| Zero-knowledge proofs | ❌ | ❌ | ❌ | ✅ (Bulletproofs) |
| On-chain settlement | ❌ | ❌ | ❌ | ✅ (USDC multi-chain) |
| Database persistence | N/A | Unknown | N/A | ✅ (SQLite WAL) |
| Formal verification | ❌ | ❌ | ❌ | ✅ (TLA+) |
| MCP integration | ❌ | ❌ | ❌ | ✅ |
| TypeScript SDK | N/A | ❌ | N/A | ✅ |
| Security audit | N/A | Unknown | Unknown | ✅ |
| Immutable audit trail | ❌ | Partial | Partial | ✅ |

## Repository Structure

```
phanes/
├── aeos/                        # Python protocol (19 modules)
│   ├── crypto_primitives.py     # Ed25519, Pedersen, Merkle, VRF, AES-GCM
│   ├── identity.py              # DID-based identity, delegation, registry
│   ├── contracts.py             # Multi-sig contracts, escrow, templates
│   ├── disputes.py              # 3-tier resolution, VRF arbitration
│   ├── risk.py                  # Behavioral profiling, circuit breakers
│   ├── ml_engine.py             # Isolation Forest, Markov, drift detection
│   ├── graph_intelligence.py    # PageRank, Sybil detection, cascades
│   ├── threshold_crypto.py      # Shamir SSS, t-of-n sigs, time-locks
│   ├── tokenization.py          # Programmable tokens with decay/staking
│   ├── state_channels.py        # Off-chain bilateral channels
│   ├── ledger.py                # Append-only hash chain
│   ├── bft_ledger.py            # PBFT consensus (Castro-Liskov 1999)
│   ├── persistence.py           # SQLite WAL, ACID, schema migrations
│   ├── settlement.py            # Stripe PaymentIntent escrow
│   ├── usdc_settlement.py       # On-chain USDC escrow (multi-chain)
│   ├── mcp_server.py            # MCP server (11 tools, JSON-RPC/stdio)
│   ├── bulletproofs_ffi.py      # Python→Rust FFI bridge
│   └── server.py                # FastAPI REST server (17 endpoints)
├── ts-sdk/                      # TypeScript SDK (22 tests)
├── bulletproofs/                 # Rust Bulletproofs (13 tests)
├── formal/                      # TLA+ formal verification specs
│   ├── AEOSContract.tla         # Contract escrow safety + liveness
│   └── AEOSPBFT.tla             # PBFT agreement + validity
├── tests/test_all.py            # 77 tests across all modules
├── Dockerfile                   # Production deployment
├── docker-compose.yml           # Local dev with persistent volume
├── fly.toml                     # Fly.io deployment config
├── demo.py                      # End-to-end demonstration
├── AEOS_Whitepaper_v0.1.pdf     # Technical whitepaper
├── AEOS_Security_Audit_v0.1.pdf # Security audit (STRIDE, 18 findings)
└── pyproject.toml               # pip install phanes
```

## Roadmap

- [x] Core protocol (19 modules, 9,000+ lines Python)
- [x] REST API server (17 endpoints)
- [x] Technical whitepaper
- [x] 84-test suite (all modules + tamper detection)
- [x] TypeScript/Node SDK (22 tests)
- [x] MCP server for Claude/GPT (11 tools)
- [x] Stripe settlement hooks (authorize-capture escrow)
- [x] USDC on-chain settlement (Ethereum, Base, Arbitrum, Polygon)
- [x] Production Bulletproofs (Rust FFI, 13 tests)
- [x] BFT distributed ledger (PBFT, 4–13 node clusters)
- [x] Database persistence (SQLite WAL, ACID, migrations)
- [x] Security audit (STRIDE threat model, 18 findings)
- [x] TLA+ formal verification (contract + PBFT safety proofs)
- [x] Docker + Fly.io deployment configs
- [x] Published to PyPI (`pip install phanes`)
- [ ] Hosted public deployment
- [ ] Formal verification (Coq proofs)
- [ ] Multi-region BFT deployment

## License

Apache 2.0

## Links

- **PyPI:** [pypi.org/project/phanes](https://pypi.org/project/phanes/)
- **Website:** [phanes.app](https://phanes.app)
- **Whitepaper:** [AEOS_Whitepaper_v0.1.pdf](./AEOS_Whitepaper_v0.1.pdf)
- **Security Audit:** [AEOS_Security_Audit_v0.1.pdf](./AEOS_Security_Audit_v0.1.pdf)
- **API Docs:** Run `phanes-server` → http://localhost:8420/docs
