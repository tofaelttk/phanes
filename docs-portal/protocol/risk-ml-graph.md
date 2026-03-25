# Risk engine, ML, and graph intelligence

## Risk engine (`aeos/risk.py`)

**Role:** Gate or score **every consequential action** — payments, contract steps, delegations.

### Core concepts

- **`RiskLevel`** — `MINIMAL` → `BLOCKED` ordinal scale.  
- **`RiskScore`** — Scalar `overall` in [0,1], per-factor map, human-readable `explanation`, optional `action_hash` for audit linkage.  
- **`BehavioralProfile`** — Rolling window (`deque`) of `TransactionRecord` with evolving means, counterparties, tx types, hours.  
- **Circuit breakers** — `CircuitBreakerState`: `CLOSED` / `OPEN` / `HALF_OPEN` for systemic trip and recovery semantics.

### Factors

The engine composes multiple **risk dimensions** (counterparty history, velocity, value anomalies, delegation depth, dispute rate, etc.). Exact weighting is implemented in `RiskEngine` methods — treat tuning as **deployment-specific hyperparameters**.

### Cryptographic touchpoints

Imports include `Commitment` and `RangeProof` from `crypto_primitives.py` for **binding risk decisions** to committed attributes where proofs are used.

---

## ML engine (`aeos/ml_engine.py`)

**Role:** Unsupervised and online models over **transaction streams**.

### Feature engineering

`FeatureExtractor` + `TransactionFeatures` convert raw dict transactions into a **normalized vector** (`to_vector`) including:

- Value and log-value  
- Time-of-day / day-of-week  
- New counterparty flag  
- Rolling means/std (10- and 50-tx windows)  
- Velocity and volume (1h / 24h)  
- Unique counterparties  
- Ratio to rolling mean  
- Delegation depth, contract count, dispute rate  

### Models

- **Isolation Forest** — classical unsupervised anomaly detector on feature space (scikit-learn when `phanes[ml]` installed).  
- **Online Bayesian learner** — incremental belief updates.  
- **Markov behavioral model** — state transitions over discretized behavior.  
- **Entropy drift detector** — KL/entropy change alerts for distribution shift.  
- **Ensemble scorer** — combines detectors with configurable weights.

### Integration point

`RiskEngine` consumes ML outputs as **signals**, not as sole authority — preserving explainability and policy overrides.

---

## Graph intelligence (`aeos/graph_intelligence.py`)

**Role:** **Structural** view of the agent economy — who transacts with whom, cluster structure, and propagation of stress.

### Capabilities (conceptual)

- **Trust diffusion** — PageRank-style scoring on directed graphs.  
- **Community detection** — highlight dense clusters (potential rings).  
- **Cascade simulation** — stress propagation given failure seeds.  
- **Sybil resistance** — graph-theoretic heuristics beyond local IP/device checks.

### Dependency

Uses **NetworkX** when ML extras installed; graph features feed **counterparty** and **systemic** risk dimensions.

---

## Joint semantics

Together, these modules implement the **Intelligence Layer** from [phanes.app/protocol](https://phanes.app/protocol):

> “Real-time anomaly detection, network-level trust inference, and bilateral state channels…”

Channels are documented separately in [tokenization-state-channels.md](tokenization-state-channels.md).

## Related

- [Architecture / layered stack](../architecture/layered-stack.md)  
- [Cryptography](../cryptography/primitives-proofs-threshold.md)  
