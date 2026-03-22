"""
AEOS Tokenization Engine

Programmable value representation for the agent economy. Not cryptocurrency —
these are programmable economic primitives with embedded logic.

Token Types:
  - Authority Tokens: Represent fractional delegation of economic authority
  - Reputation Tokens: Non-transferable, earned through behavior, stakeable
  - Service Credits: Prepaid compute/data/API access with programmatic redemption
  - Escrow Tokens: Represent locked value with conditional release logic
  - Insurance Tokens: Represent coverage with premium/claim mechanics

Each token carries embedded logic (a "policy") that governs:
  - Who can transfer it
  - Under what conditions it can be redeemed
  - How it decays or accrues over time
  - What happens when it expires
"""

import time
import os
import json
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Callable
from enum import Enum, auto

from .crypto_primitives import sha256, KeyPair, Commitment


class TokenType(Enum):
    AUTHORITY = "authority"
    REPUTATION = "reputation"
    SERVICE_CREDIT = "service_credit"
    ESCROW = "escrow"
    INSURANCE = "insurance"
    GOVERNANCE = "governance"


class TokenState(Enum):
    ACTIVE = auto()
    LOCKED = auto()
    REDEEMED = auto()
    EXPIRED = auto()
    BURNED = auto()


@dataclass
class TokenPolicy:
    """Embedded logic governing token behavior.
    
    This is the programmable part — rules that execute automatically.
    """
    transferable: bool = True
    divisible: bool = True
    min_divisible_unit: int = 1
    max_holders: int = 0                # 0 = unlimited
    expires_at: Optional[float] = None
    decay_rate: float = 0.0             # Fraction lost per day (for reputation)
    accrual_rate: float = 0.0           # Fraction gained per day (for staked tokens)
    requires_kyc: bool = False
    geographic_restrictions: List[str] = field(default_factory=list)
    min_reputation_to_hold: float = 0.0
    max_per_holder: int = 0             # 0 = unlimited
    redemption_conditions: Dict[str, Any] = field(default_factory=dict)
    auto_burn_on_dispute_loss: bool = False
    vesting_schedule: List[Dict[str, Any]] = field(default_factory=list)

    def is_expired(self) -> bool:
        return self.expires_at is not None and time.time() > self.expires_at

    def current_decay_factor(self, created_at: float) -> float:
        """Compute current value after decay."""
        if self.decay_rate == 0:
            return 1.0
        days = (time.time() - created_at) / 86400
        return max(0, (1 - self.decay_rate) ** days)

    def current_accrual_factor(self, staked_at: float) -> float:
        """Compute accrued value from staking."""
        if self.accrual_rate == 0:
            return 1.0
        days = (time.time() - staked_at) / 86400
        return (1 + self.accrual_rate) ** days

    def to_bytes(self) -> bytes:
        return json.dumps({
            'transferable': self.transferable,
            'divisible': self.divisible,
            'expires_at': self.expires_at,
            'decay_rate': self.decay_rate,
            'accrual_rate': self.accrual_rate,
            'requires_kyc': self.requires_kyc,
            'min_reputation': self.min_reputation_to_hold,
        }, sort_keys=True).encode()


