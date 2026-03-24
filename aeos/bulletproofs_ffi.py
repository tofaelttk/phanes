"""
AEOS Protocol — Bulletproofs FFI Bridge

This is the ONLY way to get true zero-knowledge range proofs.
The Rust binary (aeos-bulletproofs) uses Ristretto255 Pedersen commitments
with Merlin transcripts. It provides:

  - Perfect hiding: proof reveals NOTHING about the value
  - Computational binding: prover cannot change committed value
  - Soundness: invalid proofs rejected with overwhelming probability
  - Zero-knowledge: simulator can produce indistinguishable transcripts
  - Logarithmic proof size: 672 bytes for 64-bit range

The Python fallback (used when Rust isn't compiled) provides
binding + soundness via Fiat-Shamir, but is NOT zero-knowledge
(it leaks the value's bit-length). The fallback exists only for
testing and development. Production deployments MUST use the Rust binary.

Auto-build: If cargo is available and the binary isn't found, this module
will attempt to compile it automatically on first use.

Usage:
    from aeos.bulletproofs_ffi import BulletproofsEngine

    engine = BulletproofsEngine()  # Auto-discovers or auto-builds
    if engine.is_zk:
        print("True zero-knowledge proofs available")

    # Single value
    result = engine.prove(100_000, 64, "authority_bound")
    assert engine.verify(result["proof"])["valid"]

    # Aggregated (multiple values, one proof)
    result = engine.prove_aggregated([1000, 2000, 3000], 32, "multi")
    assert engine.verify_aggregated(result["proof"])["valid"]

    # Commitment arithmetic
    ca = engine.pedersen_commit(100, "domain")
    cb = engine.pedersen_commit(200, "domain")
    c_sum = engine.commitment_add(ca["commitment"], cb["commitment"])

    # Equality proof
    proof = engine.prove_equality(42, ca["blinding"], cb["blinding"], "eq")
    assert engine.verify_equality(proof["proof"])["valid"]
"""

import json
import os
import subprocess
import shutil
import sys
import time
import struct
import hmac
import hashlib
from typing import Optional, Dict, Any, List

from .crypto_primitives import sha256


# =============================================================================
# BINARY DISCOVERY + AUTO-BUILD
# =============================================================================

def _find_binary() -> Optional[str]:
    """Search for the aeos-bulletproofs binary in known locations."""
    candidates = [
        # Relative to this module
        os.path.join(os.path.dirname(__file__), '..', 'bulletproofs', 'target', 'release', 'aeos-bulletproofs'),
        # Installed globally
        shutil.which('aeos-bulletproofs'),
        # Common development paths
        os.path.expanduser('~/phanes/bulletproofs/target/release/aeos-bulletproofs'),
        os.path.expanduser('~/.cargo/bin/aeos-bulletproofs'),
        # Current working directory
        os.path.join(os.getcwd(), 'bulletproofs', 'target', 'release', 'aeos-bulletproofs'),
    ]
    for path in candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK):
            return os.path.abspath(path)
    return None


def _try_auto_build() -> Optional[str]:
    """Attempt to compile the Rust binary if cargo and source are available."""
    cargo = shutil.which('cargo')
    if not cargo:
        return None

    # Find the bulletproofs source directory
    source_dirs = [
        os.path.join(os.path.dirname(__file__), '..', 'bulletproofs'),
        os.path.expanduser('~/phanes/bulletproofs'),
        os.path.join(os.getcwd(), 'bulletproofs'),
    ]
    source_dir = None
    for d in source_dirs:
        if os.path.isfile(os.path.join(d, 'Cargo.toml')):
            source_dir = os.path.abspath(d)
            break

    if not source_dir:
        return None

    try:
        result = subprocess.run(
            [cargo, 'build', '--release'],
            cwd=source_dir,
            capture_output=True, text=True, timeout=300
        )
        if result.returncode == 0:
            binary = os.path.join(source_dir, 'target', 'release', 'aeos-bulletproofs')
            if os.path.isfile(binary):
                return binary
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    return None


# =============================================================================
# ENGINE
# =============================================================================

