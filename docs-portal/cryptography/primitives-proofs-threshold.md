# Cryptographic primitives, zero-knowledge, and threshold trust

## Baseline primitives (`aeos/crypto_primitives.py`)

### Hashing & domain separation

- **`sha256`** — raw SHA-256 digest.  
- **`hash_to_scalar(domain, *args)`** — maps to Ed25519 scalar field with length-prefixed argument encoding under `AEOS/{domain}`.  
- **`leaf_hash` / `merkle_hash`** — domain-separated Merkle tree (leaf `0x00`, internal `0x01` + sorted children) mitigating second-preimage confusion.

### Keys & signatures

- **`KeyPair`** — Ed25519 via `cryptography` library; `sign` / `verify`; `key_id` from `SHA256(AEOS/key-id || pubkey)`.  
- **HKDF-SHA256** — deterministic child key derivation (`derive_child` pattern in file).

### Commitments

- **Pedersen-style commitments** — hide values with opening proofs; used in escrow and selective disclosure flows.

### Zero-knowledge range proofs

- **`RangeProof`** — Python-side structure; **production proofs** via Rust Bulletproofs (`bulletproofs_ffi.py`).

### Symmetric crypto

- **AES-256-GCM** — `encrypt` / `decrypt` helpers for payload confidentiality at rest or in transit between agents.

### VRF

- **Verifiable random function** — deterministic yet unpredictable outputs with proofs; used in dispute arbitrator selection and other randomized protocols.

### Merkle accumulator

- **`MerkleAccumulator`** + **`MerkleProof`** — dynamic inclusion proofs for credential sets and ledger batches.

---

## Bulletproofs (`bulletproofs/` + `aeos/bulletproofs_ffi.py`)

### Rust core

- Ristretto255 group arithmetic.  
- Merlin transcripts for **Fiat–Shamir** challenges (non-interactive proofs).  
- Implements succinct **range proofs** proving committed values lie in intervals without revealing them.

### Python FFI

`bulletproofs_ffi.py` loads the native library, exposes prove/verify/batch verify, and surfaces **tamper detection** tests (invalid proofs rejected).

### Operational requirement

Rust build produces artifacts consumed at runtime — container images must include compiled `.so` / `.dylib` matching platform.

---

## Threshold cryptography (`aeos/threshold_crypto.py`)

### Shamir secret sharing

- Secrets split into **n** shares with threshold **t**; reconstruction via **Lagrange interpolation** over GF(L).  
- Tests include **VSS tamper** detection scenarios.

### Threshold signatures

- Polynomial evaluation on shares yields valid quorum signatures without reconstructing full private key in one place.

### Time-lock puzzles

- Delayed reveal for escrow release coordination, arbitration outcomes, or upgrade governance (see module for puzzle API).

## Threat modeling pointer

Repository ships **AEOS_Security_Audit_v0.1.pdf** (STRIDE-oriented). This portal does not duplicate findings — operators should read the PDF alongside this section.

## Related

- [Identity / selective disclosure](../protocol/identity.md)  
- [Formal verification](../formal-verification/tla-plus-specs.md)  