@dataclass
class Token:
    """A single token in the AEOS economy."""
    token_id: str
    token_type: TokenType
    issuer_did: str
    holder_did: str
    amount: int
    policy: TokenPolicy
    state: TokenState = TokenState.ACTIVE
    created_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)
    transfer_history: List[Dict[str, Any]] = field(default_factory=list)
    commitment: Optional[Commitment] = None  # Hidden amount

    @classmethod
    def mint(cls, token_type: TokenType, issuer_did: str,
             holder_did: str, amount: int, policy: TokenPolicy,
             metadata: Optional[Dict[str, Any]] = None,
             hide_amount: bool = False) -> 'Token':
        token_id = sha256(
            f"AEOS/token/{issuer_did}/{time.time()}/{os.urandom(8).hex()}".encode()
        ).hex()[:20]

        commitment = None
        if hide_amount:
            commitment = Commitment.create(amount.to_bytes(32, 'big'))

        return cls(
            token_id=token_id,
            token_type=token_type,
            issuer_did=issuer_did,
            holder_did=holder_did,
            amount=amount,
            policy=policy,
            metadata=metadata or {},
            commitment=commitment,
        )

    def effective_amount(self) -> int:
        """Current effective amount after decay."""
        factor = self.policy.current_decay_factor(self.created_at)
        return int(self.amount * factor)

    def transfer(self, new_holder: str, amount: Optional[int] = None,
                 transferor_signature: Optional[bytes] = None) -> Optional['Token']:
        """Transfer token (or portion) to a new holder.
        Returns new token for the transferred amount, or None if invalid."""
        if not self.policy.transferable:
            return None
        if self.state != TokenState.ACTIVE:
            return None
        if self.policy.is_expired():
            self.state = TokenState.EXPIRED
            return None

        transfer_amount = amount or self.amount
        if transfer_amount > self.amount:
            return None

        if not self.policy.divisible and transfer_amount != self.amount:
            return None

        # Record transfer
        self.transfer_history.append({
            'from': self.holder_did,
            'to': new_holder,
            'amount': transfer_amount,
            'timestamp': time.time(),
        })

        # Split token if partial transfer
        if transfer_amount < self.amount:
            self.amount -= transfer_amount

        new_token = Token.mint(
            token_type=self.token_type,
            issuer_did=self.issuer_did,
            holder_did=new_holder,
            amount=transfer_amount,
            policy=self.policy,
            metadata={**self.metadata, 'parent_token': self.token_id},
        )
        new_token.transfer_history = list(self.transfer_history)

        if transfer_amount == self.amount:
            self.state = TokenState.BURNED
            self.amount = 0

        return new_token

    def redeem(self, proof: bytes) -> bool:
        """Redeem the token (consume it for its value)."""
        if self.state != TokenState.ACTIVE:
            return False
        if self.policy.is_expired():
            self.state = TokenState.EXPIRED
            return False

        self.state = TokenState.REDEEMED
        self.metadata['redeemed_at'] = time.time()
        self.metadata['redemption_proof'] = proof.hex()
        return True

    def stake(self) -> 'StakedToken':
        """Lock this token for staking (earn accrual, lose liquidity)."""
        if self.state != TokenState.ACTIVE:
            raise ValueError("Can only stake active tokens")
        self.state = TokenState.LOCKED
        return StakedToken(
            token=self,
            staked_at=time.time(),
            accrual_rate=self.policy.accrual_rate,
        )

    def to_bytes(self) -> bytes:
        return json.dumps({
            'id': self.token_id,
            'type': self.token_type.value,
            'issuer': self.issuer_did,
            'holder': self.holder_did,
            'amount': self.amount,
            'state': self.state.name,
            'created': self.created_at,
        }, sort_keys=True).encode()


@dataclass
class StakedToken:
    """A token that has been staked (locked for yield/governance)."""
    token: Token
    staked_at: float
    accrual_rate: float
    unstake_cooldown: float = 86400  # 24 hours

    def accrued_value(self) -> int:
        """Current value including accrual."""
        factor = self.token.policy.current_accrual_factor(self.staked_at)
        return int(self.token.amount * factor)

    def unstake(self) -> Token:
        """Unstake the token. Subject to cooldown."""
        elapsed = time.time() - self.staked_at
        if elapsed < self.unstake_cooldown:
            raise ValueError(
                f"Cooldown: {self.unstake_cooldown - elapsed:.0f}s remaining"
            )
        self.token.state = TokenState.ACTIVE
        self.token.amount = self.accrued_value()
        return self.token


# =============================================================================
# TOKEN REGISTRY
# =============================================================================

