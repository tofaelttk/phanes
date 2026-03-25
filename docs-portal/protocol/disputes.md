# Disputes and arbitration

## Purpose

`aeos/disputes.py` models **structured conflict resolution** when contract obligations fail:

- Typed `DisputeReason` (non-delivery, quality mismatch, late delivery, payment failure, unauthorized action, fraud, …).  
- **Evidence** objects with cryptographic timestamps and hashes for ordering/integrity.  
- **Tiered resolution** — automatic resolution for clear-cut cases; escalated panels/tribunal modes in the same module’s architecture.  
- **VRF-influenced arbitrator selection** — reduces predictable forum shopping and naive collusion (uses VRF primitives from `crypto_primitives.py`).

## Data model

Core types include `Dispute`, `Evidence`, `Resolution`, and enums for reason codes and resolution outcomes.

Evidence chains support **append-only** narratives suitable for ledger projection (`ledger.py` `EventType.EVIDENCE_SUBMITTED`, `DISPUTE_FILED`, `DISPUTE_RESOLVED`).

## Economic coupling

Disputes reference **contract IDs** and damage claims (`claimed_damages`). Successful arbitration flows tie to:

- **Stripe** — `refund_escrow` style operations (`settlement.py`).  
- **USDC** — refund transaction builders (`usdc_settlement.py`).

## REST & MCP

- REST: `POST /disputes`, `POST /disputes/{id}/evidence`, `POST /disputes/{id}/resolve`, `GET /disputes/{id}` (`server.py`).  
- MCP: analogous tools in `mcp_server.py` tool table.

## Related

- [Contracts & escrow](contracts-escrow.md)  
- [REST API](../integration/rest-api.md)  
