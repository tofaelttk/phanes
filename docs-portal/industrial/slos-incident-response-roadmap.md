# SLOs, error budgets, and incident response

**Status: Coming soon — industrial documentation track**

This roadmap defines how a **production-grade Phanes deployment** should be operated. The open-source `phanes-server` reference is a **starting point**, not a complete SRE program.

---

## 1. Service level objectives (target)

**Coming soon:** numerically pinned SLOs per deployment tier. Draft dimensions:

| Surface | Candidate SLI | Notes |
|---------|---------------|-------|
| REST API | Availability of `/health` + core mutating routes | Exclude operator-induced maintenance windows |
| MCP | Tool call success rate | Host process stability |
| Settlement (Stripe) | Webhook processing lag | Idempotency keys |
| USDC | Tx submission success vs chain congestion | RPC redundancy |
| PBFT cluster | Commit latency p99 | Quorum health |

**Error budgets** will tie release velocity to observed burn rates.

---

## 2. Observability stack (target)

**Coming soon:** reference architecture using OpenTelemetry traces (span per contract transition), Prometheus metrics (quorum round duration, ML score histograms), and structured JSON logs correlated by `trace_id`.

Minimum metrics (draft):

- `aeos_ledger_append_total`  
- `aeos_pbft_commit_latency_seconds`  
- `aeos_risk_assess_latency_seconds`  
- `aeos_settlement_capture_total` / `refund_total`

---

## 3. Incident severity model (draft)

| Severity | Definition | Response |
|----------|------------|----------|
| SEV1 | Funds at risk or ledger fork suspicion | Page on-call + freeze mutators |
| SEV2 | Partial outage (e.g., Stripe path down) | Fail closed on new escrows |
| SEV3 | Elevated error rate | Scale + investigate |
| SEV4 | Cosmetic / docs | Next business day |

**Coming soon:** runbooks with exact `kubectl` / `flyctl` / SQL queries.

---

## 4. Disaster recovery

**Coming soon:** RPO/RTO targets for SQLite single-node vs replicated topology; BFT snapshot + checkpoint restore procedures aligned with `bft_ledger.py` checkpoint narrative.

---

## 5. Customer communications

**Coming soon:** status page integration, postmortem template, regulatory notification decision tree (operator-specific legal review required).
