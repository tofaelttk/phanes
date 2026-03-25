# Settlement: Stripe and USDC

## Stripe (`aeos/settlement.py`)

**Pattern:** **Authorize → capture → refund** mapped to Stripe **PaymentIntents** (or compatible flows).

### Contract alignment

Escrow is keyed by **contract identifiers** from AEOS. Successful fulfillment triggers **capture**; disputes trigger **refund** paths.

### Configuration

Requires Stripe secret key via environment or constructor — install `phanes[settlement]` for the Stripe SDK dependency.

### Observability

Webhook-shaped reconciliation (described in README) links external payment events back to **ledger projections**.

---

## USDC / ERC-20 (`aeos/usdc_settlement.py`)

**Pattern:** Classic **approve + transferFrom** escrow without mandating a custom AEOS smart contract deployment for basic flows.

### Chains

`Chain` enum includes `ETHEREUM`, `BASE`, `ARBITRUM`, `POLYGON`, `SEPOLIA`, `BASE_SEPOLIA`.

`USDC_ADDRESSES`, `CHAIN_RPC`, and `CHAIN_ID` centralize chain metadata (defaults use public RPC URLs — **production should substitute** private RPC endpoints).

### Transaction builders

High-level API:

- `build_approve_tx` — payer grants allowance.  
- `build_lock_tx` — move USDC into deterministic escrow.  
- `build_release_tx` — payee receives on success.  
- Refund paths return funds to payer on dispute.

### Deterministic escrow addresses

Escrow addresses are **derived** from `contract_id` hashes so parties can verify addresses without off-band address exchange.

### Multi-sig and time-locks

Module docstring advertises **threshold release** and **time-locked release** — consult implementation for current parameter surfaces.

### ChainClient

`ChainClient` paths that require **web3.py** are guarded — tests mark web3-dependent cases accordingly.

## Security note

Unsigned transactions must be **signed in a secure enclave** (HSM, Fireblocks, MetaMask, etc.). AEOS constructs **calldata**, not custody policy.

## Related

- [Persistence](persistence.md)  
- [REST API](../integration/rest-api.md) — settlement may be wired via future dedicated routes or orchestration layer  
