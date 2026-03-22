"""
AEOS Protocol — REST API Server

Production HTTP interface for the Agent Economic Operating System.
Every protocol operation is exposed as a REST endpoint.

Run:
    uvicorn aeos.server:app --host 0.0.0.0 --port 8420
    # or
    phanes-server

Endpoints:
    POST   /agents                  Create agent identity
    GET    /agents/{did}            Resolve agent
    POST   /agents/{did}/delegate   Delegate authority
    DELETE /agents/{did}            Revoke agent

    POST   /contracts               Create contract
    POST   /contracts/{id}/sign     Sign contract
    POST   /contracts/{id}/fulfill  Fulfill obligation
    GET    /contracts/{id}          Get contract status

    POST   /disputes                File dispute
    POST   /disputes/{id}/evidence  Submit evidence
    POST   /disputes/{id}/resolve   Attempt resolution
    GET    /disputes/{id}           Get dispute status

    POST   /risk/assess             Assess transaction risk
    GET    /risk/health             Network health

    GET    /ledger/stats            Ledger statistics
    GET    /ledger/entry/{idx}      Get entry with Merkle proof

    GET    /health                  Server health check
"""

import time
import json
import os
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

from .crypto_primitives import KeyPair, sha256
from .identity import (
    AgentIdentity, AgentType, CapabilityScope, AuthorityBounds,
    AgentRegistry
)
from .contracts import (
    Contract, ContractFactory, ContractState, Obligation, ObligationType
)
from .disputes import Dispute, DisputeReason, Resolution, Evidence
from .risk import RiskEngine, RiskLevel
from .ledger import Ledger, EventType

if not HAS_FASTAPI:
    raise ImportError(
        "FastAPI not installed. Run: pip install phanes[server]"
    )


# =============================================================================
# REQUEST / RESPONSE MODELS
# =============================================================================

class CreateAgentRequest(BaseModel):
    controller_did: str
    agent_type: str = "autonomous"
    capabilities: List[str] = ["transact", "sign_contract", "dispute"]
    max_transaction_value: int = 100_000_00
    max_daily_volume: int = 500_000_00
    max_contract_duration_hours: int = 720
    max_delegation_depth: int = 2
    max_concurrent_contracts: int = 10
    max_counterparties: int = 50
    metadata: Dict[str, Any] = {}

class DelegateRequest(BaseModel):
    child_did: str
    capabilities: List[str] = ["transact"]
    max_transaction_value: int = 10_000_00
    max_daily_volume: int = 50_000_00
    expiry_hours: float = 24.0

class CreateContractRequest(BaseModel):
    template: str = "service_agreement"
    client_did: str
    provider_did: str
    description: str = ""
    price: int = 0
    delivery_deadline_hours: float = 24.0
    task_spec: Dict[str, Any] = {}

class SignContractRequest(BaseModel):
    signer_did: str

class FulfillRequest(BaseModel):
    obligation_id: str
    fulfiller_did: str
    proof_data: str = ""

class FileDisputeRequest(BaseModel):
    plaintiff_did: str
    contract_id: str
    reason: str = "non_delivery"
    description: str = ""
    claimed_damages: int = 0

class SubmitEvidenceRequest(BaseModel):
    submitter_did: str
    evidence_type: str = "transaction_proof"
    data: str = ""

class RiskAssessRequest(BaseModel):
    agent_did: str
    counterparty_did: str
    value: int
    tx_type: str = "transaction"


# =============================================================================
# GLOBAL STATE (In production: backed by database / distributed ledger)
# =============================================================================

registry = AgentRegistry()
risk_engine = RiskEngine(risk_tolerance=0.6)
ledger = Ledger()
contracts_db: Dict[str, Contract] = {}
disputes_db: Dict[str, Dispute] = {}

AGENT_TYPE_MAP = {
    "autonomous": AgentType.AUTONOMOUS,
    "semi_autonomous": AgentType.SEMI_AUTONOMOUS,
    "delegated": AgentType.DELEGATED,
    "composite": AgentType.COMPOSITE,
}

CAPABILITY_MAP = {c.value: c for c in CapabilityScope}
DISPUTE_REASON_MAP = {r.value: r for r in DisputeReason}


# =============================================================================
# APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[AEOS] Protocol server starting — AEOS/1.0")
    print(f"[AEOS] Registry: {registry.stats()}")
    yield
    print(f"[AEOS] Server shutting down. Ledger entries: {ledger.length}")

app = FastAPI(
    title="AEOS Protocol",
    description="The economic operating system for autonomous AI agents. "
                "Identity, contracts, disputes, risk, and audit — all via REST.",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# HEALTH
# =============================================================================

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "protocol": "AEOS/1.0",
        "version": "0.1.0",
        "agents": len(registry.agents),
        "contracts": len(contracts_db),
        "disputes": len(disputes_db),
        "ledger_entries": ledger.length,
        "uptime": time.time(),
    }


# =============================================================================
# AGENTS
# =============================================================================

