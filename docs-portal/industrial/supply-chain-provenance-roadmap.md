# Supply chain security and build provenance

**Status: Coming soon — industrial documentation track**

Autonomous agents moving value are **high-value targets** for dependency and build-pipeline compromise. This roadmap specifies how Phanes artifacts will be **reproducible, signed, and attestable**.

---

## 1. Goals

1. **Reproducible builds** — same git tag → same binary hash for Rust Bulletproofs + container images.  
2. **Signed artifacts** — Sigstore/cosign or Docker Content Trust for images; PyPI provenance (PEP 740) when publishing wheels.  
3. **SBOM** — CycloneDX or SPDX for Python + Node + Rust dependency graphs.  
4. **Vulnerability SLAs** — triage classes for CVEs in `cryptography`, `fastapi`, `numpy`, etc.

**Coming soon:** CI job definitions, signing keys governance, and public attestation storage.

---

## 2. Current repository state (factual)

- **Python deps** pinned as minimum versions in `pyproject.toml` — operators should lock with `pip-tools` or Poetry in production.  
- **Rust** `Cargo.lock` checked in under `bulletproofs/`.  
- **Node** `package-lock.json` under `ts-sdk/`.

This is **baseline** supply-chain hygiene, not full SLSA L3.

---

## 3. Threat scenarios

| Threat | Mitigation (target) |
|--------|---------------------|
| Typosquat PyPI package | Namespace + verified publisher + SBOM diff in CI |
| Compromised GitHub Action | Pin actions by SHA; minimal permissions |
| Malicious RPC responses | Multi-RPC quorum; checkpointed chain heads |
| DLL side-loading in FFI | RPATH hardening, container read-only rootfs |

**Coming soon:** detailed threat-model addendum to STRIDE audit.

---

## 4. Roadmap milestones

- **M1** — SBOM generation in CI (**Coming soon**).  
- **M2** — cosign-signed container images (**Coming soon**).  
- **M3** — SLSA provenance Level 3 for release pipeline (**Coming soon**).  
- **M4** — Binary transparency log for Rust `.so` artifacts (**Coming soon**).

---

## 5. Developer guidance (today)

- Verify `pip install phanes` against **PyPI checksums** or internal mirror.  
- Build Bulletproofs from **vendored** `bulletproofs/` in CI, not anonymous downloads.  
- Run `python3 tests/test_all.py` after dependency upgrades.
