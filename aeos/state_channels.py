"""
AEOS State Channels

Off-chain bilateral payment/interaction channels for high-frequency agent operations.
Agents can exchange thousands of micro-transactions per second off-chain,
then settle the net result on-chain in a single transaction.

Architecture:
  1. OPEN: Both agents lock collateral on-chain (in ledger)
  2. TRANSACT: Exchange signed state updates off-chain (instant, free)
  3. CLOSE: Submit final state to chain; collateral redistributed

Dispute mechanism:
  - Either party can submit the latest signed state to force-close
  - Challenge period allows the other party to submit a newer state
  - Newest valid state (by sequence number) wins

This enables:
  - Micropayments (agent pays per API call, per token, per byte)
  - Real-time streaming payments (pay-as-you-consume)
  - High-frequency data exchange with per-item payment
"""

import time
import json
import os
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple

from .crypto_primitives import sha256, KeyPair


@dataclass
class ChannelState:
    """A signed state update within a channel.
    
    Each state has a sequence number. Only the highest-sequence
    state signed by both parties is considered valid.
    """
    channel_id: str
    sequence: int
    balance_a: int            # Agent A's balance
    balance_b: int            # Agent B's balance
    nonce: bytes              # Random nonce for replay protection
    timestamp: float
    signature_a: Optional[bytes] = None
    signature_b: Optional[bytes] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def state_hash(self) -> bytes:
        """Deterministic hash of this state (what gets signed)."""
        payload = json.dumps({
            'channel': self.channel_id,
            'seq': self.sequence,
            'bal_a': self.balance_a,
            'bal_b': self.balance_b,
            'nonce': self.nonce.hex(),
            'ts': self.timestamp,
        }, sort_keys=True, separators=(',', ':')).encode()
        return sha256(b"AEOS/channel-state/" + payload)

    def is_fully_signed(self) -> bool:
        return self.signature_a is not None and self.signature_b is not None

    @property
    def total(self) -> int:
        return self.balance_a + self.balance_b

    def to_bytes(self) -> bytes:
        return json.dumps({
            'channel': self.channel_id,
            'seq': self.sequence,
            'bal_a': self.balance_a,
            'bal_b': self.balance_b,
            'ts': self.timestamp,
            'signed': self.is_fully_signed(),
        }, sort_keys=True).encode()


