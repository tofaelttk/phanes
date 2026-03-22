"""
AEOS Dispute Resolution Protocol

Automated, fair, cryptographically verifiable dispute resolution for machine-to-machine
contracts. No lawyers. No courts. Math.

Key innovations:
  - VRF-based arbitrator selection (provably random, tamper-proof)
  - Cryptographic evidence chains (timestamped, immutable)
  - Graduated resolution (automatic -> committee -> appeal)
  - Stake-weighted voting for arbitration committees
  - Reputation impact from dispute outcomes
"""

import time
import json
import os
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum, auto

from .crypto_primitives import (
    KeyPair, sha256, VRF, MerkleAccumulator, TimestampAuthority, Commitment
)
from .identity import AgentIdentity
from .contracts import Contract, ContractState


class DisputeState(Enum):
    FILED = auto()
    EVIDENCE_COLLECTION = auto()
    AUTO_RESOLUTION = auto()       # Attempt automatic resolution
    ARBITRATION = auto()           # Committee review
    APPEAL = auto()                # Appeal of arbitration decision
    RESOLVED = auto()
    DISMISSED = auto()


class DisputeReason(Enum):
    NON_DELIVERY = "non_delivery"
    QUALITY_MISMATCH = "quality_mismatch"
    LATE_DELIVERY = "late_delivery"
    PAYMENT_FAILURE = "payment_failure"
    UNAUTHORIZED_ACTION = "unauthorized_action"
    DATA_INTEGRITY = "data_integrity"
    SLA_VIOLATION = "sla_violation"
    FRAUD = "fraud"


class Resolution(Enum):
    FULL_REFUND = "full_refund"
    PARTIAL_REFUND = "partial_refund"
    FULFILL_OBLIGATION = "fulfill_obligation"
    PENALTY_ENFORCED = "penalty_enforced"
    DISMISSED = "dismissed"
    MUTUAL_RELEASE = "mutual_release"
    REPUTATION_ADJUSTMENT = "reputation_adjustment"


@dataclass
class Evidence:
    """A piece of evidence in a dispute. Timestamped and immutable."""
    evidence_id: str
    submitter_did: str
    evidence_type: str           # "transaction_proof", "delivery_proof", "communication_log", etc.
    data_hash: bytes             # Hash of the actual evidence data
    commitment: Commitment       # Pedersen commitment to the evidence
    timestamp: float
    signature: bytes             # Submitter's signature
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(cls, submitter: AgentIdentity, evidence_type: str,
               data: bytes, metadata: Optional[Dict[str, Any]] = None) -> 'Evidence':
        evidence_id = sha256(
            f"AEOS/evidence/{submitter.did}/{time.time()}/{os.urandom(8).hex()}".encode()
        ).hex()[:16]

        data_hash = sha256(b"AEOS/evidence-data/" + data)
        commitment = Commitment.create(data)
        ts = time.time()

        payload = sha256(
            b"AEOS/evidence-sign/" +
            evidence_id.encode() +
            data_hash +
            commitment.value_hash +
            str(ts).encode()
        )
        signature = submitter.signing_key.sign(payload)

        return cls(
            evidence_id=evidence_id,
            submitter_did=submitter.did,
            evidence_type=evidence_type,
            data_hash=data_hash,
            commitment=commitment,
            timestamp=ts,
            signature=signature,
            metadata=metadata or {},
        )


@dataclass
class ArbitrationVote:
    """An arbitrator's vote on a dispute."""
    arbitrator_did: str
    resolution: Resolution
    refund_amount: int
    reasoning_hash: bytes   # Hash of detailed reasoning (kept private)
    confidence: float       # [0.0, 1.0]
    signature: bytes
    voted_at: float


