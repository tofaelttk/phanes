"""
AEOS Immutable Ledger

Append-only, Merkle-proven audit trail for every action in the agent economy.
Every identity creation, contract, transaction, dispute, and delegation
is recorded here with cryptographic proof of ordering and integrity.

In production: this would be a distributed ledger (BFT consensus).
This implementation provides the same cryptographic guarantees locally.
"""

import time
import json
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum, auto

from .crypto_primitives import (
    sha256, MerkleAccumulator, MerkleProof, KeyPair, TimestampAuthority
)


class EventType(Enum):
    AGENT_REGISTERED = "agent_registered"
    AGENT_REVOKED = "agent_revoked"
    CONTRACT_CREATED = "contract_created"
    CONTRACT_SIGNED = "contract_signed"
    CONTRACT_ACTIVATED = "contract_activated"
    CONTRACT_COMPLETED = "contract_completed"
    CONTRACT_TERMINATED = "contract_terminated"
    OBLIGATION_FULFILLED = "obligation_fulfilled"
    DELEGATION_CREATED = "delegation_created"
    DELEGATION_REVOKED = "delegation_revoked"
    DISPUTE_FILED = "dispute_filed"
    DISPUTE_RESOLVED = "dispute_resolved"
    EVIDENCE_SUBMITTED = "evidence_submitted"
    TRANSACTION_APPROVED = "transaction_approved"
    TRANSACTION_REJECTED = "transaction_rejected"
    RISK_ALERT = "risk_alert"
    CIRCUIT_BREAKER_TRIPPED = "circuit_breaker_tripped"
    INSURANCE_CLAIM = "insurance_claim"
    REPUTATION_UPDATED = "reputation_updated"


@dataclass
class LedgerEntry:
    """A single immutable entry in the ledger."""
    entry_id: str
    sequence: int
    event_type: EventType
    timestamp: float
    actor_did: str                     # Who caused this event
    subject_did: Optional[str]         # Who/what is affected
    data_hash: bytes                   # Hash of the event data
    prev_hash: bytes                   # Hash of previous entry (chain)
    signature: bytes                   # Actor's signature on this entry
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_bytes(self) -> bytes:
        return json.dumps({
            'id': self.entry_id,
            'seq': self.sequence,
            'type': self.event_type.value,
            'ts': self.timestamp,
            'actor': self.actor_did,
            'subject': self.subject_did,
            'data': self.data_hash.hex(),
            'prev': self.prev_hash.hex(),
        }, sort_keys=True, separators=(',', ':')).encode()

    def verify_chain(self, prev_entry: Optional['LedgerEntry']) -> bool:
        """Verify this entry correctly chains from the previous one."""
        if prev_entry is None:
            return self.prev_hash == sha256(b"AEOS/genesis")
        expected_prev = sha256(prev_entry.to_bytes())
        return expected_prev == self.prev_hash


class Ledger:
    """The immutable audit trail for the entire AEOS protocol."""

    def __init__(self, authority_key: Optional[KeyPair] = None):
        self.entries: List[LedgerEntry] = []
        self.accumulator = MerkleAccumulator()
        self.authority = TimestampAuthority(
            authority_key or KeyPair.generate(purpose="ledger-authority")
        )
        self._genesis_hash = sha256(b"AEOS/genesis")
        self._event_index: Dict[str, List[int]] = {}  # event_type -> [indices]
        self._actor_index: Dict[str, List[int]] = {}   # actor_did -> [indices]

    def append(self, event_type: EventType, actor: Any,
               subject_did: Optional[str] = None,
               data: Optional[bytes] = None,
               metadata: Optional[Dict[str, Any]] = None) -> LedgerEntry:
        """Append an event to the ledger. Returns the entry."""
        seq = len(self.entries)
        data = data or b""
        data_hash = sha256(b"AEOS/ledger-data/" + data)

        prev_hash = self._genesis_hash
        if self.entries:
            prev_hash = sha256(self.entries[-1].to_bytes())

        ts = time.time()
        entry_id = sha256(
            f"AEOS/entry/{seq}/{ts}".encode()
        ).hex()[:16]

        # Sign the entry
        sign_payload = sha256(
            b"AEOS/ledger-sign/" +
            entry_id.encode() +
            event_type.value.encode() +
            data_hash +
            prev_hash
        )
        signature = actor.signing_key.sign(sign_payload)

        entry = LedgerEntry(
            entry_id=entry_id,
            sequence=seq,
            event_type=event_type,
            timestamp=ts,
            actor_did=actor.did,
            subject_did=subject_did,
            data_hash=data_hash,
            prev_hash=prev_hash,
            signature=signature,
            metadata=metadata or {},
        )

        self.entries.append(entry)
        self.accumulator.add(entry.to_bytes())

        # Update indices
        et = event_type.value
        if et not in self._event_index:
            self._event_index[et] = []
        self._event_index[et].append(seq)

        if actor.did not in self._actor_index:
            self._actor_index[actor.did] = []
        self._actor_index[actor.did].append(seq)

        return entry

    def prove_entry(self, index: int) -> MerkleProof:
        """Generate Merkle proof that an entry exists in the ledger."""
        return self.accumulator.prove(index)

    def verify_chain_integrity(self) -> Tuple[bool, Optional[int]]:
        """Verify the entire chain is intact. Returns (valid, first_bad_index)."""
        for i, entry in enumerate(self.entries):
            prev = self.entries[i-1] if i > 0 else None
            if not entry.verify_chain(prev):
                return False, i
        return True, None

    def get_agent_history(self, agent_did: str) -> List[LedgerEntry]:
        """Get all ledger entries involving an agent."""
        indices = self._actor_index.get(agent_did, [])
        return [self.entries[i] for i in indices]

    def get_events_by_type(self, event_type: EventType) -> List[LedgerEntry]:
        indices = self._event_index.get(event_type.value, [])
        return [self.entries[i] for i in indices]

    @property
    def root(self) -> bytes:
        return self.accumulator.root

    @property
    def length(self) -> int:
        return len(self.entries)

    def stats(self) -> Dict[str, Any]:
        event_counts = {}
        for et, indices in self._event_index.items():
            event_counts[et] = len(indices)
        return {
            "total_entries": self.length,
            "ledger_root": self.root.hex(),
            "unique_actors": len(self._actor_index),
            "event_counts": event_counts,
            "chain_valid": self.verify_chain_integrity()[0],
        }
