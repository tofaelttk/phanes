# Tokenization and state channels

## Tokenization (`aeos/tokenization.py`)

**Purpose:** **Programmable value representations** beyond simple account balances:

- Emission schedules, **decay curves**, **staking** for participation rights, **accrual** aligned to settlement cadence.  
- **Capability gating** — tie protocol permissions to token holdings (least-privilege economics).  
- **Governance hooks** — voting weight or proposal rights from positions (policy-dependent).

### Design stance

Token logic is **in-protocol data** with cryptographic commitments where needed; on-chain bridging is **not** implied by this module alone — USDC settlement is a separate rail (`usdc_settlement.py`).

### Tests

See `tests/test_all.py` tokenization section for conservation, staking, and decay invariants.

---

## State channels (`aeos/state_channels.py`)

**Purpose:** **Bilateral off-chain** transaction streams with **on-chain fallback** semantics.

### Modes

- **Cooperative close** — both parties sign a final state; minimal chain footprint.  
- **Force close** — one party posts contested state; challenge window allows fraud proofs (pattern follows classic payment channel literature).

### AEOS integration

Channels compress **micro-payment** or **micro-obligation** streams while **contracts** remain the source of high-level obligations. Settlement rails ultimately realize net balances.

## Related

- [Settlement](settlement.md)  
- [Consensus & ledger](consensus-ledger.md)  