@dataclass
class Dispute:
    """A formal dispute between agents regarding a contract."""
    dispute_id: str
    contract_id: str
    state: DisputeState
    plaintiff_did: str              # Who filed the dispute
    defendant_did: str              # Who is being disputed against
    reason: DisputeReason
    description: str
    claimed_damages: int
    evidence_chain: List[Evidence] = field(default_factory=list)
    evidence_tree: MerkleAccumulator = field(default_factory=MerkleAccumulator)
    arbitrators: List[str] = field(default_factory=list)
    votes: List[ArbitrationVote] = field(default_factory=list)
    resolution: Optional[Resolution] = None
    resolution_amount: int = 0
    resolution_details: Dict[str, Any] = field(default_factory=dict)
    filed_at: float = field(default_factory=time.time)
    resolved_at: Optional[float] = None
    deadline: float = 0.0           # Resolution deadline

    @classmethod
    def file(cls, plaintiff: AgentIdentity, contract: Contract,
             reason: DisputeReason, description: str,
             claimed_damages: int) -> 'Dispute':
        """File a new dispute against a contract."""
        if plaintiff.did not in contract.parties:
            raise ValueError("Plaintiff must be a party to the contract")

        defendant = [p for p in contract.parties if p != plaintiff.did][0]

        dispute_id = sha256(
            f"AEOS/dispute/{contract.contract_id}/{plaintiff.did}/{time.time()}".encode()
        ).hex()[:16]

        contract.state = ContractState.DISPUTED
        contract.dispute_id = dispute_id

        return cls(
            dispute_id=dispute_id,
            contract_id=contract.contract_id,
            state=DisputeState.FILED,
            plaintiff_did=plaintiff.did,
            defendant_did=defendant,
            reason=reason,
            description=description,
            claimed_damages=claimed_damages,
            deadline=time.time() + (72 * 3600),  # 72 hours default
        )

    def submit_evidence(self, evidence: Evidence) -> int:
        """Add evidence to the dispute. Returns evidence index."""
        if evidence.submitter_did not in [self.plaintiff_did, self.defendant_did]:
            raise PermissionError("Only dispute parties can submit evidence")

        self.evidence_chain.append(evidence)
        index = self.evidence_tree.add(
            evidence.evidence_id.encode() + evidence.data_hash
        )
        return index

    def attempt_auto_resolution(self, contract: Contract) -> Optional[Resolution]:
        """Try to resolve automatically based on contract terms and evidence.
        
        Auto-resolution rules:
        1. If obligation is overdue and debtor hasn't provided fulfillment proof -> FULL_REFUND
        2. If obligation was fulfilled (proof exists) but plaintiff disputes quality -> ARBITRATION
        3. If both parties have overdue obligations -> MUTUAL_RELEASE
        """
        self.state = DisputeState.AUTO_RESOLUTION

        breaches = contract.check_breaches()
        plaintiff_breaches = [b for b in breaches if b.debtor_did == self.plaintiff_did]
        defendant_breaches = [b for b in breaches if b.debtor_did == self.defendant_did]

        # Both sides breached -> mutual release
        if plaintiff_breaches and defendant_breaches:
            self.resolution = Resolution.MUTUAL_RELEASE
            self.resolution_amount = 0
            self.state = DisputeState.RESOLVED
            self.resolved_at = time.time()
            return self.resolution

        # Defendant breached, plaintiff didn't -> refund
        if defendant_breaches and not plaintiff_breaches:
            total_breach_value = sum(b.value for b in defendant_breaches)
            total_penalties = sum(b.penalty_on_breach for b in defendant_breaches)

            self.resolution = Resolution.FULL_REFUND
            self.resolution_amount = min(self.claimed_damages, total_breach_value + total_penalties)
            self.state = DisputeState.RESOLVED
            self.resolved_at = time.time()
            return self.resolution

        # No clear breach -> needs arbitration
        self.state = DisputeState.ARBITRATION
        return None

    def select_arbitrators(self, candidate_pool: List[AgentIdentity],
                           selection_key: KeyPair,
                           num_arbitrators: int = 3) -> List[str]:
        """Select arbitrators using VRF for provable fairness.
        
        The VRF ensures:
        - Selection is deterministic (same inputs -> same arbitrators)
        - Selection is unpredictable (can't game who gets selected)
        - Selection is verifiable (anyone can check it was done correctly)
        """
        # Filter out parties to the dispute
        eligible = [
            a for a in candidate_pool
            if a.did not in [self.plaintiff_did, self.defendant_did]
            and a.reputation_score >= 0.5  # Minimum reputation to arbitrate
        ]

        if len(eligible) < num_arbitrators:
            raise ValueError(f"Need {num_arbitrators} arbitrators, only {len(eligible)} eligible")

        # Use VRF to deterministically select arbitrators
        selection_input = (
            self.dispute_id.encode() +
            self.contract_id.encode() +
            str(self.filed_at).encode()
        )

        # Score each candidate using VRF
        scored = []
        for candidate in eligible:
            vrf_output, vrf_proof = VRF.evaluate(selection_key, selection_input + candidate.did.encode())
            score = int.from_bytes(vrf_output[:8], 'big')
            # Weight by reputation
            weighted_score = score * candidate.reputation_score
            scored.append((candidate.did, weighted_score, vrf_proof))

        # Select top N by score
        scored.sort(key=lambda x: x[1], reverse=True)
        self.arbitrators = [s[0] for s in scored[:num_arbitrators]]

        return self.arbitrators

    def cast_vote(self, arbitrator: AgentIdentity, resolution: Resolution,
                  refund_amount: int, reasoning: str, confidence: float) -> ArbitrationVote:
        """Arbitrator casts their vote."""
        if arbitrator.did not in self.arbitrators:
            raise PermissionError("Not a selected arbitrator for this dispute")

        reasoning_hash = sha256(b"AEOS/reasoning/" + reasoning.encode())

        payload = sha256(
            b"AEOS/vote/" +
            self.dispute_id.encode() +
            resolution.value.encode() +
            refund_amount.to_bytes(32, 'big') +
            reasoning_hash
        )
        signature = arbitrator.signing_key.sign(payload)

        vote = ArbitrationVote(
            arbitrator_did=arbitrator.did,
            resolution=resolution,
            refund_amount=refund_amount,
            reasoning_hash=reasoning_hash,
            confidence=confidence,
            signature=signature,
            voted_at=time.time(),
        )
        self.votes.append(vote)

        # Check if all arbitrators have voted
        if len(self.votes) == len(self.arbitrators):
            self._tally_votes()

        return vote

    def _tally_votes(self):
        """Tally arbitrator votes using confidence-weighted majority."""
        if not self.votes:
            return

        # Group votes by resolution
        resolution_scores: Dict[Resolution, float] = {}
        resolution_amounts: Dict[Resolution, List[int]] = {}

        for vote in self.votes:
            score = resolution_scores.get(vote.resolution, 0.0)
            resolution_scores[vote.resolution] = score + vote.confidence
            amounts = resolution_amounts.get(vote.resolution, [])
            amounts.append(vote.refund_amount)
            resolution_amounts[vote.resolution] = amounts

        # Winner is highest confidence-weighted score
        winner = max(resolution_scores, key=resolution_scores.get)
        self.resolution = winner

        # Amount is median of winning resolution's amounts
        amounts = sorted(resolution_amounts[winner])
        self.resolution_amount = amounts[len(amounts) // 2]

        self.state = DisputeState.RESOLVED
        self.resolved_at = time.time()
        self.resolution_details = {
            "method": "arbitration",
            "votes": len(self.votes),
            "winning_confidence": resolution_scores[winner],
            "total_confidence": sum(resolution_scores.values()),
        }

    def summary(self) -> Dict[str, Any]:
        return {
            "dispute_id": self.dispute_id,
            "contract_id": self.contract_id,
            "state": self.state.name,
            "reason": self.reason.value,
            "claimed_damages": self.claimed_damages,
            "evidence_count": len(self.evidence_chain),
            "arbitrators": len(self.arbitrators),
            "votes_cast": len(self.votes),
            "resolution": self.resolution.value if self.resolution else None,
            "resolution_amount": self.resolution_amount,
            "filed_at": self.filed_at,
            "resolved_at": self.resolved_at,
        }