class TokenRegistry:
    """Global registry of all tokens in the AEOS economy."""

    def __init__(self):
        self.tokens: Dict[str, Token] = {}
        self.staked: Dict[str, StakedToken] = {}
        self.balances: Dict[str, Dict[TokenType, int]] = defaultdict(
            lambda: defaultdict(int)
        )
        self.total_supply: Dict[TokenType, int] = defaultdict(int)

    def register(self, token: Token) -> str:
        """Register a newly minted token."""
        self.tokens[token.token_id] = token
        self.balances[token.holder_did][token.token_type] += token.amount
        self.total_supply[token.token_type] += token.amount
        return token.token_id

    def transfer(self, token_id: str, to_did: str,
                 amount: Optional[int] = None) -> Optional[str]:
        """Transfer a token and return new token ID."""
        token = self.tokens.get(token_id)
        if not token:
            return None

        new_token = token.transfer(to_did, amount)
        if not new_token:
            return None

        # Update balances
        self.balances[token.holder_did][token.token_type] -= (amount or token.amount)
        self.balances[to_did][new_token.token_type] += new_token.amount

        self.tokens[new_token.token_id] = new_token
        if token.state == TokenState.BURNED:
            del self.tokens[token_id]

        return new_token.token_id

    def stake(self, token_id: str) -> Optional[str]:
        """Stake a token."""
        token = self.tokens.get(token_id)
        if not token:
            return None
        staked = token.stake()
        self.staked[token_id] = staked
        return token_id

    def get_balance(self, holder_did: str,
                     token_type: Optional[TokenType] = None) -> Dict[str, int]:
        """Get token balances for a holder."""
        if token_type:
            return {token_type.value: self.balances[holder_did][token_type]}
        return {tt.value: amt for tt, amt in self.balances[holder_did].items() if amt > 0}

    def summary(self) -> Dict[str, Any]:
        return {
            'total_tokens': len(self.tokens),
            'staked_tokens': len(self.staked),
            'supply': {tt.value: amt for tt, amt in self.total_supply.items()},
            'unique_holders': len(self.balances),
        }


# =============================================================================
# TOKEN FACTORIES (Pre-built token types)
# =============================================================================

class TokenFactory:
    """Create common token types with appropriate policies."""

    @staticmethod
    def authority_token(issuer_did: str, holder_did: str,
                         authority_scope: str, amount: int = 1,
                         expiry_hours: float = 720) -> Token:
        """Fractional authority delegation as a token."""
        return Token.mint(
            token_type=TokenType.AUTHORITY,
            issuer_did=issuer_did,
            holder_did=holder_did,
            amount=amount,
            policy=TokenPolicy(
                transferable=True,
                divisible=True,
                expires_at=time.time() + expiry_hours * 3600,
                requires_kyc=True,
            ),
            metadata={'scope': authority_scope},
        )

    @staticmethod
    def reputation_token(issuer_did: str, holder_did: str,
                          amount: int = 100,
                          decay_daily: float = 0.001) -> Token:
        """Non-transferable reputation that decays if not maintained."""
        return Token.mint(
            token_type=TokenType.REPUTATION,
            issuer_did=issuer_did,
            holder_did=holder_did,
            amount=amount,
            policy=TokenPolicy(
                transferable=False,
                divisible=False,
                decay_rate=decay_daily,
                auto_burn_on_dispute_loss=True,
            ),
            metadata={'category': 'behavioral'},
        )

    @staticmethod
    def compute_credit(issuer_did: str, holder_did: str,
                        compute_units: int, price_per_unit: int,
                        expiry_days: float = 30) -> Token:
        """Prepaid compute credits with programmatic redemption."""
        return Token.mint(
            token_type=TokenType.SERVICE_CREDIT,
            issuer_did=issuer_did,
            holder_did=holder_did,
            amount=compute_units,
            policy=TokenPolicy(
                transferable=True,
                divisible=True,
                min_divisible_unit=1,
                expires_at=time.time() + expiry_days * 86400,
            ),
            metadata={'service': 'compute', 'price_per_unit': price_per_unit},
        )

    @staticmethod
    def governance_token(issuer_did: str, holder_did: str,
                          voting_weight: int = 1,
                          accrual_daily: float = 0.001) -> Token:
        """Governance token with staking yield."""
        return Token.mint(
            token_type=TokenType.GOVERNANCE,
            issuer_did=issuer_did,
            holder_did=holder_did,
            amount=voting_weight,
            policy=TokenPolicy(
                transferable=True,
                divisible=True,
                accrual_rate=accrual_daily,
            ),
            metadata={'protocol': 'aeos', 'version': '1.0'},
        )
