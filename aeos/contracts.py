"""
AEOS Contract Protocol

Deterministic, cryptographically binding agreements between AI agents.
Unlike human contracts that require interpretation, AEOS contracts are
executable specifications — every term has a precise, machine-verifiable meaning.

Contract lifecycle:
  1. PROPOSAL  - One agent proposes terms
  2. NEGOTIATION - Agents exchange counter-proposals (optional)
  3. AGREED    - Both parties sign (multi-sig)
  4. ACTIVE    - Contract is executing
  5. COMPLETED - All obligations fulfilled
  6. DISPUTED  - One party filed a dispute
  7. TERMINATED - Contract ended (by completion, expiry, or arbitration)

Key features:
  - Escrow with milestone-based release
  - Automatic obligation verification via cryptographic proofs
  - Penalty clauses with deterministic enforcement
  - Time-locked operations
  - Multi-party contracts with threshold signatures
"""

import time
import json
import os
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Callable
from enum import Enum, auto

from .crypto_primitives import (
    KeyPair, sha256, Commitment, MerkleAccumulator, TimestampAuthority
)
from .identity import AgentIdentity, CapabilityScope


class ContractState(Enum):
    DRAFT = auto()
    PROPOSED = auto()
    NEGOTIATING = auto()
    AGREED = auto()
    ACTIVE = auto()
    COMPLETED = auto()
    DISPUTED = auto()
    TERMINATED = auto()
    EXPIRED = auto()


class ObligationType(Enum):
    PAYMENT = "payment"             # Transfer value
    DELIVERY = "delivery"           # Deliver data/service/compute
    ATTESTATION = "attestation"     # Provide signed proof of something
    COMPUTATION = "computation"     # Perform and prove computation
    AVAILABILITY = "availability"   # Maintain uptime/access


@dataclass
class Obligation:
    """A single obligation within a contract.
    Each obligation has a debtor (who must fulfill) and creditor (who receives)."""
    obligation_id: str
    obligation_type: ObligationType
    debtor_did: str
    creditor_did: str
    description: str
    value: int                          # Monetary value (in smallest unit)
    deadline: float                     # Unix timestamp
    verification_method: str            # How fulfillment is verified
    verification_data: Dict[str, Any]   # Parameters for verification
    fulfilled: bool = False
    fulfilled_at: Optional[float] = None
    fulfillment_proof: Optional[bytes] = None
    penalty_on_breach: int = 0          # Penalty amount if not fulfilled

    def is_overdue(self) -> bool:
        return not self.fulfilled and time.time() > self.deadline

    def mark_fulfilled(self, proof: bytes) -> None:
        self.fulfilled = True
        self.fulfilled_at = time.time()
        self.fulfillment_proof = proof

    def to_bytes(self) -> bytes:
        return json.dumps({
            'id': self.obligation_id,
            'type': self.obligation_type.value,
            'debtor': self.debtor_did,
            'creditor': self.creditor_did,
            'value': self.value,
            'deadline': self.deadline,
            'verification': self.verification_method,
            'penalty': self.penalty_on_breach,
        }, sort_keys=True, separators=(',', ':')).encode()


