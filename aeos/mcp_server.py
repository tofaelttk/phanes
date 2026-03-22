"""
AEOS Protocol — MCP Server

Model Context Protocol server that exposes the full AEOS protocol
to AI agents (Claude, GPT, etc.) as native tools.

When an AI agent connects to this MCP server, it can:
  - Create and manage agent identities
  - Sign and execute contracts with escrow
  - File and resolve disputes
  - Assess transaction risk
  - Query the immutable ledger
  - Settle payments via Stripe

This is the killer integration — AI agents discover and use AEOS natively.

Run:
    python -m aeos.mcp_server
    # or
    phanes-mcp

Protocol: MCP (Model Context Protocol) over stdio
"""

import json
import sys
import time
import os
from typing import Any, Dict, Optional

from .crypto_primitives import sha256, KeyPair
from .identity import (
    AgentIdentity, AgentType, CapabilityScope, AuthorityBounds,
    AgentRegistry
)
from .contracts import (
    Contract, ContractFactory, ContractState
)
from .disputes import Dispute, DisputeReason, Resolution, Evidence
from .risk import RiskEngine
from .ledger import Ledger, EventType

# =============================================================================
# GLOBAL STATE
# =============================================================================

_registry = AgentRegistry()
_risk_engine = RiskEngine(risk_tolerance=0.6)
_ledger = Ledger()
_contracts: Dict[str, Contract] = {}
_disputes: Dict[str, Dispute] = {}
_settlement_engine = None

AGENT_TYPE_MAP = {
    "autonomous": AgentType.AUTONOMOUS,
    "semi_autonomous": AgentType.SEMI_AUTONOMOUS,
    "delegated": AgentType.DELEGATED,
}

CAPABILITY_MAP = {c.value: c for c in CapabilityScope}
REASON_MAP = {r.value: r for r in DisputeReason}

# =============================================================================
# TOOL DEFINITIONS (MCP Schema)
# =============================================================================

TOOLS = [
    {
        "name": "aeos_create_agent",
        "description": "Create a new AI agent identity with cryptographic DID, scoped capabilities, and quantitative authority bounds. Returns the agent's DID and registration proof.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "controller_did": {
                    "type": "string",
                    "description": "DID of the legal entity responsible for this agent"
                },
                "agent_type": {
                    "type": "string",
                    "enum": ["autonomous", "semi_autonomous", "delegated"],
                    "description": "Level of autonomy"
                },
                "capabilities": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Capabilities: transact, sign_contract, dispute, negotiate, delegate"
                },
                "max_transaction_value": {
                    "type": "integer",
                    "description": "Maximum single transaction in cents"
                },
                "max_daily_volume": {
                    "type": "integer",
                    "description": "Maximum daily volume in cents"
                },
                "name": {
                    "type": "string",
                    "description": "Human-readable name for the agent"
                }
            },
            "required": ["controller_did"]
        }
    },
    {
        "name": "aeos_get_agent",
        "description": "Resolve an agent identity by DID. Returns the W3C DID Document with capabilities, reputation, and transaction history.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "did": {"type": "string", "description": "Agent DID to resolve"}
            },
            "required": ["did"]
        }
    },
    {
        "name": "aeos_create_contract",
        "description": "Create a binding contract between two AI agents with escrow, obligations, and penalty clauses. Templates: service_agreement, compute_task, data_exchange.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "template": {
                    "type": "string",
                    "enum": ["service_agreement", "compute_task", "data_exchange"],
                    "description": "Contract template"
                },
                "client_did": {"type": "string", "description": "DID of the client (payer)"},
                "provider_did": {"type": "string", "description": "DID of the provider"},
                "description": {"type": "string", "description": "Service description"},
                "price": {"type": "integer", "description": "Price in cents"},
                "deadline_hours": {"type": "number", "description": "Delivery deadline in hours"}
            },
            "required": ["template", "client_did", "provider_did", "price"]
        }
    },
    {
        "name": "aeos_sign_contract",
        "description": "Sign a contract as a party. When all parties have signed, the contract becomes ACTIVE and escrow is locked.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contract_id": {"type": "string", "description": "Contract ID"},
                "signer_did": {"type": "string", "description": "DID of the signing agent"}
            },
            "required": ["contract_id", "signer_did"]
        }
    },
    {
        "name": "aeos_fulfill_obligation",
        "description": "Mark a contract obligation as fulfilled with proof. Triggers escrow release for the corresponding milestone.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contract_id": {"type": "string", "description": "Contract ID"},
                "obligation_id": {"type": "string", "description": "Obligation ID (e.g., 'delivery', 'payment', 'computation')"},
                "fulfiller_did": {"type": "string", "description": "DID of the fulfilling agent"},
                "proof": {"type": "string", "description": "Proof of fulfillment (hash, receipt, etc.)"}
            },
            "required": ["contract_id", "obligation_id", "fulfiller_did"]
        }
    },
    {
        "name": "aeos_get_contract",
        "description": "Get the current status of a contract including obligations, escrow, and signatures.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "contract_id": {"type": "string", "description": "Contract ID"}
            },
            "required": ["contract_id"]
        }
    },
    {
        "name": "aeos_file_dispute",
        "description": "File a dispute against a contract when obligations are breached. Initiates the 3-tier resolution process (auto → arbitration → appeal).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "plaintiff_did": {"type": "string", "description": "DID of the filing agent"},
                "contract_id": {"type": "string", "description": "Contract ID"},
                "reason": {
                    "type": "string",
                    "enum": ["non_delivery", "quality_mismatch", "late_delivery", "payment_failure", "unauthorized_action", "fraud"],
                    "description": "Dispute reason"
                },
                "description": {"type": "string", "description": "Detailed description"},
                "claimed_damages": {"type": "integer", "description": "Claimed damages in cents"}
            },
            "required": ["plaintiff_did", "contract_id", "reason", "claimed_damages"]
        }
    },
    {
        "name": "aeos_resolve_dispute",
        "description": "Attempt to resolve a dispute. Auto-resolution handles clear breaches. Complex cases escalate to arbitration.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "dispute_id": {"type": "string", "description": "Dispute ID"}
            },
            "required": ["dispute_id"]
        }
    },
    {
        "name": "aeos_assess_risk",
        "description": "Assess the risk of a transaction between two agents. Returns multi-factor risk score, behavioral anomaly analysis, and counterparty assessment.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "agent_did": {"type": "string", "description": "DID of the transacting agent"},
                "counterparty_did": {"type": "string", "description": "DID of the counterparty"},
                "value": {"type": "integer", "description": "Transaction value in cents"},
                "tx_type": {"type": "string", "description": "Transaction type"}
            },
            "required": ["agent_did", "counterparty_did", "value"]
        }
    },
    {
        "name": "aeos_ledger_stats",
        "description": "Get immutable ledger statistics: total entries, unique actors, event counts, and chain integrity status.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        }
    },
    {
        "name": "aeos_network_health",
        "description": "Get network-wide health metrics: active agents, circuit breakers, transaction volume, and average risk scores.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        }
    },
]

