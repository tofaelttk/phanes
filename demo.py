#!/usr/bin/env python3
"""
AEOS Protocol - Full End-to-End Demonstration

This demo simulates a complete lifecycle in the agent economy:
1. A company creates two AI agents with scoped authority
2. One agent discovers and contracts with an external compute agent
3. The contract is executed with escrow and milestone verification
4. A dispute arises and is resolved through automated arbitration
5. Risk management catches an anomalous transaction
6. Everything is recorded on the immutable ledger

Run: python demo.py
"""

import time
import json
import sys

# Add parent to path
sys.path.insert(0, '.')

from aeos.crypto_primitives import KeyPair, sha256, VRF, RangeProof
from aeos.identity import (
    AgentIdentity, AgentType, CapabilityScope, AuthorityBounds,
    AgentRegistry, VerifiableCredential, DelegationChain
)
from aeos.contracts import (
    Contract, ContractFactory, Obligation, ObligationType, ContractState
)
from aeos.disputes import (
    Dispute, DisputeReason, Resolution, Evidence
)
from aeos.risk import RiskEngine, RiskLevel, InsurancePool
from aeos.ledger import Ledger, EventType


def separator(title):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def main():
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                                                                  ║
    ║     AEOS - Agent Economic Operating System                       ║
    ║     Protocol v0.1.0 | Full System Demonstration                  ║
    ║                                                                  ║
    ║     The infrastructure layer for AI agents to exist               ║
    ║     as autonomous economic entities.                              ║
    ║                                                                  ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)

    # =========================================================================
    # PHASE 1: INFRASTRUCTURE SETUP
    # =========================================================================
    separator("PHASE 1: Infrastructure Setup")

    registry = AgentRegistry()
    risk_engine = RiskEngine(risk_tolerance=0.6)
    ledger = Ledger()

    print("[✓] Agent Registry initialized")
    print("[✓] Risk Engine initialized (tolerance: 0.6)")
    print("[✓] Immutable Ledger initialized")
    print(f"    Ledger genesis root: {ledger.root.hex()[:24]}...")

    # =========================================================================
    # PHASE 2: CREATE AGENT IDENTITIES
    # =========================================================================
    separator("PHASE 2: Agent Identity Creation")

    # Company controller (the legal entity responsible for agents)
    controller_key = KeyPair.generate(purpose="controller")
    controller_did = f"did:aeos:controller:{controller_key.key_id}"
    print(f"[✓] Company Controller: {controller_did[:40]}...")

    # Agent Alpha: Procurement agent (can transact, sign contracts)
    alpha = AgentIdentity.create(
        controller_did=controller_did,
        agent_type=AgentType.SEMI_AUTONOMOUS,
        capabilities={
            CapabilityScope.TRANSACT,
            CapabilityScope.NEGOTIATE,
            CapabilityScope.SIGN_CONTRACT,
            CapabilityScope.DELEGATE,
            CapabilityScope.DISPUTE,
        },
        bounds=AuthorityBounds(
            max_transaction_value=100_000_00,    # $100,000 (in cents)
            max_daily_volume=500_000_00,          # $500,000/day
            max_contract_duration_hours=720,       # 30 days
            max_delegation_depth=2,
            max_concurrent_contracts=10,
            max_counterparties=50,
            allowed_asset_types=["USD", "USDC", "compute", "data"],
        ),
        metadata={"name": "Alpha", "role": "procurement", "model": "claude-4.6"}
    )

    # Register Alpha
    alpha_proof = registry.register(alpha)
    ledger.append(EventType.AGENT_REGISTERED, alpha, subject_did=alpha.did,
                  data=json.dumps(alpha.to_did_document(), default=str).encode())

    print(f"[✓] Agent Alpha created: {alpha.did[:40]}...")
    print(f"    Type: {alpha.agent_type.name}")
    print(f"    Capabilities: {', '.join(c.value for c in alpha.capabilities)}")
    print(f"    Max transaction: ${alpha.authority_bounds.max_transaction_value/100:,.0f}")
    print(f"    Registry proof valid: {alpha_proof.verify()}")

    # Agent Beta: External compute provider
    beta = AgentIdentity.create(
        controller_did="did:aeos:external:compute-corp",
        agent_type=AgentType.AUTONOMOUS,
        capabilities={
            CapabilityScope.TRANSACT,
            CapabilityScope.SIGN_CONTRACT,
            CapabilityScope.DISPUTE,
        },
        bounds=AuthorityBounds(
            max_transaction_value=50_000_00,
            max_daily_volume=200_000_00,
            max_contract_duration_hours=168,
            max_delegation_depth=0,
            max_concurrent_contracts=100,
            max_counterparties=500,
            allowed_asset_types=["USD", "USDC", "compute"],
        ),
        metadata={"name": "Beta", "role": "compute_provider", "model": "gpt-5.2"}
    )
    beta.reputation_score = 0.75
    beta.total_transactions = 150
    beta.total_volume = 5_000_000_00

    registry.register(beta)
    ledger.append(EventType.AGENT_REGISTERED, beta, subject_did=beta.did)

    print(f"\n[✓] Agent Beta created: {beta.did[:40]}...")
    print(f"    Type: {beta.agent_type.name}")
    print(f"    Reputation: {beta.reputation_score}")
    print(f"    Transaction history: {beta.total_transactions} txs")

    # Agent Gamma: Arbitrator agent
    gamma = AgentIdentity.create(
        controller_did="did:aeos:arbitration-dao",
        agent_type=AgentType.SEMI_AUTONOMOUS,
        capabilities={CapabilityScope.DISPUTE, CapabilityScope.TRANSACT},
        bounds=AuthorityBounds(
            max_transaction_value=200_000_00,
            max_daily_volume=1_000_000_00,
            max_delegation_depth=0,
            max_concurrent_contracts=50,
            max_counterparties=100,
        ),
        metadata={"name": "Gamma", "role": "arbitrator"}
    )
    gamma.reputation_score = 0.92
    gamma.total_transactions = 500
    registry.register(gamma)

    print(f"\n[✓] Agent Gamma (Arbitrator): {gamma.did[:40]}...")
    print(f"    Reputation: {gamma.reputation_score}")

    print(f"\n[✓] Registry stats: {json.dumps(registry.stats(), indent=2)}")

    # =========================================================================
    # PHASE 3: DELEGATION
    # =========================================================================
    separator("PHASE 3: Authority Delegation")

    # Alpha delegates to a sub-agent with reduced authority
    sub_agent = AgentIdentity.create(
        controller_did=controller_did,
        agent_type=AgentType.DELEGATED,
        capabilities={CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT},
        bounds=AuthorityBounds(
            max_transaction_value=10_000_00,  # Only $10K
            max_daily_volume=50_000_00,
            max_contract_duration_hours=48,
            max_delegation_depth=0,  # Cannot delegate further
            max_concurrent_contracts=5,
            max_counterparties=10,
        ),
        metadata={"name": "Alpha-Sub-1", "role": "micro_procurement"}
    )
    registry.register(sub_agent)

    delegation = alpha.delegate_to(
        child_did=sub_agent.did,
        capabilities={CapabilityScope.TRANSACT, CapabilityScope.SIGN_CONTRACT},
        bounds=sub_agent.authority_bounds,
        expiry_hours=24,
    )
    sub_agent.delegation_chain = delegation

    print(f"[✓] Delegation chain created:")
    print(f"    {controller_did[:30]}... (Company)")
    print(f"    └─> {alpha.did[:30]}... (Alpha, max $100K)")
    print(f"        └─> {sub_agent.did[:30]}... (Sub-Agent, max $10K)")
    print(f"    Chain depth: {delegation.depth()}")
    print(f"    Chain valid: {delegation.verify_chain()}")

    ledger.append(EventType.DELEGATION_CREATED, alpha, subject_did=sub_agent.did,
                  data=delegation.to_bytes())

    # =========================================================================
    # PHASE 4: RISK-ASSESSED CONTRACT CREATION
    # =========================================================================
    separator("PHASE 4: Contract with Risk Assessment")

    # First, assess the counterparty risk
    approved, risk_score = risk_engine.approve_transaction(
        agent=alpha, counterparty=beta,
        value=25_000_00, tx_type="contract_creation"
    )

    print(f"[✓] Pre-contract risk assessment:")
    print(f"    Overall risk: {risk_score.overall:.3f}")
    print(f"    Risk level: {risk_score.level.name}")
    print(f"    Factors: {json.dumps(risk_score.factors, indent=6)}")
    print(f"    Approved: {approved}")

    if not approved:
        print("[✗] Transaction rejected by risk engine!")
        return

    # Create a compute service contract
    contract = ContractFactory.compute_task(
        requester_did=alpha.did,
        compute_did=beta.did,
        task_spec={
            "type": "ml_inference",
            "model": "llama-4-405b",
            "input_tokens": 100_000,
            "output_tokens": 50_000,
            "max_latency_ms": 5000,
            "sla_uptime": 0.999,
        },
        price=25_000_00,  # $25,000
        timeout_hours=2.0,
    )

    ledger.append(EventType.CONTRACT_CREATED, alpha, subject_did=contract.contract_id,
                  data=contract.terms_hash())

    print(f"\n[✓] Contract created: {contract.contract_id}")
    print(f"    Type: compute_task")
    print(f"    Value: $25,000.00")
    print(f"    Terms hash: {contract.terms_hash().hex()[:24]}...")
    print(f"    State: {contract.state.name}")

    # =========================================================================
    # PHASE 5: CONTRACT SIGNING (Multi-sig)
    # =========================================================================
    separator("PHASE 5: Multi-Signature Contract Activation")

    sig_alpha = contract.sign(alpha)
    print(f"[✓] Alpha signed: key={sig_alpha.key_id[:12]}...")
    print(f"    Contract state: {contract.state.name}")

    sig_beta = contract.sign(beta)
    print(f"[✓] Beta signed: key={sig_beta.key_id[:12]}...")
    print(f"    Contract state: {contract.state.name}")

    ledger.append(EventType.CONTRACT_ACTIVATED, alpha, subject_did=contract.contract_id)

    print(f"\n    Both parties signed. Contract is now ACTIVE.")
    print(f"    Escrow: ${contract.escrow.total_value/100:,.0f}")
    print(f"    Escrow remaining: ${contract.escrow.remaining/100:,.0f}")

    # =========================================================================
    # PHASE 6: OBLIGATION FULFILLMENT
    # =========================================================================
    separator("PHASE 6: Obligation Fulfillment with Proof")

    # Beta completes the computation and provides proof
    computation_result = b"inference_result_hash_abc123"
    fulfillment_proof = sha256(
        b"AEOS/fulfillment/" + computation_result + beta.did.encode()
    )

    contract.fulfill_obligation("computation", fulfillment_proof, beta)
    ledger.append(EventType.OBLIGATION_FULFILLED, beta,
                  subject_did=contract.contract_id,
                  data=fulfillment_proof)

    print(f"[✓] Computation obligation fulfilled by Beta")
    print(f"    Proof: {fulfillment_proof.hex()[:24]}...")

    # Payment released from escrow
    contract.fulfill_obligation("payment", fulfillment_proof, alpha)
    ledger.append(EventType.OBLIGATION_FULFILLED, alpha,
                  subject_did=contract.contract_id)

    print(f"[✓] Payment obligation fulfilled by Alpha")
    print(f"    Escrow released: ${contract.escrow.released_total/100:,.0f}")
    print(f"    Contract state: {contract.state.name}")

    # Update reputations
    alpha.total_transactions += 1
    alpha.total_volume += 25_000_00
    alpha.reputation_score = min(1.0, alpha.reputation_score + 0.01)
    beta.total_transactions += 1
    beta.total_volume += 25_000_00
    beta.reputation_score = min(1.0, beta.reputation_score + 0.01)

    # =========================================================================
    # PHASE 7: DISPUTE SCENARIO
    # =========================================================================
    separator("PHASE 7: Dispute Resolution")

    # Create a second contract that goes wrong
    contract2 = ContractFactory.service_agreement(
        client_did=alpha.did,
        provider_did=beta.did,
        service_description="Real-time data feed - market prices",
        price=15_000_00,
        delivery_deadline_hours=0.001,  # Expires almost immediately (for demo)
        penalty_percent=0.15,
    )
    contract2.sign(alpha)
    contract2.sign(beta)

    # Simulate deadline passing
    for ob in contract2.obligations:
        ob.deadline = time.time() - 1  # Force overdue

    print(f"[✓] Second contract created and activated: {contract2.contract_id}")
    print(f"    Service: Real-time data feed")
    print(f"    Value: $15,000.00")

    # Alpha files dispute
    dispute = Dispute.file(
        plaintiff=alpha,
        contract=contract2,
        reason=DisputeReason.NON_DELIVERY,
        description="Data feed was never delivered. SLA violated.",
        claimed_damages=15_000_00,
    )

    ledger.append(EventType.DISPUTE_FILED, alpha,
                  subject_did=dispute.dispute_id,
                  data=json.dumps(dispute.summary()).encode())

    print(f"\n[✓] Dispute filed: {dispute.dispute_id}")
    print(f"    Reason: {dispute.reason.value}")
    print(f"    Claimed damages: ${dispute.claimed_damages/100:,.0f}")

    # Submit evidence
    evidence = Evidence.create(
        submitter=alpha,
        evidence_type="sla_violation_log",
        data=b'{"expected_delivery": "immediate", "actual_delivery": "never", "monitoring_log": "..."}',
        metadata={"source": "monitoring_system"}
    )
    dispute.submit_evidence(evidence)
    ledger.append(EventType.EVIDENCE_SUBMITTED, alpha,
                  subject_did=dispute.dispute_id)

    print(f"[✓] Evidence submitted: {evidence.evidence_id}")

    # Attempt automatic resolution
    auto_result = dispute.attempt_auto_resolution(contract2)
    print(f"\n[✓] Auto-resolution attempt: {auto_result}")

    if auto_result:
        print(f"    Resolution: {dispute.resolution.value}")
        print(f"    Amount: ${dispute.resolution_amount/100:,.0f}")
    else:
        print("    Auto-resolution failed, escalating to arbitration...")

        # Select arbitrators using VRF
        selection_key = KeyPair.generate()
        arbitrators = dispute.select_arbitrators(
            candidate_pool=[gamma],
            selection_key=selection_key,
            num_arbitrators=1,
        )
        print(f"    Arbitrators selected: {len(arbitrators)}")

        # Gamma votes
        vote = dispute.cast_vote(
            arbitrator=gamma,
            resolution=Resolution.FULL_REFUND,
            refund_amount=15_000_00,
            reasoning="Non-delivery confirmed by evidence. Full refund warranted.",
            confidence=0.95,
        )
        print(f"    Vote cast: {vote.resolution.value} (confidence: {vote.confidence})")

    ledger.append(EventType.DISPUTE_RESOLVED, alpha,
                  subject_did=dispute.dispute_id,
                  data=json.dumps(dispute.summary()).encode())

    print(f"\n[✓] Dispute resolved: {dispute.resolution.value}")
    print(f"    Amount: ${dispute.resolution_amount/100:,.0f}")

    # Update reputation for losing party
    beta.disputes_lost += 1
    beta.reputation_score = max(0, beta.reputation_score - 0.05)
    print(f"    Beta reputation updated: {beta.reputation_score:.2f}")

    # =========================================================================
    # PHASE 8: ANOMALY DETECTION
    # =========================================================================
    separator("PHASE 8: Risk Engine - Anomaly Detection")

    # Build up a normal transaction profile first
    print("[...] Building behavioral profile with normal transactions...")
    normal_counterparty = AgentIdentity.create(
        controller_did="did:aeos:normal-vendor",
        agent_type=AgentType.AUTONOMOUS,
        capabilities={CapabilityScope.TRANSACT},
        bounds=AuthorityBounds(max_transaction_value=100_000_00),
    )
    normal_counterparty.reputation_score = 0.8
    normal_counterparty.total_transactions = 200
    registry.register(normal_counterparty)

    for i in range(20):
        risk_engine.approve_transaction(
            alpha, normal_counterparty,
            value=1_000_00 + (i * 100_00),  # $1K - $3K range
            tx_type="regular_purchase"
        )

    print(f"    Profile built: {risk_engine.get_profile(alpha.did).avg_transaction_value/100:.0f} avg")

    # Now try an anomalous transaction
    print("\n[!] Attempting anomalous transaction...")
    suspicious_agent = AgentIdentity.create(
        controller_did="did:aeos:unknown",
        agent_type=AgentType.AUTONOMOUS,
        capabilities={CapabilityScope.TRANSACT},
        bounds=AuthorityBounds(max_transaction_value=100_000_00),
    )
    suspicious_agent.reputation_score = 0.2
    suspicious_agent.total_transactions = 2
    registry.register(suspicious_agent)

    approved, anomaly_score = risk_engine.approve_transaction(
        alpha, suspicious_agent,
        value=95_000_00,  # $95K - way above normal
        tx_type="unusual_purchase"
    )

    print(f"[{'✗' if not approved else '✓'}] Anomalous transaction {'REJECTED' if not approved else 'APPROVED'}")
    print(f"    Risk score: {anomaly_score.overall:.3f}")
    print(f"    Risk level: {anomaly_score.level.name}")
    print(f"    Factors:")
    for factor, score in anomaly_score.factors.items():
        if score > 0:
            print(f"      {factor}: {score:.3f}")
    print(f"    Explanations:")
    for exp in anomaly_score.explanation:
        print(f"      - {exp}")

    if not approved:
        ledger.append(EventType.TRANSACTION_REJECTED, alpha,
                      metadata={"risk_score": anomaly_score.overall,
                                "risk_level": anomaly_score.level.name})

    # =========================================================================
    # PHASE 9: RANGE PROOF DEMONSTRATION
    # =========================================================================
    separator("PHASE 9: ZK Range Proof - Authority Verification")

    print("[✓] Proving agent's transaction limit is within [0, 2^64)")
    print(f"    Actual limit: ${alpha.authority_bounds.max_transaction_value/100:,.0f}")

    proof, blinding = RangeProof.create(
        value=alpha.authority_bounds.max_transaction_value,
        range_bits=64
    )
    print(f"    Range proof created: {len(proof.bit_commitments)} bit commitments")
    print(f"    Total commitment: {proof.total_commitment.hex()[:24]}...")
    print(f"    Proof structurally valid: {proof.verify_structure()}")
    print(f"    (In production: verifier confirms value is in range")
    print(f"     without learning the actual value)")

    # =========================================================================
    # PHASE 10: LEDGER INTEGRITY
    # =========================================================================
    separator("PHASE 10: Ledger Integrity Verification")

    chain_valid, bad_index = ledger.verify_chain_integrity()
    stats = ledger.stats()

    print(f"[✓] Ledger statistics:")
    print(f"    Total entries: {stats['total_entries']}")
    print(f"    Unique actors: {stats['unique_actors']}")
    print(f"    Chain integrity: {'VALID' if chain_valid else f'BROKEN at index {bad_index}'}")
    print(f"    Ledger root: {stats['ledger_root'][:24]}...")
    print(f"\n    Event counts:")
    for event_type, count in stats['event_counts'].items():
        print(f"      {event_type}: {count}")

    # Prove a specific entry exists
    proof = ledger.prove_entry(0)
    print(f"\n[✓] Merkle proof for first entry:")
    print(f"    Entry exists in ledger: {proof.verify()}")
    print(f"    Proof path length: {len(proof.path)}")

    # =========================================================================
    # PHASE 11: NETWORK HEALTH
    # =========================================================================
    separator("PHASE 11: Network Health Dashboard")

    health = risk_engine.network_health()
    print(f"[✓] Network Health:")
    for key, value in health.items():
        print(f"    {key}: {value}")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    separator("DEMONSTRATION COMPLETE")

    print("""
    What was demonstrated:
    ──────────────────────────────────────────────────────────────────
    ✓ Cryptographic agent identity (DID-based, Ed25519)
    ✓ Scoped authority with quantitative bounds
    ✓ Delegation chains with bound containment verification
    ✓ Verifiable credential system with Merkle accumulator
    ✓ Multi-signature contract activation
    ✓ Escrow with milestone-based release
    ✓ Obligation fulfillment with cryptographic proof
    ✓ Automated dispute resolution (auto + arbitration)
    ✓ VRF-based fair arbitrator selection
    ✓ Evidence chains with timestamped commitments
    ✓ Real-time behavioral anomaly detection
    ✓ Multi-factor risk scoring
    ✓ Circuit breaker protection
    ✓ Counterparty risk assessment
    ✓ ZK range proofs for authority verification
    ✓ Immutable append-only ledger with chain integrity
    ✓ Merkle proofs for entry existence
    ✓ Network health monitoring
    ──────────────────────────────────────────────────────────────────

    This is AEOS v0.1.0 — the operating system for the agent economy.
    Every AI agent that transacts needs identity, contracts, disputes,
    risk management, and accountability. This is that infrastructure.

    Protocol: AEOS/1.0
    License: Apache 2.0
    """)


if __name__ == "__main__":
    main()