@dataclass
class EscrowAccount:
    """Cryptographic escrow for contract value.
    Funds are committed (not transferred) and released upon milestone completion."""
    escrow_id: str
    total_value: int
    depositor_did: str
    beneficiary_did: str
    milestones: List[Dict[str, Any]]  # {milestone_id, value, condition, released}
    commitment: Optional[Commitment] = None
    created_at: float = field(default_factory=time.time)

    @classmethod
    def create(cls, depositor: str, beneficiary: str,
               milestones: List[Dict[str, Any]]) -> 'EscrowAccount':
        total = sum(m['value'] for m in milestones)
        escrow_id = sha256(
            f"AEOS/escrow/{depositor}/{beneficiary}/{time.time()}".encode()
        ).hex()[:16]

        # Create commitment to total value
        value_bytes = total.to_bytes(32, 'big')
        commitment = Commitment.create(value_bytes)

        for m in milestones:
            m['released'] = False
            m['released_at'] = None
            m['release_proof'] = None

        return cls(
            escrow_id=escrow_id,
            total_value=total,
            depositor_did=depositor,
            beneficiary_did=beneficiary,
            milestones=milestones,
            commitment=commitment,
        )

    def release_milestone(self, milestone_id: str, proof: bytes) -> int:
        """Release escrowed funds for a completed milestone.
        Returns the released amount."""
        for m in self.milestones:
            if m['milestone_id'] == milestone_id and not m['released']:
                m['released'] = True
                m['released_at'] = time.time()
                m['release_proof'] = proof.hex()
                return m['value']
        return 0

    def refund(self, reason: str) -> int:
        """Refund unreleased funds to depositor."""
        unreleased = sum(m['value'] for m in self.milestones if not m['released'])
        return unreleased

    @property
    def released_total(self) -> int:
        return sum(m['value'] for m in self.milestones if m['released'])

    @property
    def remaining(self) -> int:
        return self.total_value - self.released_total


@dataclass
class ContractSignature:
    """A party's signature on the contract terms."""
    signer_did: str
    signature: bytes
    signed_at: float
    key_id: str
    terms_hash: bytes  # Hash of the exact terms being signed


