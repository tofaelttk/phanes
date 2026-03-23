# AEOS Protocol

**The economic operating system for autonomous AI agents.**

Identity. Contracts. Disputes. Risk. Settlement. Consensus. — Everything an AI agent needs to exist as an economic entity.

[![Tests](https://img.shields.io/badge/tests-67%2F67-brightgreen)]()
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)]()
[![TypeScript](https://img.shields.io/badge/typescript-SDK-blue)]()
[![Rust](https://img.shields.io/badge/rust-bulletproofs-orange)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-orange)]()

---

## The Problem

Stripe launched Machine Payments Protocol on March 18, 2026. Visa shipped agent CLI. Mastercard, Google, Coinbase — everyone is racing to let AI agents **send money**.

But payments are 5% of what an economic actor needs.

When a human starts a business, there's an entire infrastructure: LLC formation, bank accounts, contracts, insurance, compliance, tax filing. For AI agents, none of this exists.

An AI agent that autonomously operates needs: cryptographic identity, binding contracts, escrow with milestone release, dispute resolution when things go wrong, real-time risk management, behavioral anomaly detection, delegation of authority with provable bounds, Byzantine fault tolerant consensus, and an immutable audit trail.

**We built all of it.**

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
| **Settlement** | Stripe PaymentIntent escrow, authorize-then-capture, refund on dispute | ✅ Complete |
| **MCP Server** | 11 tools for Claude/GPT native integration via Model Context Protocol | ✅ Complete |
| **REST API** | FastAPI server, 17 endpoints | ✅ Complete |
| **TypeScript SDK** | Full client library with crypto, identity, contracts, typed HTTP client | ✅ Complete |
| **Bulletproofs** | Rust Ristretto255 zero-knowledge range proofs with Python FFI | ✅ Complete |
| **Ledger** | Append-only hash chain, Merkle proofs, full audit trail | ✅ Complete |

## Quick Start

```bash
pip install phanes
```

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

This gives Claude/GPT 11 native tools: `aeos_create_agent`, `aeos_create_contract`, `aeos_sign_contract`, `aeos_fulfill_obligation`, `aeos_file_dispute`, `aeos_resolve_dispute`, `aeos_assess_risk`, and more.

### TypeScript SDK:

```typescript
import { AgentIdentity, AgentType, Capability, PhanesClient } from "@phanes/sdk";

// Local (no server needed)
const agent = AgentIdentity.create("did:aeos:corp", AgentType.AUTONOMOUS,
  [Capability.TRANSACT, Capability.SIGN_CONTRACT],
  { maxTransactionValue: 100_000_00 });

// Or via HTTP client
const client = new PhanesClient("http://localhost:8420");
const created = await client.createAgent({ controllerDid: "did:aeos:corp" });
```

### Stripe Settlement:

```python
from aeos.settlement import StripeSettlementEngine

engine = StripeSettlementEngine("sk_test_...")

# Create escrow (authorize-only, funds held but not moved)
result = engine.create_escrow("contract-001", 25000, "usd", "did:alice", "did:bob")

# Obligation fulfilled → capture funds
engine.capture_escrow("contract-001")

# Dispute → refund
engine.refund_escrow("contract-001", reason="non_delivery")
```

### BFT Consensus:

```python
from aeos.bft_ledger import DistributedLedger

ledger = DistributedLedger(num_replicas=4)  # Tolerates 1 Byzantine fault

result = ledger.submit({"type": "agent_registered", "did": "did:aeos:alice"})
assert result["committed"]  # 2f+1 replicas agreed

agent = ledger.query("did:aeos:alice")  # Query replicated state
```

## Run the Full Demo

```bash
git clone https://github.com/tofaelttk/phanes.git
cd phanes
pip install -e ".[all]"
python demo.py
```

## Run Tests

```bash
python tests/test_all.py
```

Tests cover all 16 modules across 67 test cases:

```
═══ CRYPTO PRIMITIVES ═══       (9 tests)
═══ IDENTITY ═══                (5 tests)
═══ CONTRACTS ═══               (3 tests)
═══ THRESHOLD CRYPTO ═══        (6 tests)
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
═══ BULLETPROOFS FFI ═══        (2 tests)
═══ REST API SERVER ═══         (4 tests)
═══ CROSS-MODULE ═══            (1 test)

══════════════════════════════════════
  RESULTS: 67 passed, 0 failed
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
│   BFT Consensus (PBFT)   │   Stripe Settlement Engine      │
├─────────────────────────────────────────────────────────────┤
│                    Immutable Ledger                          │
└─────────────────────────────────────────────────────────────┘
```

## Cryptographic Foundations

All cryptography is built on production primitives:

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

## Comparison

| Feature | Stripe MPP | Skyfire KYA | Google AP2 | **AEOS** |
|---|---|---|---|---|
| Agent payments | ✅ | ✅ | ✅ | ✅ (Stripe) |
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
| MCP integration | ❌ | ❌ | ❌ | ✅ |
| TypeScript SDK | N/A | ❌ | N/A | ✅ |
| Security audit | N/A | Unknown | Unknown | ✅ |
| Immutable audit trail | ❌ | Partial | Partial | ✅ |

## Repository Structure

```
phanes/
├── aeos/                        # Python protocol (17 modules)
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
│   ├── settlement.py            # Stripe PaymentIntent escrow
│   ├── mcp_server.py            # MCP server (11 tools, JSON-RPC/stdio)
│   ├── bulletproofs_ffi.py      # Python→Rust FFI bridge
│   └── server.py                # FastAPI REST server (17 endpoints)
├── ts-sdk/                      # TypeScript SDK
│   ├── src/                     # crypto, identity, contracts, client
│   └── tests/                   # 22 tests
├── bulletproofs/                # Rust Bulletproofs
│   └── src/                     # Ristretto255, Merlin transcripts
├── tests/test_all.py            # 67 tests across all modules
├── demo.py                      # End-to-end demonstration
├── AEOS_Whitepaper_v0.1.pdf     # Technical whitepaper
├── AEOS_Security_Audit_v0.1.pdf # Security audit (STRIDE, 18 findings)
└── pyproject.toml               # pip install phanes
```

## Roadmap

- [x] Core protocol (17 modules, 8,000+ lines Python)
- [x] REST API server (17 endpoints)
- [x] Technical whitepaper
- [x] 67-test suite (all modules covered)
- [x] TypeScript/Node SDK (22 tests)
- [x] MCP server for Claude/GPT (11 tools)
- [x] Stripe settlement hooks (authorize-capture escrow)
- [x] Production Bulletproofs (Rust FFI, 13 tests)
- [x] BFT distributed ledger (PBFT, 4–13 node clusters)
- [x] Security audit (STRIDE threat model, 18 findings)
- [ ] Database persistence (currently in-memory)
- [ ] Hosted deployment
- [ ] USDC settlement (Tempo/on-chain)
- [ ] Formal verification (TLA+/Coq)

## License

Apache 2.0

## Links

- **Website:** [phanes.app](https://phanes.app)
- **Whitepaper:** [AEOS_Whitepaper_v0.1.pdf](./AEOS_Whitepaper_v0.1.pdf)
- **Security Audit:** [AEOS_Security_Audit_v0.1.pdf](./AEOS_Security_Audit_v0.1.pdf)
- **API Docs:** Run `phanes-server` → http://localhost:8420/docs
