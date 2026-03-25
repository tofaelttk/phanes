# BFT consensus and immutable ledger

## Immutable ledger (`aeos/ledger.py`)

**Purpose:** **Append-only, hash-linked** journal of protocol events with **Merkle inclusion proofs**.

### Event taxonomy

`EventType` includes agent lifecycle, contract lifecycle, obligations, delegations, disputes, risk alerts, circuit breaker trips, insurance claims, reputation updates.

### `LedgerEntry` structure

Each entry stores: monotonic `sequence`, `event_type`, timestamps, actor/subject DIDs, `data_hash`, **`prev_hash`**, Ed25519 `signature`, and optional metadata.

`verify_chain` ensures `prev_hash` matches SHA-256 of prior entry bytes or the documented genesis constant.

### `Ledger` operations

Append entries, rebuild Merkle accumulators, produce proofs for external auditors, and export stats.

**Note:** Comments in `ledger.py` state that production could back this with **BFT** — implemented in `bft_ledger.py`.

---

## PBFT distributed ledger (`aeos/bft_ledger.py`)

**Purpose:** **Practical Byzantine Fault Tolerance** (Castro–Liskov, OSDI ’99) for replicated AEOS state.

### Parameters

Cluster size **n = 3f + 1** tolerates **f** Byzantine replicas. Implementation supports practical cluster sizes (README cites roughly 4–13 nodes).

### Message flow

Phases (`Phase` enum): idle → pre-prepared → prepared → committed → executed.

`MessageType` includes `REQUEST`, `PRE_PREPARE`, `PREPARE`, `COMMIT`, `REPLY`, `VIEW_CHANGE`, `NEW_VIEW`, `CHECKPOINT`.

### Cryptographic votes

`PBFTMessage` carries view, sequence, digest, payload, timestamp, and **Ed25519 signature** over `SHA256("AEOS/pbft/" || canonical_json)`.

`QuorumCertificate` aggregates **2f+1** matching signed messages — third-party verifiable evidence of agreement.

### Liveness

**View-change** protocol recovers from primary failure; **checkpoint** protocol supports garbage collection and state transfer (see module docstring).

### API surface

`DistributedLedger.submit` returns structured commit results consumed in tests and demos.

---

## Formal verification

`formal/AEOSPBFT.tla` specifies agreement and validity properties under modeled faults. Use TLC as described in spec headers.

## Related

- [Formal verification](../formal-verification/tla-plus-specs.md)  
- [Cryptography](../cryptography/primitives-proofs-threshold.md)  
