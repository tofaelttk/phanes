# Contracts, obligations, and escrow

## Purpose

`aeos/contracts.py` defines **executable agreements** between agents:

- Finite state machine (`ContractState`).  
- Typed **obligations** (`ObligationType`: payment, delivery, attestation, computation, availability).  
- **Escrow** with milestone schedule and cryptographic **commitment** to total value (`EscrowAccount`).  
- Factory templates (`ContractFactory`) for common patterns: service agreement, data purchase, compute lease.

## Lifecycle (implementation)

States include: `DRAFT`, `PROPOSED`, `NEGOTIATING`, `AGREED`, `ACTIVE`, `COMPLETED`, `DISPUTED`, `TERMINATED`, `EXPIRED`.

Unlike prose contracts, each obligation carries:

- **Debtor / creditor DIDs**  
- **Value** (smallest currency unit, typically cents for fiat-aligned flows)  
- **Deadline**  
- **`verification_method` + `verification_data`** — machine-checkable fulfillment criteria  
- **`penalty_on_breach`** — deterministic economic consequence

## Escrow mechanics

`EscrowAccount.create`:

- Sums milestone values → `total_value`.  
- Builds `escrow_id` from hash of domain-separated string including parties and time.  
- Creates `Commitment` to value bytes (hiding exact timing of reveal).  
- Initializes each milestone with `released=False` and empty release proof.

`release_milestone` marks a milestone released and stores `release_proof` (hex) for audit.

`refund` returns the sum of **unreleased** milestone values for dispute/cancel paths.

## Templates

`ContractFactory` methods encode **opinionated defaults** (obligations, deadlines, escrow shape) so agents do not hand-assemble every field for common B2B agent scenarios.

## Formal specification

`formal/AEOSContract.tla` abstracts parties, milestones, escrow totals, and time; it states **safety** properties:

- No escrow release without required signatures.  
- No double release of a milestone.  
- Escrow conservation.  
- No illegal state regression.  
- Activation only after multi-party sign.

…and **liveness** sketches (sign → activate, fulfill → complete, deadline → dispute).

## Related

- [Disputes](disputes.md)  
- [Settlement](settlement.md)  
- [Data-flow invariants](../architecture/data-flows-and-invariants.md)  