@app.post("/agents", status_code=201)
async def create_agent(req: CreateAgentRequest):
    agent_type = AGENT_TYPE_MAP.get(req.agent_type, AgentType.AUTONOMOUS)
    capabilities = set()
    for c in req.capabilities:
        if c in CAPABILITY_MAP:
            capabilities.add(CAPABILITY_MAP[c])

    bounds = AuthorityBounds(
        max_transaction_value=req.max_transaction_value,
        max_daily_volume=req.max_daily_volume,
        max_contract_duration_hours=req.max_contract_duration_hours,
        max_delegation_depth=req.max_delegation_depth,
        max_concurrent_contracts=req.max_concurrent_contracts,
        max_counterparties=req.max_counterparties,
    )

    agent = AgentIdentity.create(
        controller_did=req.controller_did,
        agent_type=agent_type,
        capabilities=capabilities,
        bounds=bounds,
        metadata=req.metadata,
    )

    proof = registry.register(agent)
    ledger.append(EventType.AGENT_REGISTERED, agent, subject_did=agent.did)

    return {
        "did": agent.did,
        "controller": agent.controller_did,
        "type": agent.agent_type.name,
        "capabilities": [c.value for c in agent.capabilities],
        "registry_proof_valid": proof.verify(),
        "registry_root": registry.registry_root.hex()[:24],
        "created_at": agent.created_at,
    }


@app.get("/agents/{did}")
async def get_agent(did: str):
    agent = registry.resolve(did)
    if not agent:
        raise HTTPException(404, f"Agent {did} not found")
    return agent.to_did_document()


@app.post("/agents/{did}/delegate")
async def delegate_authority(did: str, req: DelegateRequest):
    agent = registry.resolve(did)
    if not agent:
        raise HTTPException(404, f"Agent {did} not found")

    capabilities = set()
    for c in req.capabilities:
        if c in CAPABILITY_MAP:
            capabilities.add(CAPABILITY_MAP[c])

    bounds = AuthorityBounds(
        max_transaction_value=req.max_transaction_value,
        max_daily_volume=req.max_daily_volume,
    )

    try:
        chain = agent.delegate_to(req.child_did, capabilities, bounds, req.expiry_hours)
        ledger.append(EventType.DELEGATION_CREATED, agent, subject_did=req.child_did)
        return {
            "delegator": did,
            "delegate": req.child_did,
            "chain_depth": chain.depth(),
            "chain_valid": chain.verify_chain(),
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.delete("/agents/{did}")
async def revoke_agent(did: str):
    agent = registry.resolve(did)
    if not agent:
        raise HTTPException(404, f"Agent {did} not found")
    registry.revoke(did, b"api_revocation")
    ledger.append(EventType.AGENT_REVOKED, agent, subject_did=did)
    return {"did": did, "revoked": True}


# =============================================================================
# CONTRACTS
# =============================================================================

@app.post("/contracts", status_code=201)
async def create_contract(req: CreateContractRequest):
    client = registry.resolve(req.client_did)
    provider = registry.resolve(req.provider_did)
    if not client:
        raise HTTPException(404, f"Client agent {req.client_did} not found")
    if not provider:
        raise HTTPException(404, f"Provider agent {req.provider_did} not found")

    if req.template == "service_agreement":
        contract = ContractFactory.service_agreement(
            req.client_did, req.provider_did,
            req.description, req.price,
            req.delivery_deadline_hours,
        )
    elif req.template == "data_exchange":
        contract = ContractFactory.data_exchange(
            req.client_did, req.provider_did,
            req.description, req.price,
            req.task_spec.get("data_hash", ""),
        )
    elif req.template == "compute_task":
        contract = ContractFactory.compute_task(
            req.client_did, req.provider_did,
            req.task_spec, req.price,
            req.delivery_deadline_hours,
        )
    else:
        raise HTTPException(400, f"Unknown template: {req.template}")

    contracts_db[contract.contract_id] = contract
    ledger.append(EventType.CONTRACT_CREATED, client, subject_did=contract.contract_id)

    return contract.summary()


@app.post("/contracts/{contract_id}/sign")
async def sign_contract(contract_id: str, req: SignContractRequest):
    contract = contracts_db.get(contract_id)
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found")

    agent = registry.resolve(req.signer_did)
    if not agent:
        raise HTTPException(404, f"Agent {req.signer_did} not found")

    try:
        sig = contract.sign(agent)
        if contract.state == ContractState.ACTIVE:
            ledger.append(EventType.CONTRACT_ACTIVATED, agent, subject_did=contract_id)
        return {
            "contract_id": contract_id,
            "signer": req.signer_did,
            "state": contract.state.name,
            "signatures": len(contract.signatures),
        }
    except (ValueError, PermissionError) as e:
        raise HTTPException(400, str(e))


@app.post("/contracts/{contract_id}/fulfill")
async def fulfill_obligation(contract_id: str, req: FulfillRequest):
    contract = contracts_db.get(contract_id)
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found")

    agent = registry.resolve(req.fulfiller_did)
    if not agent:
        raise HTTPException(404, f"Agent {req.fulfiller_did} not found")

    proof = sha256(f"AEOS/fulfillment/{req.proof_data}".encode())

    try:
        result = contract.fulfill_obligation(req.obligation_id, proof, agent)
        if result:
            ledger.append(EventType.OBLIGATION_FULFILLED, agent, subject_did=contract_id)
        return {
            "contract_id": contract_id,
            "obligation_id": req.obligation_id,
            "fulfilled": result,
            "contract_state": contract.state.name,
            "escrow_released": contract.escrow.released_total if contract.escrow else 0,
        }
    except PermissionError as e:
        raise HTTPException(403, str(e))


@app.get("/contracts/{contract_id}")
async def get_contract(contract_id: str):
    contract = contracts_db.get(contract_id)
    if not contract:
        raise HTTPException(404, f"Contract {contract_id} not found")
    return contract.summary()


# =============================================================================
# DISPUTES
# =============================================================================

@app.post("/disputes", status_code=201)
async def file_dispute(req: FileDisputeRequest):
    plaintiff = registry.resolve(req.plaintiff_did)
    if not plaintiff:
        raise HTTPException(404, f"Agent {req.plaintiff_did} not found")

    contract = contracts_db.get(req.contract_id)
    if not contract:
        raise HTTPException(404, f"Contract {req.contract_id} not found")

    reason = DISPUTE_REASON_MAP.get(req.reason, DisputeReason.NON_DELIVERY)

    try:
        dispute = Dispute.file(plaintiff, contract, reason, req.description, req.claimed_damages)
        disputes_db[dispute.dispute_id] = dispute
        ledger.append(EventType.DISPUTE_FILED, plaintiff, subject_did=dispute.dispute_id)
        return dispute.summary()
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/disputes/{dispute_id}/evidence")
async def submit_evidence(dispute_id: str, req: SubmitEvidenceRequest):
    dispute = disputes_db.get(dispute_id)
    if not dispute:
        raise HTTPException(404, f"Dispute {dispute_id} not found")

    agent = registry.resolve(req.submitter_did)
    if not agent:
        raise HTTPException(404, f"Agent {req.submitter_did} not found")

    try:
        evidence = Evidence.create(agent, req.evidence_type, req.data.encode())
        idx = dispute.submit_evidence(evidence)
        ledger.append(EventType.EVIDENCE_SUBMITTED, agent, subject_did=dispute_id)
        return {
            "dispute_id": dispute_id,
            "evidence_id": evidence.evidence_id,
            "evidence_index": idx,
            "total_evidence": len(dispute.evidence_chain),
        }
    except PermissionError as e:
        raise HTTPException(403, str(e))


@app.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str):
    dispute = disputes_db.get(dispute_id)
    if not dispute:
        raise HTTPException(404, f"Dispute {dispute_id} not found")

    contract = contracts_db.get(dispute.contract_id)
    if not contract:
        raise HTTPException(404, f"Contract {dispute.contract_id} not found")

    result = dispute.attempt_auto_resolution(contract)
    if result:
        ledger.append(
            EventType.DISPUTE_RESOLVED, 
            registry.resolve(dispute.plaintiff_did),
            subject_did=dispute_id,
        )
    return dispute.summary()


