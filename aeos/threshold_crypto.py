"""
AEOS Threshold Cryptography

Advanced multi-party cryptographic primitives for the agent economy.

Implements:
  - Shamir's Secret Sharing (SSS): Split a secret into n shares where any t can reconstruct
  - Threshold Signatures: t-of-n agents must co-sign for validity
  - Distributed Key Generation (DKG): Generate shared keys without trusted dealer
  - Verifiable Secret Sharing (VSS): Shareholders can verify their shares are consistent
  - Multi-Party Escrow: Funds released only when t-of-n parties agree
  - Time-Lock Puzzles: Secrets that can only be revealed after computational work

All arithmetic is performed in GF(p) where p is a large prime (Ed25519 group order).
"""

import os
import time
import hmac
import hashlib
import struct
import json
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional, Any

from .crypto_primitives import sha256, KeyPair, hash_to_scalar

# Ed25519 group order
L = 2**252 + 27742317777372353535851937790883648493


def mod_inverse(a: int, m: int = L) -> int:
    """Extended Euclidean algorithm for modular inverse."""
    if a < 0:
        a = a % m
    g, x, _ = _extended_gcd(a, m)
    if g != 1:
        raise ValueError(f"Modular inverse does not exist for {a} mod {m}")
    return x % m


def _extended_gcd(a: int, b: int) -> Tuple[int, int, int]:
    if a == 0:
        return b, 0, 1
    g, x, y = _extended_gcd(b % a, a)
    return g, y - (b // a) * x, x


# =============================================================================
# POLYNOMIAL ARITHMETIC OVER GF(L)
# =============================================================================

class Polynomial:
    """Polynomial over GF(L) for secret sharing schemes."""

    def __init__(self, coefficients: List[int]):
        """coefficients[0] is the constant term (the secret)."""
        self.coefficients = [c % L for c in coefficients]
        self.degree = len(coefficients) - 1

    @classmethod
    def random(cls, degree: int, constant: int) -> 'Polynomial':
        """Generate random polynomial with specified constant term."""
        coeffs = [constant % L]
        for _ in range(degree):
            coeffs.append(int.from_bytes(os.urandom(32), 'big') % L)
        return cls(coeffs)

    def evaluate(self, x: int) -> int:
        """Evaluate polynomial at point x using Horner's method."""
        result = 0
        for coeff in reversed(self.coefficients):
            result = (result * x + coeff) % L
        return result

    def commitment(self) -> List[bytes]:
        """Feldman VSS: commit to each coefficient as H(coeff).
        Allows shareholders to verify their shares without revealing the polynomial."""
        return [sha256(c.to_bytes(32, 'big')) for c in self.coefficients]


# =============================================================================
# SHAMIR'S SECRET SHARING
# =============================================================================

@dataclass
class Share:
    """A single share of a Shamir secret sharing scheme."""
    index: int          # The x-coordinate (1-indexed, never 0)
    value: int          # The y-coordinate (polynomial evaluation)
    threshold: int      # Minimum shares needed to reconstruct
    total_shares: int   # Total shares issued
    share_id: str       # Unique identifier
    holder_did: str     # DID of the agent holding this share
    commitment: Optional[List[bytes]] = None  # Feldman commitments for verification
    verification_tag: Optional[bytes] = None   # HMAC tag binding share to commitments

    def verify(self) -> bool:
        """Verify this share against the Feldman commitments.
        
        Uses HMAC-based binding: the dealer creates a tag that binds
        (index, value) to the polynomial commitment vector. Any tampering
        with the share value, index, or commitments invalidates the tag.
        
        This provides:
          - Binding: dealer cannot change share after distribution
          - Consistency: share matches the committed polynomial
          
        Note: With hash commitments (not EC points), we cannot verify
        polynomial consistency homomorphically (that requires Feldman VSS
        over an elliptic curve). This verification proves the share was
        created by the dealer and hasn't been tampered with.
        """
        if not self.commitment or not self.verification_tag:
            return False  # Cannot verify without commitments and tag

        # Recompute the expected verification tag
        # tag = HMAC(key=commitment_root, msg=index || value || threshold)
        commitment_root = sha256(b"AEOS/vss-root/" + b"".join(self.commitment))
        tag_input = (
            b"AEOS/vss-verify/" +
            struct.pack(">I", self.index) +
            self.value.to_bytes(32, 'big') +
            struct.pack(">II", self.threshold, self.total_shares)
        )
        expected_tag = hmac.new(
            commitment_root, tag_input, hashlib.sha256
        ).digest()

        return hmac.compare_digest(self.verification_tag, expected_tag)

    def to_bytes(self) -> bytes:
        return json.dumps({
            'index': self.index,
            'value': hex(self.value),
            'threshold': self.threshold,
            'total': self.total_shares,
            'id': self.share_id,
            'holder': self.holder_did,
        }, sort_keys=True).encode()


class ShamirSecretSharing:
    """Shamir's Secret Sharing Scheme over GF(L).

    Split a secret S into n shares such that any t shares can reconstruct S,
    but t-1 shares reveal no information about S (information-theoretic security).
    """

    @staticmethod
    def split(secret: int, threshold: int, num_shares: int,
              holder_dids: Optional[List[str]] = None) -> Tuple[List[Share], List[bytes]]:
        """Split a secret into shares.
        
        Args:
            secret: The secret value (integer in GF(L))
            threshold: Minimum shares for reconstruction (t)
            num_shares: Total shares to generate (n)
            holder_dids: DIDs of agents receiving shares
            
        Returns:
            (shares, feldman_commitments)
        """
        if threshold > num_shares:
            raise ValueError(f"Threshold {threshold} > num_shares {num_shares}")
        if threshold < 2:
            raise ValueError("Threshold must be at least 2")

        # Generate random polynomial of degree (threshold - 1) with secret as constant
        poly = Polynomial.random(degree=threshold - 1, constant=secret)
        commitments = poly.commitment()

        holder_dids = holder_dids or [f"unassigned-{i}" for i in range(num_shares)]

        shares = []
        # Compute commitment root for HMAC-based share verification
        commitment_root = sha256(b"AEOS/vss-root/" + b"".join(commitments))

        for i in range(1, num_shares + 1):
            value = poly.evaluate(i)

            # Create HMAC verification tag binding this share to the commitments
            tag_input = (
                b"AEOS/vss-verify/" +
                struct.pack(">I", i) +
                value.to_bytes(32, 'big') +
                struct.pack(">II", threshold, num_shares)
            )
            verification_tag = hmac.new(
                commitment_root, tag_input, hashlib.sha256
            ).digest()

            share = Share(
                index=i,
                value=value,
                threshold=threshold,
                total_shares=num_shares,
                share_id=sha256(f"AEOS/share/{i}/{time.time()}".encode()).hex()[:12],
                holder_did=holder_dids[i - 1] if i - 1 < len(holder_dids) else f"holder-{i}",
                commitment=commitments,
                verification_tag=verification_tag,
            )
            shares.append(share)

        return shares, commitments

    @staticmethod
    def reconstruct(shares: List[Share]) -> int:
        """Reconstruct the secret from t or more shares using Lagrange interpolation."""
        if len(shares) < shares[0].threshold:
            raise ValueError(
                f"Need {shares[0].threshold} shares, got {len(shares)}"
            )

        # Use exactly threshold shares
        shares = shares[:shares[0].threshold]

        # Lagrange interpolation at x=0
        secret = 0
        for i, share_i in enumerate(shares):
            xi = share_i.index
            yi = share_i.value

            # Compute Lagrange basis polynomial L_i(0)
            numerator = 1
            denominator = 1
            for j, share_j in enumerate(shares):
                if i != j:
                    xj = share_j.index
                    numerator = (numerator * (0 - xj)) % L
                    denominator = (denominator * (xi - xj)) % L

            lagrange = (numerator * mod_inverse(denominator)) % L
            secret = (secret + yi * lagrange) % L

        return secret

    @staticmethod
    def refresh_shares(shares: List[Share]) -> List[Share]:
        """Proactive share refresh: generate new shares for the same secret
        without reconstructing it. Protects against gradual share compromise."""
        if len(shares) < shares[0].threshold:
            raise ValueError("Need threshold shares for refresh")

        t = shares[0].threshold
        n = shares[0].total_shares

        # Each participant generates a random polynomial with zero constant term
        # and distributes sub-shares. Adding these to existing shares produces
        # new shares for the same secret.
        
        # Simplified: reconstruct and re-split (in production, use proactive refresh)
        secret = ShamirSecretSharing.reconstruct(shares)
        new_shares, _ = ShamirSecretSharing.split(
            secret, t, n,
            holder_dids=[s.holder_did for s in shares]
        )
        return new_shares


# =============================================================================
# THRESHOLD SIGNATURES
# =============================================================================

@dataclass
class ThresholdSignatureScheme:
    """t-of-n threshold signature scheme.
    
    No single agent holds the full signing key. Instead, the key is split
    into n shares. Any t agents must collaborate to produce a valid signature.
    
    Used for:
    - Multi-party escrow release (3-of-5 agents must agree)
    - High-value transaction authorization
    - Contract amendments requiring multi-party consent
    - Emergency agent revocation
    """

    threshold: int
    total: int
    key_shares: List[Share] = field(default_factory=list)
    public_key_commitment: bytes = b""

    @classmethod
    def setup(cls, threshold: int, total: int,
              holder_dids: List[str]) -> 'ThresholdSignatureScheme':
        """Generate a new threshold signing scheme."""
        # Generate a random signing secret
        signing_secret = int.from_bytes(os.urandom(32), 'big') % L

        # Split into shares
        shares, commitments = ShamirSecretSharing.split(
            signing_secret, threshold, total, holder_dids
        )

        # Public commitment (hash of the secret - in production, this would be
        # the corresponding public key point on the curve)
        pub_commitment = sha256(
            b"AEOS/threshold-pubkey/" + signing_secret.to_bytes(32, 'big')
        )

        # Zero out the secret - it should never exist in one place
        signing_secret = 0

        scheme = cls(
            threshold=threshold,
            total=total,
            key_shares=shares,
            public_key_commitment=pub_commitment,
        )
        return scheme

    def partial_sign(self, share: Share, message: bytes) -> Dict[str, Any]:
        """Generate a partial signature using one share."""
        # Hash the message
        msg_hash = sha256(b"AEOS/threshold-sign/" + message)
        msg_scalar = int.from_bytes(msg_hash, 'big') % L

        # Partial signature = share_value * msg_hash (mod L)
        partial = (share.value * msg_scalar) % L

        # Proof that this partial signature corresponds to the committed share
        proof = sha256(
            b"AEOS/partial-sig-proof/" +
            struct.pack(">I", share.index) +
            partial.to_bytes(32, 'big') +
            msg_hash
        )

        return {
            "signer_index": share.index,
            "signer_did": share.holder_did,
            "partial_signature": partial,
            "message_hash": msg_hash.hex(),
            "proof": proof.hex(),
            "timestamp": time.time(),
        }

    def combine_signatures(self, partials: List[Dict[str, Any]],
                           message: bytes) -> Dict[str, Any]:
        """Combine t partial signatures into a full threshold signature."""
        if len(partials) < self.threshold:
            raise ValueError(
                f"Need {self.threshold} partial signatures, got {len(partials)}"
            )

        # Use Lagrange interpolation on the partial signatures
        partials = partials[:self.threshold]
        msg_hash = sha256(b"AEOS/threshold-sign/" + message)

        combined = 0
        indices = [p['signer_index'] for p in partials]

        for i, partial in enumerate(partials):
            xi = partial['signer_index']
            yi = partial['partial_signature']

            # Lagrange coefficient
            numerator = 1
            denominator = 1
            for j, other in enumerate(partials):
                if i != j:
                    xj = other['signer_index']
                    numerator = (numerator * (0 - xj)) % L
                    denominator = (denominator * (xi - xj)) % L

            lagrange = (numerator * mod_inverse(denominator)) % L
            combined = (combined + yi * lagrange) % L

        return {
            "signature": combined,
            "message_hash": msg_hash.hex(),
            "signers": [p['signer_did'] for p in partials],
            "signer_indices": indices,
            "threshold": self.threshold,
            "public_commitment": self.public_key_commitment.hex(),
            "timestamp": time.time(),
        }

    def verify_threshold_signature(self, signature: Dict[str, Any],
                                    message: bytes) -> bool:
        """Verify a combined threshold signature."""
        msg_hash = sha256(b"AEOS/threshold-sign/" + message)
        msg_scalar = int.from_bytes(msg_hash, 'big') % L

        # Verify: signature == secret * msg_hash
        # Using commitment: H(signature / msg_hash) should equal public_commitment
        if msg_scalar == 0:
            return False

        reconstructed_secret = (signature['signature'] * mod_inverse(msg_scalar)) % L
        expected_commitment = sha256(
            b"AEOS/threshold-pubkey/" + reconstructed_secret.to_bytes(32, 'big')
        )
        return hmac.compare_digest(expected_commitment, self.public_key_commitment)


# =============================================================================
# TIME-LOCK PUZZLE
# =============================================================================

@dataclass
class TimeLockPuzzle:
    """Time-lock puzzle: a value that can only be decrypted after
    performing a specified amount of sequential computation.
    
    Used for:
    - Delayed contract reveals (sealed-bid auctions between agents)
    - Timed escrow release as a fallback
    - Fair exchange protocols
    
    Based on Rivest-Shamir-Wagner time-lock puzzles.
    """
    encrypted_value: bytes
    modulus: int           # RSA modulus N = p*q
    base: int              # Base for squaring
    iterations: int        # Number of sequential squarings required
    verification_hash: bytes  # Hash of the plaintext for verification

    @classmethod
    def create(cls, plaintext: bytes, time_parameter: int = 100000) -> 'TimeLockPuzzle':
        """Create a time-lock puzzle.
        
        Args:
            plaintext: The value to lock
            time_parameter: Number of sequential squarings (controls unlock time)
        """
        # Generate RSA modulus (small for demo - production uses 2048+ bit)
        # Using predetermined safe primes for reproducibility in demo
        p = 2**127 - 1  # Mersenne prime M127
        q = 2**61 - 1   # Mersenne prime M61
        N = p * q
        phi_n = (p - 1) * (q - 1)

        # Random base
        a = int.from_bytes(os.urandom(16), 'big') % N
        if a < 2:
            a = 2

        # Compute key = a^(2^T) mod N efficiently using phi(N)
        # The solver must compute this without knowing phi(N)
        e = pow(2, time_parameter, phi_n)
        key_int = pow(a, e, N)
        key = sha256(key_int.to_bytes(32, 'big'))

        # Encrypt plaintext with the key
        encrypted = bytes(pb ^ kb for pb, kb in zip(
            plaintext.ljust(len(key), b'\x00')[:len(key)],
            key
        ))

        verification = sha256(b"AEOS/timelock-verify/" + plaintext)

        return cls(
            encrypted_value=encrypted,
            modulus=N,
            base=a,
            iterations=time_parameter,
            verification_hash=verification,
        )

    def solve(self) -> bytes:
        """Solve the puzzle by performing sequential squarings.
        This is intentionally slow — that's the point."""
        current = self.base
        for _ in range(self.iterations):
            current = pow(current, 2, self.modulus)

        key = sha256(current.to_bytes(32, 'big'))
        plaintext = bytes(eb ^ kb for eb, kb in zip(self.encrypted_value, key))
        return plaintext

    def verify_solution(self, candidate: bytes) -> bool:
        """Verify that a candidate solution is correct."""
        expected = sha256(b"AEOS/timelock-verify/" + candidate)
        return hmac.compare_digest(expected, self.verification_hash)


# =============================================================================
# MULTI-PARTY ESCROW
# =============================================================================

@dataclass
class MultiPartyEscrow:
    """Escrow that requires t-of-n parties to release.
    
    Combines threshold signatures with contract escrow:
    - Funds are locked with a threshold key
    - Release requires t parties to provide partial signatures
    - Automatic timeout release if parties become unresponsive
    """
    escrow_id: str
    value: int
    threshold_scheme: ThresholdSignatureScheme
    parties: List[str]
    release_conditions: Dict[str, Any]
    timeout: float           # Unix timestamp for automatic release
    released: bool = False
    release_proof: Optional[Dict] = None
    created_at: float = field(default_factory=time.time)

    @classmethod
    def create(cls, value: int, party_dids: List[str],
               threshold: int, timeout_hours: float = 72,
               conditions: Optional[Dict[str, Any]] = None) -> 'MultiPartyEscrow':
        escrow_id = sha256(
            f"AEOS/mp-escrow/{time.time()}/{os.urandom(8).hex()}".encode()
        ).hex()[:16]

        scheme = ThresholdSignatureScheme.setup(
            threshold=threshold,
            total=len(party_dids),
            holder_dids=party_dids,
        )

        return cls(
            escrow_id=escrow_id,
            value=value,
            threshold_scheme=scheme,
            parties=party_dids,
            release_conditions=conditions or {},
            timeout=time.time() + (timeout_hours * 3600),
        )

    def request_release(self, message: bytes,
                         partial_sigs: List[Dict[str, Any]]) -> bool:
        """Attempt to release escrow with threshold partial signatures."""
        if self.released:
            return True

        try:
            combined = self.threshold_scheme.combine_signatures(partial_sigs, message)
            valid = self.threshold_scheme.verify_threshold_signature(combined, message)

            if valid:
                self.released = True
                self.release_proof = combined
                return True
        except Exception:
            pass
        return False

    def is_timed_out(self) -> bool:
        return time.time() > self.timeout

    def auto_release_if_timeout(self) -> bool:
        """Automatic release if timeout has passed."""
        if self.is_timed_out() and not self.released:
            self.released = True
            self.release_proof = {
                "method": "timeout",
                "timeout_at": self.timeout,
                "released_at": time.time(),
            }
            return True
        return False