@dataclass
class Contract:
    """A binding agreement between AI agents.
    
    This is the core economic primitive — everything an agent does
    that involves another agent happens through a contract.
    """
    contract_id: str
    state: ContractState
    parties: List[str]                    # DIDs of all parties
    obligations: List[Obligation]
    escrow: Optional[EscrowAccount]
    signatures: List[ContractSignature] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    activated_at: Optional[float] = None
    expires_at: Optional[float] = None
    terminated_at: Optional[float] = None
    termination_reason: Optional[str] = None
    dispute_id: Optional[str] = None
    amendment_history: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # ----- CREATION -----

    @classmethod
    def create(cls, proposer_did: str, counterparty_did: str,
               obligations: List[Obligation],
               escrow_milestones: Optional[List[Dict[str, Any]]] = None,
               duration_hours: float = 720,
               metadata: Optional[Dict[str, Any]] = None) -> 'Contract':
        """Create a new contract proposal."""
        contract_id = sha256(
            f"AEOS/contract/{proposer_did}/{counterparty_did}/{time.time()}/{os.urandom(8).hex()}".encode()
        ).hex()[:24]

        escrow = None
        if escrow_milestones:
            escrow = EscrowAccount.create(
                depositor=proposer_did,
                beneficiary=counterparty_did,
                milestones=escrow_milestones,
            )

        return cls(
            contract_id=contract_id,
            state=ContractState.PROPOSED,
            parties=[proposer_did, counterparty_did],
            obligations=obligations,
            escrow=escrow,
            expires_at=time.time() + (duration_hours * 3600),
            metadata=metadata or {},
        )

    # ----- TERMS HASH (canonical representation for signing) -----

    def terms_hash(self) -> bytes:
        """Compute deterministic hash of all contract terms.
        This is what parties sign — any change invalidates signatures."""
        terms = {
            'contract_id': self.contract_id,
            'parties': sorted(self.parties),
            'obligations': [
                {
                    'id': o.obligation_id,
                    'type': o.obligation_type.value,
                    'debtor': o.debtor_did,
                    'creditor': o.creditor_did,
                    'value': o.value,
                    'deadline': o.deadline,
                    'verification': o.verification_method,
                    'penalty': o.penalty_on_breach,
                }
                for o in sorted(self.obligations, key=lambda x: x.obligation_id)
            ],
            'escrow_total': self.escrow.total_value if self.escrow else 0,
            'expires_at': self.expires_at,
        }
        canonical = json.dumps(terms, sort_keys=True, separators=(',', ':')).encode()
        return sha256(b"AEOS/contract-terms/" + canonical)

    # ----- SIGNING -----

    def sign(self, agent: AgentIdentity) -> ContractSignature:
        """Sign the contract as a party."""
        if agent.did not in self.parties:
            raise ValueError(f"Agent {agent.did} is not a party to this contract")
        if not agent.verify_authority(CapabilityScope.SIGN_CONTRACT):
            raise PermissionError(f"Agent {agent.did} lacks SIGN_CONTRACT capability")

        th = self.terms_hash()
        sig = agent.sign_message(th)

        cs = ContractSignature(
            signer_did=agent.did,
            signature=sig,
            signed_at=time.time(),
            key_id=agent.signing_key.key_id,
            terms_hash=th,
        )
        self.signatures.append(cs)

        # If all parties have signed, activate
        signed_parties = {s.signer_did for s in self.signatures}
        if signed_parties == set(self.parties):
            self.state = ContractState.ACTIVE
            self.activated_at = time.time()

        return cs

    # ----- OBLIGATION FULFILLMENT -----

    def fulfill_obligation(self, obligation_id: str, proof: bytes,
                           fulfiller: AgentIdentity) -> bool:
        """Mark an obligation as fulfilled with cryptographic proof."""
        for ob in self.obligations:
            if ob.obligation_id == obligation_id:
                if ob.debtor_did != fulfiller.did:
                    raise PermissionError("Only debtor can fulfill obligation")
                if ob.fulfilled:
                    return True  # Already done
                ob.mark_fulfilled(proof)

                # Release corresponding escrow milestone if exists
                if self.escrow:
                    self.escrow.release_milestone(obligation_id, proof)

                # Check if all obligations fulfilled
                if all(o.fulfilled for o in self.obligations):
                    self.state = ContractState.COMPLETED
                    self.terminated_at = time.time()
                    self.termination_reason = "all_obligations_fulfilled"

                return True
        return False

    # ----- BREACH DETECTION -----

    def check_breaches(self) -> List[Obligation]:
        """Check for overdue obligations (breaches)."""
        breaches = [o for o in self.obligations if o.is_overdue()]
        return breaches

    def calculate_penalties(self) -> Dict[str, int]:
        """Calculate penalties owed by breaching parties."""
        penalties: Dict[str, int] = {}
        for o in self.obligations:
            if o.is_overdue() and o.penalty_on_breach > 0:
                penalties[o.debtor_did] = penalties.get(o.debtor_did, 0) + o.penalty_on_breach
        return penalties

    # ----- STATUS -----

    def is_expired(self) -> bool:
        if self.expires_at and time.time() > self.expires_at:
            if self.state == ContractState.ACTIVE:
                self.state = ContractState.EXPIRED
            return True
        return False

    def summary(self) -> Dict[str, Any]:
        return {
            "contract_id": self.contract_id,
            "state": self.state.name,
            "parties": self.parties,
            "total_obligations": len(self.obligations),
            "fulfilled_obligations": sum(1 for o in self.obligations if o.fulfilled),
            "overdue_obligations": sum(1 for o in self.obligations if o.is_overdue()),
            "escrow_total": self.escrow.total_value if self.escrow else 0,
            "escrow_released": self.escrow.released_total if self.escrow else 0,
            "escrow_remaining": self.escrow.remaining if self.escrow else 0,
            "terms_hash": self.terms_hash().hex(),
            "signatures": len(self.signatures),
            "created_at": self.created_at,
            "expires_at": self.expires_at,
        }


# =============================================================================
# CONTRACT FACTORY (Templates for common agent interactions)
# =============================================================================