# =============================================================================
# TOOL IMPLEMENTATIONS
# =============================================================================

def handle_tool(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """Execute an MCP tool call and return the result."""

    if name == "aeos_create_agent":
        agent_type = AGENT_TYPE_MAP.get(arguments.get("agent_type", "autonomous"), AgentType.AUTONOMOUS)
        caps = set()
        for c in arguments.get("capabilities", ["transact", "sign_contract", "dispute"]):
            if c in CAPABILITY_MAP:
                caps.add(CAPABILITY_MAP[c])

        bounds = AuthorityBounds(
            max_transaction_value=arguments.get("max_transaction_value", 100_000_00),
            max_daily_volume=arguments.get("max_daily_volume", 500_000_00),
            max_contract_duration_hours=720,
            max_delegation_depth=2,
            max_concurrent_contracts=10,
            max_counterparties=50,
        )

        agent = AgentIdentity.create(
            controller_did=arguments["controller_did"],
            agent_type=agent_type,
            capabilities=caps,
            bounds=bounds,
            metadata={"name": arguments.get("name", "unnamed")},
        )
        proof = _registry.register(agent)
        _ledger.append(EventType.AGENT_REGISTERED, agent, subject_did=agent.did)

        return {
            "did": agent.did,
            "type": agent.agent_type.name,
            "capabilities": [c.value for c in agent.capabilities],
            "max_transaction": f"${bounds.max_transaction_value/100:,.0f}",
            "registry_proof_valid": proof.verify(),
        }

    elif name == "aeos_get_agent":
        agent = _registry.resolve(arguments["did"])
        if not agent:
            return {"error": f"Agent {arguments['did']} not found"}
        return agent.to_did_document()

    elif name == "aeos_create_contract":
        client = _registry.resolve(arguments["client_did"])
        provider = _registry.resolve(arguments["provider_did"])
        if not client:
            return {"error": f"Client {arguments['client_did']} not found"}
        if not provider:
            return {"error": f"Provider {arguments['provider_did']} not found"}

        template = arguments.get("template", "service_agreement")
        if template == "service_agreement":
            contract = ContractFactory.service_agreement(
                arguments["client_did"], arguments["provider_did"],
                arguments.get("description", ""), arguments["price"],
                arguments.get("deadline_hours", 24),
            )
        elif template == "compute_task":
            contract = ContractFactory.compute_task(
                arguments["client_did"], arguments["provider_did"],
                arguments.get("task_spec", {}), arguments["price"],
                arguments.get("deadline_hours", 1),
            )
        else:
            contract = ContractFactory.service_agreement(
                arguments["client_did"], arguments["provider_did"],
                arguments.get("description", ""), arguments["price"],
            )

        _contracts[contract.contract_id] = contract
        _ledger.append(EventType.CONTRACT_CREATED, client, subject_did=contract.contract_id)
        return contract.summary()

    elif name == "aeos_sign_contract":
        contract = _contracts.get(arguments["contract_id"])
        if not contract:
            return {"error": f"Contract {arguments['contract_id']} not found"}
        agent = _registry.resolve(arguments["signer_did"])
        if not agent:
            return {"error": f"Agent {arguments['signer_did']} not found"}
        try:
            contract.sign(agent)
            if contract.state == ContractState.ACTIVE:
                _ledger.append(EventType.CONTRACT_ACTIVATED, agent, subject_did=contract.contract_id)
            return {"contract_id": contract.contract_id, "state": contract.state.name, "signatures": len(contract.signatures)}
        except Exception as e:
            return {"error": str(e)}

    elif name == "aeos_fulfill_obligation":
        contract = _contracts.get(arguments["contract_id"])
        if not contract:
            return {"error": f"Contract {arguments['contract_id']} not found"}
        agent = _registry.resolve(arguments["fulfiller_did"])
        if not agent:
            return {"error": f"Agent {arguments['fulfiller_did']} not found"}
        proof = sha256(f"AEOS/fulfillment/{arguments.get('proof', '')}".encode())
        try:
            result = contract.fulfill_obligation(arguments["obligation_id"], proof, agent)
            if result:
                _ledger.append(EventType.OBLIGATION_FULFILLED, agent, subject_did=contract.contract_id)
            return {
                "fulfilled": result,
                "contract_state": contract.state.name,
                "escrow_released": contract.escrow.released_total if contract.escrow else 0,
            }
        except Exception as e:
            return {"error": str(e)}

    elif name == "aeos_get_contract":
        contract = _contracts.get(arguments["contract_id"])
        if not contract:
            return {"error": f"Contract {arguments['contract_id']} not found"}
        return contract.summary()

    elif name == "aeos_file_dispute":
        plaintiff = _registry.resolve(arguments["plaintiff_did"])
        if not plaintiff:
            return {"error": f"Agent {arguments['plaintiff_did']} not found"}
        contract = _contracts.get(arguments["contract_id"])
        if not contract:
            return {"error": f"Contract {arguments['contract_id']} not found"}
        reason = REASON_MAP.get(arguments.get("reason", "non_delivery"), DisputeReason.NON_DELIVERY)
        try:
            dispute = Dispute.file(plaintiff, contract, reason, arguments.get("description", ""), arguments["claimed_damages"])
            _disputes[dispute.dispute_id] = dispute
            _ledger.append(EventType.DISPUTE_FILED, plaintiff, subject_did=dispute.dispute_id)
            return dispute.summary()
        except Exception as e:
            return {"error": str(e)}

    elif name == "aeos_resolve_dispute":
        dispute = _disputes.get(arguments["dispute_id"])
        if not dispute:
            return {"error": f"Dispute {arguments['dispute_id']} not found"}
        contract = _contracts.get(dispute.contract_id)
        if not contract:
            return {"error": f"Contract {dispute.contract_id} not found"}
        dispute.attempt_auto_resolution(contract)
        return dispute.summary()

    elif name == "aeos_assess_risk":
        agent = _registry.resolve(arguments["agent_did"])
        cp = _registry.resolve(arguments["counterparty_did"])
        if not agent:
            return {"error": f"Agent {arguments['agent_did']} not found"}
        if not cp:
            return {"error": f"Counterparty {arguments['counterparty_did']} not found"}
        approved, score = _risk_engine.approve_transaction(
            agent, cp, arguments["value"], arguments.get("tx_type", "transaction")
        )
        return {
            "approved": approved,
            "risk_score": round(score.overall, 4),
            "risk_level": score.level.name,
            "factors": {k: round(v, 4) for k, v in score.factors.items() if v > 0},
            "explanations": score.explanation,
        }

    elif name == "aeos_ledger_stats":
        return _ledger.stats()

    elif name == "aeos_network_health":
        return _risk_engine.network_health()

    else:
        return {"error": f"Unknown tool: {name}"}


# =============================================================================
# MCP PROTOCOL (JSON-RPC over stdio)
# =============================================================================

def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """Handle a single MCP JSON-RPC request."""
    method = request.get("method", "")
    req_id = request.get("id")
    params = request.get("params", {})

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {"listChanged": False},
                },
                "serverInfo": {
                    "name": "aeos-protocol",
                    "version": "0.1.0",
                    "description": "AEOS — The economic operating system for AI agents",
                },
            },
        }

    elif method == "notifications/initialized":
        return None  # No response needed for notifications

    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": TOOLS},
        }

    elif method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})
        try:
            result = handle_tool(tool_name, tool_args)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result, indent=2, default=str),
                        }
                    ]
                },
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [{"type": "text", "text": json.dumps({"error": str(e)})}],
                    "isError": True,
                },
            }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"},
        }


def run_stdio():
    """Run the MCP server over stdio (standard MCP transport)."""
    sys.stderr.write("[AEOS MCP] Server starting on stdio\n")
    sys.stderr.write(f"[AEOS MCP] {len(TOOLS)} tools available\n")
    sys.stderr.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            sys.stderr.write(f"[AEOS MCP] Invalid JSON: {line[:100]}\n")
            continue

        response = handle_request(request)
        if response is not None:
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()


# =============================================================================
# ENTRYPOINT
# =============================================================================

def main():
    run_stdio()


if __name__ == "__main__":
    main()
