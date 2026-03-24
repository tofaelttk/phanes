"""
AEOS Protocol — Production Bulletproofs (Rust FFI Bridge)

Calls the compiled Rust binary for real Bulletproofs range proofs.
Falls back to the Python simplified proofs if the binary isn't available.

Usage:
    from aeos.bulletproofs_ffi import BulletproofsEngine

    engine = BulletproofsEngine()  # Auto-detects Rust binary

    # Prove a value is in range [0, 2^64)
    result = engine.prove(value=100_000, range_bits=64, domain="authority_bound")
    assert result['success']

    # Verify the proof
    valid = engine.verify(result['proof'])
    assert valid['valid']

    # Batch verify
    batch = engine.batch_verify([proof1, proof2, proof3])
    assert batch['all_valid']
"""

import json
import os
import subprocess
import shutil
from typing import Dict, Any, List, Optional
from pathlib import Path


class BulletproofsEngine:
    """Interface to production Bulletproofs via Rust FFI.
    
    The Rust binary communicates via JSON over stdin/stdout.
    Each line of input is a JSON command, each line of output is the result.
    """

    def __init__(self, binary_path: Optional[str] = None):
        """Initialize the Bulletproofs engine.
        
        Args:
            binary_path: Path to the aeos-bulletproofs binary.
                         If None, searches standard locations.
        """
        self.binary_path = binary_path or self._find_binary()
        self.available = self.binary_path is not None
        
        if self.available:
            # Verify binary works
            try:
                test = self._call({"command": "prove", "value": 0, "range_bits": 8, "domain": "init_test"})
                if not test.get("success"):
                    self.available = False
            except Exception:
                self.available = False

    def _find_binary(self) -> Optional[str]:
        """Search for the Bulletproofs binary in standard locations."""
        search_paths = [
            # Relative to this file
            os.path.join(os.path.dirname(__file__), "..", "aeos-bulletproofs", "target", "release", "aeos-bulletproofs"),
            # Relative to CWD
            os.path.join("aeos-bulletproofs", "target", "release", "aeos-bulletproofs"),
            # In PATH
            shutil.which("aeos-bulletproofs"),
            # Home directory
            os.path.expanduser("~/aeos-bulletproofs/target/release/aeos-bulletproofs"),
        ]
        
        for path in search_paths:
            if path and os.path.isfile(path) and os.access(path, os.X_OK):
                return path
        return None

    def _call(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Send a JSON command to the Rust binary and return the result."""
        if not self.binary_path:
            raise RuntimeError("Bulletproofs binary not found")
        
        input_json = json.dumps(command)
        result = subprocess.run(
            [self.binary_path],
            input=input_json,
            capture_output=True,
            text=True,
            timeout=30,
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Bulletproofs binary error: {result.stderr}")
        
        return json.loads(result.stdout.strip())

    def prove(self, value: int, range_bits: int = 64,
              domain: str = "default") -> Dict[str, Any]:
        """Create a Bulletproofs range proof.
        
        Args:
            value: The secret value to prove range membership for
            range_bits: Range width (8, 16, 32, or 64)
            domain: Context-binding domain label
            
        Returns:
            {
                "success": bool,
                "proof": { "proof_bytes": [...], "commitment": [...], "range_bits": N, "domain": "..." },
                "blinding": [...],
                "error": null | "..."
            }
        """
        if not self.available:
            return self._fallback_prove(value, range_bits, domain)
        
        return self._call({
            "command": "prove",
            "value": value,
            "range_bits": range_bits,
            "domain": domain,
        })

    def verify(self, proof: Dict[str, Any]) -> Dict[str, Any]:
        """Verify a Bulletproofs range proof.
        
        Args:
            proof: The proof object from prove()
            
        Returns:
            {"valid": bool, "error": null | "..."}
        """
        if not self.available:
            return self._fallback_verify(proof)
        
        return self._call({
            "command": "verify",
            "proof": proof,
        })

    def batch_verify(self, proofs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Batch verify multiple range proofs.
        
        More efficient than individual verification.
        
        Returns:
            {"all_valid": bool, "individual_results": [bool, ...], "error": null | "..."}
        """
        if not self.available:
            results = [self._fallback_verify(p)["valid"] for p in proofs]
            return {
                "all_valid": all(results),
                "individual_results": results,
                "error": None,
            }
        
        return self._call({
            "command": "batch_verify",
            "proofs": proofs,
        })

    # =========================================================================
    # FALLBACK (Python simplified proofs when Rust binary isn't available)
    # =========================================================================

    def _fallback_prove(self, value: int, range_bits: int,
                        domain: str) -> Dict[str, Any]:
        """Fallback to Python range proof (Fiat-Shamir challenge-response).
        
        NOTE: This provides binding and soundness but NOT zero-knowledge.
        The Rust Bulletproofs module provides true ZK. This fallback is
        suitable for testing and for cases where the verifier is trusted.
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
                    "_proof_object": proof,  # Keep for verification
                },
                "blinding": list(blinding),
                "error": None,
            }
        except ValueError as e:
            return {
                "success": False,
                "proof": {"bit_commitments": [], "range_bits": range_bits,
                          "domain": domain, "_fallback": True},
                "blinding": [],
                "error": str(e),
            }

    def _fallback_verify(self, proof: Dict[str, Any]) -> Dict[str, Any]:
        """Verify a Python fallback range proof cryptographically.
        
        Reconstructs the RangeProof object and runs the full
        Fiat-Shamir verification (challenge derivation + bit proof checks).
        """
        if not proof.get("_fallback"):
            return {"valid": False, "error": "Cannot verify Rust proof without binary"}

        # If we have the proof object directly, use it
        proof_obj = proof.get("_proof_object")
        if proof_obj is not None:
            return {"valid": proof_obj.verify(), "error": None}

        # Otherwise reconstruct from serialized form
        try:
            from .crypto_primitives import RangeProof
            bit_commitments = [bytes.fromhex(c) for c in proof.get("bit_commitments", [])]
            bit_proofs = [bytes.fromhex(p) for p in proof.get("bit_proofs", [])]
            responses = [bytes.fromhex(r) for r in proof.get("responses", [])]
            challenge = bytes.fromhex(proof.get("challenge", ""))
            total_commitment = bytes.fromhex(proof.get("total_commitment", ""))
            range_bits = proof.get("range_bits", 0)

            if not bit_commitments or not bit_proofs or not responses:
                return {"valid": False, "error": "Incomplete proof data"}

            rp = RangeProof(
                bit_commitments=bit_commitments,
                bit_proofs=bit_proofs,
                responses=responses,
                challenge=challenge,
                total_commitment=total_commitment,
                range_bits=range_bits,
            )
            return {"valid": rp.verify(), "error": None}
        except Exception as e:
            return {"valid": False, "error": str(e)}

    def status(self) -> Dict[str, Any]:
        """Return engine status."""
        return {
            "engine": "rust_bulletproofs" if self.available else "python_fallback",
            "binary_path": self.binary_path,
            "available": self.available,
            "version": "0.1.0",
        }


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
    """Create a range proof using the best available engine."""
    return get_engine().prove(value, range_bits, domain)


def verify_range(proof: Dict[str, Any]) -> Dict[str, Any]:
    """Verify a range proof using the best available engine."""
    return get_engine().verify(proof)


def batch_verify(proofs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Batch verify range proofs using the best available engine."""
    return get_engine().batch_verify(proofs)
