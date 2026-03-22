# AEOS Protocol

**The economic operating system for autonomous AI agents.**

Identity. Contracts. Disputes. Risk. Audit. — Everything an AI agent needs to exist as an economic entity.

[![Tests](https://img.shields.io/badge/tests-45%2F45-brightgreen)]()
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-orange)]()

---

## The Problem

Stripe launched Machine Payments Protocol on March 18, 2026. Visa shipped agent CLI. Mastercard, Google, Coinbase — everyone is racing to let AI agents **send money**.

But payments are 5% of what an economic actor needs.

An AI agent that autonomously operates needs: cryptographic identity, binding contracts, escrow with milestone release, dispute resolution when things go wrong, real-time risk management, behavioral anomaly detection, delegation of authority with provable bounds, and an immutable audit trail.

**None of this exists.** Until now.

## What AEOS Does

| Layer | What It Solves | Status |
|---|---|---|
| **Identity** | DID-based agent identity, selective disclosure, delegation chains | ✅ Complete |
| **Contracts** | Binding agreements, escrow, milestone release, penalty enforcement | ✅ Complete |
| **Disputes** | Auto-resolution, VRF arbitrator selection, confidence-weighted voting | ✅ Complete |
| **Risk** | Behavioral profiling, circuit breakers, counterparty scoring | ✅ Complete |
| **ML Engine** | Isolation Forest anomaly detection, Markov models, drift detection | ✅ Complete |
| **Graph Intel** | PageRank trust, collusion detection, cascade simulation, Sybil detection | ✅ Complete |
| **Threshold Crypto** | Shamir secret sharing, t-of-n signatures, time-lock puzzles | ✅ Complete |
| **Tokenization** | Programmable tokens with decay, staking, accrual, governance | ✅ Complete |
| **State Channels** | Off-chain micro-transactions, cooperative/force close | ✅ Complete |
| **Ledger** | Append-only hash chain, Merkle proofs, full audit trail | ✅ Complete |
| **REST API** | FastAPI server exposing all protocol operations over HTTP | ✅ Complete |

## Quick Start

```bash
pip install phenes
```

### Create an agent and sign a contract in 10 lines:

```python
from aeos.identity import AgentIdentity, AgentType, CapabilityScope, AuthorityBounds
from aeos.contracts import ContractFactory

# Create two agents
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

# Create and sign a contract
contract = ContractFactory.service_agreement(
    alice.did, bob.did, "ML inference job", price=25_000_00
)
contract.sign(alice)
contract.sign(bob)
# Contract is now ACTIVE with $25,000 in escrow
```

### Run the API server:

```bash
pip install phenes[server]
phenes-server
# → http://localhost:8420/docs
```

```bash
# Create an agent
curl -X POST http://localhost:8420/agents \
  -H "Content-Type: application/json" \
  -d '{"controller_did": "did:aeos:my-company"}'

# Create a contract
curl -X POST http://localhost:8420/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "template": "service_agreement",
    "client_did": "did:aeos:abc...",
    "provider_did": "did:aeos:def...",
    "description": "GPU compute job",
    "price": 500000
  }'
```

## Run the Full Demo

```bash
git clone https://github.com/tofaelttk/Phanes.git
cd Phanes
pip install -e ".[all]"
python demo.py
```

The demo walks through the complete lifecycle: agent creation → delegation → risk assessment → contract signing → escrow → fulfillment → dispute → resolution → anomaly detection → ledger verification.

## Run Tests

```bash
python tests/test_all.py
```

```
═══ CRYPTO PRIMITIVES ═══
  ✓ KeyPair sign/verify
  ✓ Pedersen commitment binding+hiding
  ✓ Range proof valid
  ✓ Merkle accumulator prove/verify
  ✓ VRF deterministic + verifiable
  ✓ Encrypted envelope round-trip
  ...

═══ THRESHOLD CRYPTO ═══
  ✓ Shamir split + reconstruct
  ✓ Threshold signatures sign+verify
  ✓ Time-lock puzzle solve+verify
  ✓ Multi-party escrow threshold release
  ...

══════════════════════════════════════
  RESULTS: 45 passed, 0 failed
══════════════════════════════════════
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   REST API (FastAPI)                  │
├─────────────────────────────────────────────────────┤
│  Identity  │ Contracts │ Disputes │  Risk  │ Tokens  │
├────────────┼───────────┼──────────┼────────┼─────────┤
│  ML Engine │   Graph Intelligence  │ State Channels   │
├─────────────────────────────────────────────────────┤
│              Threshold Cryptography                   │
├─────────────────────────────────────────────────────┤
│         Cryptographic Primitives (Ed25519)            │
├─────────────────────────────────────────────────────┤
│              Immutable Ledger                         │
└─────────────────────────────────────────────────────┘
```

## Cryptographic Foundations

All cryptography is built on production primitives:

- **Signatures:** Ed25519 (RFC 8032)
- **Commitments:** SHA-256 Pedersen-style with blinding factors
- **Key Derivation:** HKDF-SHA256 for deterministic child keys
- **Encryption:** AES-256-GCM authenticated encryption
- **VRF:** Ed25519-based verifiable random function
- **Merkle Trees:** SHA-256 with domain separation (leaf vs. internal)
- **Secret Sharing:** Shamir over GF(L) with Lagrange interpolation
- **Threshold Sigs:** t-of-n via polynomial evaluation on shares

## Comparison

| Feature | Stripe MPP | Skyfire KYA | Google AP2 | **AEOS** |
|---|---|---|---|---|
| Agent payments | ✅ | ✅ | ✅ | ✅ |
| Agent identity | ❌ | ✅ | Partial | ✅ |
| Binding contracts | ❌ | ❌ | ❌ | ✅ |
| Escrow + milestones | ❌ | ❌ | ❌ | ✅ |
| Dispute resolution | ❌ | ❌ | ❌ | ✅ |
| Risk engine | ❌ | ❌ | ❌ | ✅ |
| Anomaly detection | ❌ | ❌ | ❌ | ✅ |
| Threshold crypto | ❌ | ❌ | ❌ | ✅ |
| State channels | ❌ | ❌ | ❌ | ✅ |
| Graph intelligence | ❌ | ❌ | ❌ | ✅ |
| Tokenized authority | ❌ | ❌ | ❌ | ✅ |
| Immutable audit | ❌ | Partial | Partial | ✅ |

## Roadmap

- [x] Core protocol (12 modules, 6,000+ lines)
- [x] REST API server
- [x] Technical whitepaper
- [x] 45-test suite
- [ ] TypeScript/Node SDK
- [ ] MCP server (for Claude/GPT native integration)
- [ ] Settlement hooks (Stripe MPP, USDC on Tempo)
- [ ] Production Bulletproofs (Rust FFI)
- [ ] Distributed ledger (BFT consensus)
- [ ] Formal security audit

## License

Apache 2.0

## Links

- **Website:** [phenes.app](https://phenes.app)
- **Whitepaper:** [AEOS_Whitepaper_v0.1.pdf](./AEOS_Whitepaper_v0.1.pdf)
- **API Docs:** Run `phenes-server` → http://localhost:8420/docs
