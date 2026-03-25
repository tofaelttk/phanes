# Formal verification (TLA+)

## Artifacts

| File | Models | Properties (from spec headers) |
|------|--------|--------------------------------|
| `formal/AEOSContract.tla` | Contract escrow state machine | Multi-sig before activation; no double milestone release; escrow conservation; monotonic states; liveness sketches for sign/complete/dispute |
| `formal/AEOSPBFT.tla` | Single-instance PBFT | **Safety:** agreement; committed values have quorum certificates; view change preserves commits. **Liveness:** progress under synchronous correct primary; view change on faulty primary |

## Running TLC

Install [TLA+ tools](https://github.com/tlaplus/tlaplus). The `formal/` directory ships **`.tla` modules**; add TLC **model configuration files** (`.cfg`) in-repo or via the TLA+ Toolbox to define `CONSTANTS` and `SPECIFICATION` / `INVARIANT` clauses for your model bounds, then run, for example:

```bash
cd formal/
java -jar tla2tools.jar -config YourContractModel.cfg AEOSContract.tla
java -jar tla2tools.jar -config YourPBFTModel.cfg AEOSPBFT.tla
```

## Relationship to code

TLA+ modules are **specifications**, not executable monitors. They:

- Anchor **audit conversations** — what must never happen.  
- Guide **regression tests** — e.g., PBFT quorum sizes mirror `QuorumCertificate` in `bft_ledger.py`.  
- Set expectations for **future Coq/Lean** refinement (README roadmap).

## Limitations

Specs abstract cryptography to **honest/dishonest** roles and finite state. They do **not** prove implementation memory safety or side-channel resistance — those require code-level review and the security audit PDF.

## Related

- [Consensus & ledger](../protocol/consensus-ledger.md)  
- [Contracts](../protocol/contracts-escrow.md)  