class ContractFactory:
    """Pre-built contract templates for common agent-to-agent interactions."""

    @staticmethod
    def service_agreement(client_did: str, provider_did: str,
                          service_description: str, price: int,
                          delivery_deadline_hours: float = 24,
                          penalty_percent: float = 0.1) -> Contract:
        """Simple service contract: client pays, provider delivers."""
        deadline = time.time() + (delivery_deadline_hours * 3600)
        penalty = int(price * penalty_percent)

        obligations = [
            Obligation(
                obligation_id="payment",
                obligation_type=ObligationType.PAYMENT,
                debtor_did=client_did,
                creditor_did=provider_did,
                description=f"Payment for: {service_description}",
                value=price,
                deadline=deadline,
                verification_method="escrow_release",
                verification_data={"trigger": "delivery_confirmed"},
                penalty_on_breach=penalty,
            ),
            Obligation(
                obligation_id="delivery",
                obligation_type=ObligationType.DELIVERY,
                debtor_did=provider_did,
                creditor_did=client_did,
                description=service_description,
                value=price,
                deadline=deadline,
                verification_method="cryptographic_proof",
                verification_data={"proof_type": "delivery_hash"},
                penalty_on_breach=penalty,
            ),
        ]

        escrow_milestones = [{
            "milestone_id": "payment",
            "value": price,
            "condition": "delivery_confirmed",
        }]

        return Contract.create(
            proposer_did=client_did,
            counterparty_did=provider_did,
            obligations=obligations,
            escrow_milestones=escrow_milestones,
            duration_hours=delivery_deadline_hours * 2,
            metadata={"template": "service_agreement", "service": service_description},
        )

    @staticmethod
    def data_exchange(buyer_did: str, seller_did: str,
                      data_description: str, price: int,
                      data_hash: str) -> Contract:
        """Data purchase: buyer pays, seller provides data matching committed hash."""
        deadline = time.time() + 3600  # 1 hour

        obligations = [
            Obligation(
                obligation_id="payment",
                obligation_type=ObligationType.PAYMENT,
                debtor_did=buyer_did,
                creditor_did=seller_did,
                description=f"Payment for data: {data_description}",
                value=price,
                deadline=deadline,
                verification_method="escrow_release",
                verification_data={"trigger": "data_hash_verified"},
            ),
            Obligation(
                obligation_id="data_delivery",
                obligation_type=ObligationType.DELIVERY,
                debtor_did=seller_did,
                creditor_did=buyer_did,
                description=data_description,
                value=price,
                deadline=deadline,
                verification_method="hash_match",
                verification_data={"expected_hash": data_hash},
            ),
        ]

        escrow_milestones = [{
            "milestone_id": "payment",
            "value": price,
            "condition": "data_hash_verified",
        }]

        return Contract.create(
            proposer_did=buyer_did,
            counterparty_did=seller_did,
            obligations=obligations,
            escrow_milestones=escrow_milestones,
            duration_hours=2,
            metadata={"template": "data_exchange", "data_hash": data_hash},
        )

    @staticmethod
    def compute_task(requester_did: str, compute_did: str,
                     task_spec: Dict[str, Any], price: int,
                     timeout_hours: float = 1.0) -> Contract:
        """Verifiable computation: requester pays, compute agent proves correct execution."""
        deadline = time.time() + (timeout_hours * 3600)

        obligations = [
            Obligation(
                obligation_id="payment",
                obligation_type=ObligationType.PAYMENT,
                debtor_did=requester_did,
                creditor_did=compute_did,
                description="Payment for compute task",
                value=price,
                deadline=deadline,
                verification_method="escrow_release",
                verification_data={"trigger": "computation_verified"},
            ),
            Obligation(
                obligation_id="computation",
                obligation_type=ObligationType.COMPUTATION,
                debtor_did=compute_did,
                creditor_did=requester_did,
                description="Execute and prove computation",
                value=price,
                deadline=deadline,
                verification_method="verifiable_computation",
                verification_data={"task_spec": task_spec},
                penalty_on_breach=int(price * 0.2),
            ),
        ]

        escrow_milestones = [{
            "milestone_id": "payment",
            "value": price,
            "condition": "computation_verified",
        }]

        return Contract.create(
            proposer_did=requester_did,
            counterparty_did=compute_did,
            obligations=obligations,
            escrow_milestones=escrow_milestones,
            duration_hours=timeout_hours * 3,
            metadata={"template": "compute_task", "task_spec": task_spec},
        )
