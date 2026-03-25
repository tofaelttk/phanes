# Compliance, trust services, and control framework

**Status: Coming soon — industrial documentation track**

This document is a **roadmap placeholder** for **docs.phanes.app**. It describes the class of artifacts large financial and AI infrastructure buyers expect. It is **not** yet a committed control baseline for the open-source reference implementation.

---

## 1. Purpose (target state)

Deliver a **mapped control matrix** aligning AEOS deployments to common frameworks:

- **SOC 2 (Type II)** — security, availability, confidentiality criteria.  
- **ISO/IEC 27001** — information security management system (ISMS) alignment.  
- **NIST SP 800-53** moderate baseline (for US federal-adjacent buyers).  
- **EU AI Act** (where applicable) — logging, human oversight hooks, risk management for high-risk AI systems using autonomous agents.

**Coming soon:** control IDs, evidence collection procedures, and auditor-facing narratives.

---

## 2. Scoped boundaries

| In scope (future doc) | Out of scope (operator responsibility) |
|----------------------|----------------------------------------|
| AEOS process controls for hosted Phanes Cloud *if/when offered* | Customer data classification inside their VPC |
| Cryptographic mechanisms as compensating controls | Physical datacenter certifications |
| Formal specs as design evidence | National payment licenses (MSB, EMI, etc.) |

---

## 3. Control themes (draft outline)

1. **Identity & access** — RBAC for operators, break-glass, MFA, API key rotation.  
2. **Key custody** — HSM/Firewalls for settlement signing; segregation of duties.  
3. **Change management** — signed releases, reproducible builds, SLSA-style provenance (**see** [supply-chain roadmap](supply-chain-provenance-roadmap.md)).  
4. **Logging & monitoring** — tamper-evident logs, ledger cross-checks, anomaly alerts.  
5. **Incident response** — severity classes, customer notification SLAs (**see** [SLO roadmap](slos-incident-response-roadmap.md)).  
6. **Data protection** — encryption at rest/in transit, retention schedules.  
7. **Third-party risk** — Stripe, RPC providers, cloud vendors subprocessor list.

---

## 4. Cryptography as compliance evidence

The implementation already provides **auditable primitives** (append-only ledger, PBFT certificates, Ed25519 signatures, Merkle proofs). **Coming soon:** sample **audit packages** showing how to reconstruct a settlement dispute from ledger entries + Stripe metadata + on-chain receipts.

---

## 5. Publication plan

- **v0** — this roadmap (public).  
- **v1** — control matrix spreadsheet + policy templates (**Coming soon**).  
- **v2** — third-party auditor letter (**Coming soon**).

For current assurance artifacts, use **AEOS_Security_Audit_v0.1.pdf** at the repository root.