@app.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str):
    dispute = disputes_db.get(dispute_id)
    if not dispute:
        raise HTTPException(404, f"Dispute {dispute_id} not found")
    return dispute.summary()


# =============================================================================
# RISK
# =============================================================================

@app.post("/risk/assess")
async def assess_risk(req: RiskAssessRequest):
    agent = registry.resolve(req.agent_did)
    counterparty = registry.resolve(req.counterparty_did)
    if not agent:
        raise HTTPException(404, f"Agent {req.agent_did} not found")
    if not counterparty:
        raise HTTPException(404, f"Counterparty {req.counterparty_did} not found")

    approved, score = risk_engine.approve_transaction(
        agent, counterparty, req.value, req.tx_type
    )

    return {
        "approved": approved,
        "risk_score": score.overall,
        "risk_level": score.level.name,
        "factors": score.factors,
        "explanations": score.explanation,
    }


@app.get("/risk/health")
async def risk_health():
    return risk_engine.network_health()


# =============================================================================
# LEDGER
# =============================================================================

@app.get("/ledger/stats")
async def ledger_stats():
    return ledger.stats()


@app.get("/ledger/entry/{index}")
async def get_ledger_entry(index: int):
    if index >= ledger.length:
        raise HTTPException(404, f"Entry {index} not found")

    entry = ledger.entries[index]
    proof = ledger.prove_entry(index)

    return {
        "entry_id": entry.entry_id,
        "sequence": entry.sequence,
        "event_type": entry.event_type.value,
        "timestamp": entry.timestamp,
        "actor": entry.actor_did,
        "subject": entry.subject_did,
        "data_hash": entry.data_hash.hex(),
        "proof_valid": proof.verify(),
        "proof_path_length": len(proof.path),
    }


# =============================================================================
# ENTRYPOINT
# =============================================================================

def main():
    import uvicorn
    port = int(os.environ.get("PORT", 8420))
    print(f"[AEOS] Starting server on port {port}")
    print(f"[AEOS] Docs: http://localhost:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
