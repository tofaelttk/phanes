# End-to-end data flows and invariants

## Canonical agent → settlement lifecycle

The public site summarizes **five steps** ([phanes.app](https://phanes.app)). Below is a **technical** trace with repository touchpoints.

1. **Identity pulse**  
   - `AgentIdentity.create` (`identity.py`) mints a DID-linked key material story (controller DID, capabilities, `AuthorityBounds`).  
   - Registration events can be recorded in `Ledger.append` (`ledger.py`) and/or persisted via `StorageEngine.put_agent` (`persistence.py`).

2. **Contract formation**  
   - `ContractFactory` templates (`contracts.py`) produce a `Contract` with `Obligation` rows and optional `EscrowAccount` with Pedersen-style commitments to totals.  
   - State transitions: `ContractState` enum — draft → proposed → negotiating → agreed → active → completed / disputed / terminated / expired.

3. **Escrow funding (logical vs rail)**  
   - **Logical:** escrow milestones live on the contract object.  
   - **Stripe:** `StripeSettlementEngine` (`settlement.py`) maps contract IDs to authorize-then-capture semantics.  
   - **USDC:** `USDCSettlementEngine` (`usdc_settlement.py`) emits unsigned transactions: approve → lock → release/refund paths.

4. **Work & verification**  
   - Obligations carry `verification_method` / `verification_data`; fulfillment attaches `fulfillment_proof` bytes.  
   - Risk passes may run pre-trade via `/risk/assess` or embedded in higher-level orchestration (`risk.py`, `ml_engine.py`).

5. **Settlement or dispute**  
   - Successful path: milestone release + capture/release on settlement rail.  
   - Failure path: `Dispute` (`disputes.py`) with evidence chain; resolution may trigger refunds per settlement adapter.

## Invariants (what must never break)

### Identity & delegation

- **Delegation monotonicity:** Child `AuthorityBounds` must be **contained** in parent bounds (`AuthorityBounds.contains`).  
- **Capability gating:** Operations that spend authority should check `CapabilityScope` sets (see identity + contract signers).

### Contracts & escrow

- **No silent double-spend of milestone value:** Each milestone releases at most once (`EscrowAccount.release_milestone`).  
- **Conservation (informal):** Refund paths sum unreleased milestone value (`refund`).  
- **TLA+ alignment:** `formal/AEOSContract.tla` states multi-sig, no double-release, escrow conservation, and monotonicity properties (see module header comments).

### Ledger

- **Hash chain:** Each `LedgerEntry` references `prev_hash`; genesis expectation documented in `LedgerEntry.verify_chain`.  
- **Merkle witness:** `Ledger` builds Merkle accumulators for selective disclosure of inclusion.

### PBFT

- **Quorum size:** Certificates require at least `quorum_size` matching signed votes (`QuorumCertificate.valid`).  
- **Digest binding:** `PBFTMessage` signatures cover canonical view/sequence/digest (`_canon` + domain prefix `AEOS/pbft/`).  
- **TLA+:** `AEOSPBFT.tla` targets agreement and validity under modeled faults (see spec).

### Cryptography

- **Domain separation:** Merkle uses `leaf_hash` vs internal `merkle_hash`; `hash_to_scalar` prefixes `AEOS/{domain}`.  
- **Range proofs:** Bulletproofs path rejects tampered proofs (see tests in `tests/test_all.py`).

## Failure modes (operational)

- **Byzantine replicas:** Handled by PBFT view-change path when enabled in cluster configuration (`bft_ledger.py`).  
- **Circuit breakers:** `RiskEngine` can trip `OPEN` state, blocking flows until policy allows `HALF_OPEN` probing (`risk.py`).  
- **Partial dependency install:** Server/ML/Stripe tests skip if extras missing — production images should pin `phanes[all]` or a curated subset.

## Related

- [Settlement](../protocol/settlement.md)  
- [Formal verification](../formal-verification/tla-plus-specs.md)  