class BulletproofsEngine:
    """Bulletproofs zero-knowledge range proof engine.

    Uses the Rust aeos-bulletproofs binary for true zero-knowledge proofs.
    Falls back to Python Fiat-Shamir proofs (binding+soundness only, NOT ZK)
    when the Rust binary is not available.

    The engine auto-discovers the binary in known paths and will attempt
    to auto-build it using cargo if source is available.
    """

    def __init__(self, binary_path: Optional[str] = None):
        """Initialize the engine.

        Args:
            binary_path: Explicit path to aeos-bulletproofs binary.
                         If None, auto-discovers or auto-builds.
        """
        if binary_path and os.path.isfile(binary_path):
            self.binary_path = binary_path
        else:
            self.binary_path = _find_binary()
            if not self.binary_path:
                self.binary_path = _try_auto_build()
                if self.binary_path:
                    pass  # Auto-build succeeded

        self.available = self.binary_path is not None and os.path.isfile(self.binary_path)
        self._warn_logged = False

    @property
    def is_zk(self) -> bool:
        """True if the Rust binary is available (true zero-knowledge proofs)."""
        return self.available

    def _warn_fallback(self):
        if not self._warn_logged:
            import warnings
            warnings.warn(
                "Rust bulletproofs binary not found. Using Python fallback "
                "which provides binding+soundness but NOT zero-knowledge. "
                "Build with: cd bulletproofs && cargo build --release",
                UserWarning, stacklevel=3
            )
            self._warn_logged = True

    # =========================================================================
    # RUST FFI (JSON stdin/stdout)
    # =========================================================================

    def _call_rust(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Call the Rust binary via JSON stdin/stdout."""
        try:
            proc = subprocess.run(
                [self.binary_path],
                input=json.dumps(command) + "\n",
                capture_output=True, text=True, timeout=30
            )
            if proc.returncode != 0:
                return {"success": False, "valid": False,
                        "error": f"Binary error: {proc.stderr[:200]}"}
            return json.loads(proc.stdout.strip())
        except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError) as e:
            return {"success": False, "valid": False, "error": str(e)}

    # =========================================================================
    # SINGLE-VALUE RANGE PROOF
    # =========================================================================

    def prove(self, value: int, range_bits: int = 64,
              domain: str = "default") -> Dict[str, Any]:
        """Create a range proof that value is in [0, 2^range_bits).

        With Rust binary: TRUE zero-knowledge (value is perfectly hidden)
        With Python fallback: binding + soundness only (bit-length leaked)
        """
        if self.available:
            return self._call_rust({
                "command": "prove",
                "value": value,
                "range_bits": range_bits,
                "domain": domain,
            })
        else:
            self._warn_fallback()
            return self._fallback_prove(value, range_bits, domain)

    def verify(self, proof: Dict[str, Any]) -> Dict[str, Any]:
        """Verify a range proof."""
        if self.available and not proof.get("_fallback"):
            return self._call_rust({"command": "verify", "proof": proof})
        else:
            return self._fallback_verify(proof)

    # =========================================================================
    # AGGREGATED MULTI-VALUE PROOF (Rust only)
    # =========================================================================

    def prove_aggregated(self, values: List[int], range_bits: int = 64,
                         domain: str = "default") -> Dict[str, Any]:
        """Create an aggregated proof for multiple values.

        Proof size is O(log(N * range_bits)) — much smaller than N individual proofs.
        REQUIRES the Rust binary. No Python fallback for aggregated proofs.
        """
        if not self.available:
            return {"success": False, "error": "Aggregated proofs require Rust binary. "
                    "Build: cd bulletproofs && cargo build --release"}
        return self._call_rust({
            "command": "prove_aggregated",
            "values": values,
            "range_bits": range_bits,
            "domain": domain,
        })

    def verify_aggregated(self, proof: Dict[str, Any]) -> Dict[str, Any]:
        """Verify an aggregated range proof."""
        if not self.available:
            return {"valid": False, "error": "Aggregated verification requires Rust binary"}
        return self._call_rust({"command": "verify_aggregated", "proof": proof})

    # =========================================================================
    # PEDERSEN COMMITMENT ARITHMETIC (Rust only)
    # =========================================================================

    def pedersen_commit(self, value: int, domain: str = "default") -> Dict[str, Any]:
        """Create a Pedersen commitment: C = v*G + r*H.
        REQUIRES Rust binary for real EC arithmetic.
        """
        if not self.available:
            return {"success": False, "error": "Pedersen commitments require Rust binary"}
        return self._call_rust({"command": "commit", "value": value, "domain": domain})

    def commitment_add(self, commitment_a: List[int], commitment_b: List[int]) -> Dict[str, Any]:
        """Homomorphic addition: C(a) + C(b) = C(a+b) without revealing a or b.
        REQUIRES Rust binary.
        """
        if not self.available:
            return {"success": False, "error": "Commitment arithmetic requires Rust binary"}
        return self._call_rust({
            "command": "commitment_add",
            "commitment_a": commitment_a,
            "commitment_b": commitment_b,
        })

    # =========================================================================
    # PROOF OF EQUALITY (Rust only)
    # =========================================================================

    def prove_equality(self, value: int, blinding_a: List[int],
                       blinding_b: List[int], domain: str = "default") -> Dict[str, Any]:
        """Prove two Pedersen commitments hide the same value.
        Uses Schnorr proof with Fiat-Shamir transform.
        REQUIRES Rust binary.
        """
        if not self.available:
            return {"success": False, "error": "Equality proofs require Rust binary"}
        return self._call_rust({
            "command": "prove_equality",
            "value": value,
            "blinding_a": blinding_a,
            "blinding_b": blinding_b,
            "domain": domain,
        })

    def verify_equality(self, proof: Dict[str, Any]) -> Dict[str, Any]:
        """Verify an equality proof."""
        if not self.available:
            return {"valid": False, "error": "Equality verification requires Rust binary"}
        return self._call_rust({"command": "verify_equality", "proof": proof})

    # =========================================================================
    # BATCH VERIFICATION
    # =========================================================================

    def batch_verify(self, proofs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch verify multiple proofs."""
        if self.available and not any(p.get("_fallback") for p in proofs):
            return self._call_rust({"command": "batch_verify", "proofs": proofs})
        else:
            results = [self._fallback_verify(p)["valid"] for p in proofs]
            return {"all_valid": all(results), "individual_results": results, "error": None}

    # =========================================================================
    # STATUS
    # =========================================================================

    def status(self) -> Dict[str, Any]:
        """Engine status including ZK capability."""
        if self.available:
            try:
                return self._call_rust({"command": "status"})
            except Exception:
                pass
        return {
            "version": 2,
            "engine": "rust_bulletproofs" if self.available else "python_fallback",
            "binary_path": self.binary_path,
            "available": self.available,
            "zk": self.available,
            "note": None if self.available else
                "Python fallback: binding+soundness only, NOT zero-knowledge. "
                "Build Rust: cd bulletproofs && cargo build --release",
        }

    # =========================================================================
    # PYTHON FALLBACK (NOT zero-knowledge — binding + soundness only)
    # =========================================================================

    def _fallback_prove(self, value: int, range_bits: int,
                        domain: str) -> Dict[str, Any]:
        """Python fallback range proof (Fiat-Shamir challenge-response).

        WARNING: This is NOT zero-knowledge. It provides:
          - Binding: prover cannot change the committed value
          - Soundness: invalid proofs are rejected
          - NOT hiding: bit-length of value is revealed

        True ZK requires the Rust Bulletproofs binary.
        """
        from .crypto_primitives import RangeProof
        try:
            proof, blinding = RangeProof.create(value=value, range_bits=range_bits)
            return {
                "success": True,
                "proof": {
                    "bit_commitments": [c.hex() for c in proof.bit_commitments],
                    "bit_proofs": [p.hex() for p in proof.bit_proofs],
                    "responses": [r.hex() for r in proof.responses],
                    "challenge": proof.challenge.hex(),
                    "total_commitment": proof.total_commitment.hex(),
                    "range_bits": range_bits,
                    "domain": domain,
                    "_fallback": True,
                    "_zk": False,
                    "_proof_object": proof,
                },
                "blinding": list(blinding),
                "error": None,
                "zk": False,
            }
        except ValueError as e:
            return {"success": False, "proof": {"_fallback": True}, "blinding": [], "error": str(e)}

    def _fallback_verify(self, proof: Dict[str, Any]) -> Dict[str, Any]:
        """Verify a Python fallback proof using Fiat-Shamir verification."""
        if not proof.get("_fallback"):
            return {"valid": False, "error": "Cannot verify Rust proof without binary"}

        proof_obj = proof.get("_proof_object")
        if proof_obj is not None:
            return {"valid": proof_obj.verify(), "error": None}

        try:
            from .crypto_primitives import RangeProof
            rp = RangeProof(
                bit_commitments=[bytes.fromhex(c) for c in proof.get("bit_commitments", [])],
                bit_proofs=[bytes.fromhex(p) for p in proof.get("bit_proofs", [])],
                responses=[bytes.fromhex(r) for r in proof.get("responses", [])],
                challenge=bytes.fromhex(proof.get("challenge", "")),
                total_commitment=bytes.fromhex(proof.get("total_commitment", "")),
                range_bits=proof.get("range_bits", 0),
            )
            return {"valid": rp.verify(), "error": None}
        except Exception as e:
            return {"valid": False, "error": str(e)}


# =============================================================================
# MODULE-LEVEL CONVENIENCE
# =============================================================================

_engine: Optional[BulletproofsEngine] = None


def get_engine() -> BulletproofsEngine:
    """Get or create the global Bulletproofs engine."""
    global _engine
    if _engine is None:
        _engine = BulletproofsEngine()
    return _engine


def prove_range(value: int, range_bits: int = 64,
                domain: str = "default") -> Dict[str, Any]:
    return get_engine().prove(value, range_bits, domain)


def verify_range(proof: Dict[str, Any]) -> Dict[str, Any]:
    return get_engine().verify(proof)


def is_zk_available() -> bool:
    """Check if true zero-knowledge proofs are available."""
    return get_engine().is_zk