@dataclass
class StateChannel:
    """A bilateral state channel between two agents."""
    channel_id: str
    agent_a_did: str
    agent_b_did: str
    agent_a_key: KeyPair
    agent_b_key: KeyPair
    initial_deposit_a: int
    initial_deposit_b: int
    states: List[ChannelState] = field(default_factory=list)
    is_open: bool = True
    opened_at: float = field(default_factory=time.time)
    closed_at: Optional[float] = None
    challenge_period: float = 3600  # 1 hour challenge period
    challenged_at: Optional[float] = None
    challenged_state: Optional[ChannelState] = None

    @classmethod
    def open(cls, agent_a_did: str, agent_b_did: str,
             agent_a_key: KeyPair, agent_b_key: KeyPair,
             deposit_a: int, deposit_b: int) -> 'StateChannel':
        """Open a new state channel with initial deposits."""
        channel_id = sha256(
            f"AEOS/channel/{agent_a_did}/{agent_b_did}/{time.time()}/{os.urandom(8).hex()}".encode()
        ).hex()[:20]

        channel = cls(
            channel_id=channel_id,
            agent_a_did=agent_a_did,
            agent_b_did=agent_b_did,
            agent_a_key=agent_a_key,
            agent_b_key=agent_b_key,
            initial_deposit_a=deposit_a,
            initial_deposit_b=deposit_b,
        )

        # Create and sign initial state
        initial_state = ChannelState(
            channel_id=channel_id,
            sequence=0,
            balance_a=deposit_a,
            balance_b=deposit_b,
            nonce=os.urandom(16),
            timestamp=time.time(),
        )

        sh = initial_state.state_hash()
        initial_state.signature_a = agent_a_key.sign(sh)
        initial_state.signature_b = agent_b_key.sign(sh)
        channel.states.append(initial_state)

        return channel

    @property
    def latest_state(self) -> ChannelState:
        return self.states[-1]

    @property
    def total_locked(self) -> int:
        return self.initial_deposit_a + self.initial_deposit_b

    def transact(self, from_a_to_b: int) -> ChannelState:
        """Create a new state update transferring value within the channel.
        
        Positive from_a_to_b means A pays B.
        Negative means B pays A.
        
        This is the core operation — called thousands of times off-chain.
        Each call is essentially free and instant.
        """
        if not self.is_open:
            raise ValueError("Channel is closed")

        prev = self.latest_state
        new_balance_a = prev.balance_a - from_a_to_b
        new_balance_b = prev.balance_b + from_a_to_b

        if new_balance_a < 0 or new_balance_b < 0:
            raise ValueError(
                f"Insufficient balance: A={prev.balance_a}, B={prev.balance_b}, "
                f"transfer={from_a_to_b}"
            )

        new_state = ChannelState(
            channel_id=self.channel_id,
            sequence=prev.sequence + 1,
            balance_a=new_balance_a,
            balance_b=new_balance_b,
            nonce=os.urandom(16),
            timestamp=time.time(),
        )

        # Both parties sign the new state
        sh = new_state.state_hash()
        new_state.signature_a = self.agent_a_key.sign(sh)
        new_state.signature_b = self.agent_b_key.sign(sh)

        self.states.append(new_state)
        return new_state

    def cooperative_close(self) -> Dict[str, Any]:
        """Both parties agree to close. Instant settlement."""
        if not self.is_open:
            raise ValueError("Channel already closed")

        final = self.latest_state
        self.is_open = False
        self.closed_at = time.time()

        return {
            'channel_id': self.channel_id,
            'method': 'cooperative',
            'final_sequence': final.sequence,
            'settlement_a': final.balance_a,
            'settlement_b': final.balance_b,
            'total_transactions': len(self.states) - 1,
            'duration_seconds': self.closed_at - self.opened_at,
            'throughput': (len(self.states) - 1) / max(self.closed_at - self.opened_at, 0.001),
        }

    def force_close(self, submitter: str, state: ChannelState) -> Dict[str, Any]:
        """Unilateral close — submitter posts their latest signed state.
        Starts challenge period where the other party can submit a newer state."""
        if not self.is_open:
            raise ValueError("Channel already closed")
        if submitter not in [self.agent_a_did, self.agent_b_did]:
            raise ValueError("Only channel parties can force-close")
        if not state.is_fully_signed():
            raise ValueError("State must be signed by both parties")

        self.challenged_at = time.time()
        self.challenged_state = state

        return {
            'channel_id': self.channel_id,
            'method': 'force_close_initiated',
            'submitted_sequence': state.sequence,
            'challenge_deadline': self.challenged_at + self.challenge_period,
            'submitter': submitter,
        }

    def respond_to_challenge(self, responder: str,
                              state: ChannelState) -> Dict[str, Any]:
        """Respond to a force-close with a newer state."""
        if not self.challenged_at:
            raise ValueError("No active challenge")
        if time.time() > self.challenged_at + self.challenge_period:
            raise ValueError("Challenge period expired")
        if not state.is_fully_signed():
            raise ValueError("State must be signed by both parties")
        if state.sequence <= self.challenged_state.sequence:
            raise ValueError("Must submit a newer state (higher sequence)")

        self.challenged_state = state
        return {
            'channel_id': self.channel_id,
            'method': 'challenge_responded',
            'new_sequence': state.sequence,
            'responder': responder,
        }

    def finalize_close(self) -> Dict[str, Any]:
        """Finalize a force-close after challenge period expires."""
        if not self.challenged_at:
            raise ValueError("No active challenge")
        if time.time() < self.challenged_at + self.challenge_period:
            remaining = (self.challenged_at + self.challenge_period) - time.time()
            raise ValueError(f"Challenge period: {remaining:.0f}s remaining")

        final = self.challenged_state
        self.is_open = False
        self.closed_at = time.time()

        return {
            'channel_id': self.channel_id,
            'method': 'force_close_finalized',
            'final_sequence': final.sequence,
            'settlement_a': final.balance_a,
            'settlement_b': final.balance_b,
        }

    def stats(self) -> Dict[str, Any]:
        latest = self.latest_state
        return {
            'channel_id': self.channel_id,
            'is_open': self.is_open,
            'total_states': len(self.states),
            'current_balance_a': latest.balance_a,
            'current_balance_b': latest.balance_b,
            'total_locked': self.total_locked,
            'net_transfer_a_to_b': self.initial_deposit_a - latest.balance_a,
            'age_seconds': time.time() - self.opened_at,
        }
