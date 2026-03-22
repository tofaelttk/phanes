"""
AEOS Risk Management Engine

Production-grade risk management for the agent economy.
Every transaction, every contract, every delegation passes through this engine.

Components:
  - Real-time Risk Scoring: Multi-factor risk assessment per transaction
  - Circuit Breakers: Automatic halts when risk thresholds are exceeded
  - Anomaly Detection: Behavioral drift detection for compromised agents
  - Counterparty Risk: Network-aware credit risk assessment
  - Insurance Primitives: Programmable insurance pools for agent operations
  - Systemic Risk Monitor: Network-level cascade detection
"""

import time
import math
import json
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Tuple, Deque
from collections import deque
from enum import Enum, auto

from .crypto_primitives import sha256, Commitment, RangeProof
from .identity import AgentIdentity, AuthorityBounds


class RiskLevel(Enum):
    MINIMAL = 1
    LOW = 2
    MODERATE = 3
    HIGH = 4
    CRITICAL = 5
    BLOCKED = 6


class CircuitBreakerState(Enum):
    CLOSED = auto()    # Normal operation
    OPEN = auto()      # All transactions blocked
    HALF_OPEN = auto() # Testing if safe to resume


@dataclass
class RiskScore:
    """Multi-dimensional risk assessment for a single action."""
    overall: float                      # [0.0, 1.0] where 1.0 is maximum risk
    level: RiskLevel
    factors: Dict[str, float]           # Individual risk factor scores
    explanation: List[str]              # Human-readable risk factors
    timestamp: float = field(default_factory=time.time)
    action_hash: bytes = b""            # Hash of the assessed action

    @property
    def is_acceptable(self) -> bool:
        return self.level.value <= RiskLevel.MODERATE.value


@dataclass
class TransactionRecord:
    """Record of a single transaction for risk analysis."""
    tx_id: str
    agent_did: str
    counterparty_did: str
    value: int
    tx_type: str
    timestamp: float
    risk_score: float
    contract_id: Optional[str] = None


# =============================================================================
# BEHAVIORAL PROFILE (Baseline for anomaly detection)
# =============================================================================

@dataclass
class BehavioralProfile:
    """Statistical profile of an agent's normal behavior.
    Used to detect anomalies that may indicate compromise."""
    agent_did: str
    avg_transaction_value: float = 0.0
    std_transaction_value: float = 0.0
    avg_daily_transactions: float = 0.0
    avg_daily_volume: float = 0.0
    typical_counterparties: set = field(default_factory=set)
    typical_tx_types: set = field(default_factory=set)
    typical_hours: List[int] = field(default_factory=lambda: list(range(24)))
    history_window: Deque[TransactionRecord] = field(
        default_factory=lambda: deque(maxlen=1000)
    )
    last_updated: float = 0.0

    def update(self, tx: TransactionRecord):
        """Update behavioral profile with new transaction."""
        self.history_window.append(tx)
        self.typical_counterparties.add(tx.counterparty_did)
        self.typical_tx_types.add(tx.tx_type)

        values = [t.value for t in self.history_window]
        if values:
            self.avg_transaction_value = sum(values) / len(values)
            variance = sum((v - self.avg_transaction_value) ** 2 for v in values) / max(len(values), 1)
            self.std_transaction_value = math.sqrt(variance)

        # Daily aggregates
        now = time.time()
        day_ago = now - 86400
        recent = [t for t in self.history_window if t.timestamp > day_ago]
        self.avg_daily_transactions = len(recent)
        self.avg_daily_volume = sum(t.value for t in recent)

        self.last_updated = time.time()

    def anomaly_score(self, tx: TransactionRecord) -> Tuple[float, List[str]]:
        """Calculate how anomalous a transaction is relative to this profile.
        Returns (score, [reasons]) where score in [0.0, 1.0]."""
        if len(self.history_window) < 10:
            return 0.0, ["insufficient_history"]

        score = 0.0
        reasons = []

        # Value anomaly (z-score)
        if self.std_transaction_value > 0:
            z = abs(tx.value - self.avg_transaction_value) / self.std_transaction_value
            if z > 3.0:
                score += 0.3
                reasons.append(f"value_zscore_{z:.1f}")
            elif z > 2.0:
                score += 0.15

        # New counterparty
        if tx.counterparty_did not in self.typical_counterparties:
            score += 0.15
            reasons.append("new_counterparty")

        # Unusual transaction type
        if tx.tx_type not in self.typical_tx_types:
            score += 0.1
            reasons.append("unusual_tx_type")

        # Volume spike
        now = time.time()
        day_ago = now - 86400
        recent_volume = sum(
            t.value for t in self.history_window if t.timestamp > day_ago
        ) + tx.value
        if self.avg_daily_volume > 0 and recent_volume > self.avg_daily_volume * 3:
            score += 0.25
            reasons.append("volume_spike")

        # Velocity spike
        recent_count = sum(
            1 for t in self.history_window if t.timestamp > day_ago
        ) + 1
        if self.avg_daily_transactions > 0 and recent_count > self.avg_daily_transactions * 3:
            score += 0.2
            reasons.append("velocity_spike")

        return min(score, 1.0), reasons


# =============================================================================
# CIRCUIT BREAKER
# =============================================================================

@dataclass
class CircuitBreaker:
    """Automatic transaction halting when risk thresholds are exceeded.
    
    Implements the circuit breaker pattern:
    CLOSED (normal) -> OPEN (blocked) -> HALF_OPEN (testing) -> CLOSED
    """
    agent_did: str
    state: CircuitBreakerState = CircuitBreakerState.CLOSED
    failure_count: int = 0
    failure_threshold: int = 5          # Failures before tripping
    reset_timeout: float = 300.0        # Seconds before testing (5 min)
    half_open_max_tx: int = 3           # Test transactions in half-open
    half_open_tx_count: int = 0
    last_failure_time: float = 0.0
    last_state_change: float = field(default_factory=time.time)
    trip_reasons: List[str] = field(default_factory=list)

    def record_failure(self, reason: str):
        self.failure_count += 1
        self.last_failure_time = time.time()
        self.trip_reasons.append(reason)

        if self.failure_count >= self.failure_threshold:
            self.trip(reason)

    def trip(self, reason: str):
        """Open the circuit breaker — block all transactions."""
        self.state = CircuitBreakerState.OPEN
        self.last_state_change = time.time()
        self.trip_reasons.append(f"TRIPPED: {reason}")

    def check(self) -> bool:
        """Check if a transaction should be allowed. Returns True if OK."""
        if self.state == CircuitBreakerState.CLOSED:
            return True

        if self.state == CircuitBreakerState.OPEN:
            # Check if reset timeout has elapsed
            if time.time() - self.last_state_change >= self.reset_timeout:
                self.state = CircuitBreakerState.HALF_OPEN
                self.half_open_tx_count = 0
                self.last_state_change = time.time()
                return True  # Allow first test transaction
            return False

        if self.state == CircuitBreakerState.HALF_OPEN:
            self.half_open_tx_count += 1
            if self.half_open_tx_count <= self.half_open_max_tx:
                return True
            # If we got here without failure, close the breaker
            self.reset()
            return True

        return False

    def record_success(self):
        """Record a successful transaction (used in half-open state)."""
        if self.state == CircuitBreakerState.HALF_OPEN:
            if self.half_open_tx_count >= self.half_open_max_tx:
                self.reset()

    def reset(self):
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.half_open_tx_count = 0
        self.trip_reasons = []
        self.last_state_change = time.time()


# =============================================================================
# COUNTERPARTY RISK ASSESSOR
# =============================================================================

@dataclass
class CounterpartyRisk:
    """Assess the risk of transacting with a specific counterparty."""

    @staticmethod
    def assess(agent: AgentIdentity, counterparty: AgentIdentity,
               transaction_value: int) -> Tuple[float, List[str]]:
        """Returns (risk_score, [factors])."""
        score = 0.0
        factors = []

        # Reputation-based risk
        if counterparty.reputation_score < 0.3:
            score += 0.35
            factors.append(f"low_reputation_{counterparty.reputation_score:.2f}")
        elif counterparty.reputation_score < 0.6:
            score += 0.15
            factors.append(f"moderate_reputation_{counterparty.reputation_score:.2f}")

        # New agent risk
        age_hours = (time.time() - counterparty.created_at) / 3600
        if age_hours < 24:
            score += 0.25
            factors.append("agent_age_under_24h")
        elif age_hours < 168:  # 1 week
            score += 0.1
            factors.append("agent_age_under_1w")

        # Transaction history risk
        if counterparty.total_transactions < 10:
            score += 0.15
            factors.append("low_transaction_history")

        # Dispute history risk
        if counterparty.total_transactions > 0:
            dispute_rate = counterparty.disputes_lost / max(counterparty.total_transactions, 1)
            if dispute_rate > 0.1:
                score += 0.3
                factors.append(f"high_dispute_rate_{dispute_rate:.2f}")

        # Value relative to counterparty's history
        if counterparty.total_volume > 0:
            value_ratio = transaction_value / (counterparty.total_volume / max(counterparty.total_transactions, 1))
            if value_ratio > 10:
                score += 0.2
                factors.append(f"unusually_large_for_counterparty")

        # Delegation depth risk
        if counterparty.delegation_chain.depth() > 3:
            score += 0.1
            factors.append(f"deep_delegation_chain_{counterparty.delegation_chain.depth()}")

        # Revocation check
        if counterparty.revoked:
            score = 1.0
            factors = ["REVOKED"]

        return min(score, 1.0), factors


# =============================================================================
# INSURANCE PRIMITIVE
# =============================================================================

@dataclass
class InsurancePool:
    """Programmable insurance pool for agent operations.
    
    Agents stake into a shared pool. When a covered event occurs,
    the pool pays out according to predefined rules. Premium is
    calculated based on the agent's risk profile.
    """
    pool_id: str
    total_staked: int = 0
    coverage_types: List[str] = field(default_factory=list)
    max_payout_per_claim: int = 0
    premium_rate: float = 0.02          # 2% annual
    participants: Dict[str, int] = field(default_factory=dict)  # DID -> stake
    claims: List[Dict[str, Any]] = field(default_factory=list)
    total_paid_out: int = 0

    @classmethod
    def create(cls, coverage_types: List[str], max_payout: int,
               premium_rate: float = 0.02) -> 'InsurancePool':
        pool_id = sha256(
            f"AEOS/insurance/{time.time()}/{os.urandom(8).hex()}".encode()
        ).hex()[:16]

        return cls(
            pool_id=pool_id,
            coverage_types=coverage_types,
            max_payout_per_claim=max_payout,
            premium_rate=premium_rate,
        )

    def stake(self, agent_did: str, amount: int) -> int:
        """Stake into the pool. Returns total stake for agent."""
        self.participants[agent_did] = self.participants.get(agent_did, 0) + amount
        self.total_staked += amount
        return self.participants[agent_did]

    def calculate_premium(self, agent: AgentIdentity, coverage_amount: int) -> int:
        """Calculate insurance premium based on agent's risk profile."""
        base = int(coverage_amount * self.premium_rate)

        # Risk multiplier based on reputation
        if agent.reputation_score >= 0.8:
            multiplier = 0.7  # Discount for high reputation
        elif agent.reputation_score >= 0.5:
            multiplier = 1.0
        else:
            multiplier = 1.5  # Surcharge for low reputation

        # Dispute history multiplier
        if agent.total_transactions > 0:
            dispute_rate = agent.disputes_lost / max(agent.total_transactions, 1)
            multiplier *= (1 + dispute_rate * 5)

        return int(base * multiplier)

    def file_claim(self, claimant_did: str, amount: int,
                   coverage_type: str, evidence_hash: bytes) -> Dict[str, Any]:
        """File an insurance claim."""
        if coverage_type not in self.coverage_types:
            raise ValueError(f"Coverage type '{coverage_type}' not covered")
        if claimant_did not in self.participants:
            raise ValueError("Claimant is not a pool participant")

        payout = min(amount, self.max_payout_per_claim)
        available = self.total_staked - self.total_paid_out
        payout = min(payout, available)

        claim = {
            "claim_id": sha256(f"claim/{claimant_did}/{time.time()}".encode()).hex()[:12],
            "claimant": claimant_did,
            "amount_requested": amount,
            "amount_approved": payout,
            "coverage_type": coverage_type,
            "evidence_hash": evidence_hash.hex(),
            "filed_at": time.time(),
            "status": "approved" if payout > 0 else "insufficient_funds",
        }
        self.claims.append(claim)
        self.total_paid_out += payout

        return claim

    @property
    def solvency_ratio(self) -> float:
        """Ratio of available funds to total staked. Below 0.5 is concerning."""
        if self.total_staked == 0:
            return 1.0
        return (self.total_staked - self.total_paid_out) / self.total_staked


# =============================================================================
# MAIN RISK ENGINE
# =============================================================================

import os  # noqa: E402

class RiskEngine:
    """Central risk management engine for the AEOS protocol.
    Every action passes through here before execution."""

    def __init__(self, risk_tolerance: float = 0.6):
        self.risk_tolerance = risk_tolerance  # Max acceptable risk score
        self.profiles: Dict[str, BehavioralProfile] = {}
        self.breakers: Dict[str, CircuitBreaker] = {}
        self.transaction_log: List[TransactionRecord] = []
        self.insurance_pools: Dict[str, InsurancePool] = {}
        self.global_volume_24h: int = 0
        self.global_tx_count_24h: int = 0

    def get_profile(self, agent_did: str) -> BehavioralProfile:
        if agent_did not in self.profiles:
            self.profiles[agent_did] = BehavioralProfile(agent_did=agent_did)
        return self.profiles[agent_did]

    def get_breaker(self, agent_did: str) -> CircuitBreaker:
        if agent_did not in self.breakers:
            self.breakers[agent_did] = CircuitBreaker(agent_did=agent_did)
        return self.breakers[agent_did]

    def assess_transaction(self, agent: AgentIdentity,
                           counterparty: AgentIdentity,
                           value: int, tx_type: str,
                           contract_id: Optional[str] = None) -> RiskScore:
        """Comprehensive risk assessment for a proposed transaction.
        
        Evaluates:
        1. Authority bounds compliance
        2. Circuit breaker status
        3. Behavioral anomaly score
        4. Counterparty risk
        5. Systemic risk indicators
        """
        factors = {}
        explanations = []

        # 1. Authority bounds
        if value > agent.authority_bounds.max_transaction_value:
            factors['authority_breach'] = 1.0
            explanations.append(
                f"Transaction value {value} exceeds authority limit "
                f"{agent.authority_bounds.max_transaction_value}"
            )

        # 2. Circuit breaker
        breaker = self.get_breaker(agent.did)
        if not breaker.check():
            factors['circuit_breaker'] = 1.0
            explanations.append(f"Circuit breaker is {breaker.state.name}")

        # 3. Behavioral anomaly
        profile = self.get_profile(agent.did)
        tx_record = TransactionRecord(
            tx_id=sha256(f"{agent.did}/{value}/{time.time()}".encode()).hex()[:12],
            agent_did=agent.did,
            counterparty_did=counterparty.did,
            value=value,
            tx_type=tx_type,
            timestamp=time.time(),
            risk_score=0.0,
            contract_id=contract_id,
        )
        anomaly_score, anomaly_reasons = profile.anomaly_score(tx_record)
        factors['behavioral_anomaly'] = anomaly_score
        if anomaly_reasons:
            explanations.extend([f"anomaly: {r}" for r in anomaly_reasons])

        # 4. Counterparty risk
        cp_score, cp_factors = CounterpartyRisk.assess(agent, counterparty, value)
        factors['counterparty_risk'] = cp_score
        if cp_factors:
            explanations.extend([f"counterparty: {f}" for f in cp_factors])

        # 5. Systemic risk (concentration)
        if self.global_volume_24h > 0:
            concentration = value / max(self.global_volume_24h, 1)
            if concentration > 0.1:  # Single tx > 10% of daily volume
                factors['concentration_risk'] = min(concentration * 2, 1.0)
                explanations.append(f"concentration: {concentration:.1%} of daily volume")

        # Weighted overall score
        weights = {
            'authority_breach': 0.30,
            'circuit_breaker': 0.25,
            'behavioral_anomaly': 0.20,
            'counterparty_risk': 0.15,
            'concentration_risk': 0.10,
        }
        overall = sum(factors.get(k, 0) * w for k, w in weights.items())

        # Determine risk level
        if overall >= 0.9:
            level = RiskLevel.BLOCKED
        elif overall >= 0.7:
            level = RiskLevel.CRITICAL
        elif overall >= 0.5:
            level = RiskLevel.HIGH
        elif overall >= 0.3:
            level = RiskLevel.MODERATE
        elif overall >= 0.1:
            level = RiskLevel.LOW
        else:
            level = RiskLevel.MINIMAL

        score = RiskScore(
            overall=overall,
            level=level,
            factors=factors,
            explanation=explanations,
            action_hash=sha256(json.dumps({
                'agent': agent.did, 'counterparty': counterparty.did,
                'value': value, 'type': tx_type,
            }, sort_keys=True).encode()),
        )

        # Update profile
        tx_record.risk_score = overall
        profile.update(tx_record)
        self.transaction_log.append(tx_record)

        # Update global counters
        self.global_volume_24h += value
        self.global_tx_count_24h += 1

        # Update circuit breaker
        if level.value >= RiskLevel.HIGH.value:
            breaker.record_failure(f"high_risk_{overall:.2f}")
        else:
            breaker.record_success()

        return score

    def approve_transaction(self, agent: AgentIdentity,
                            counterparty: AgentIdentity,
                            value: int, tx_type: str) -> Tuple[bool, RiskScore]:
        """Assess and approve/reject a transaction.
        Returns (approved, risk_score)."""
        score = self.assess_transaction(agent, counterparty, value, tx_type)
        approved = score.overall <= self.risk_tolerance and score.level != RiskLevel.BLOCKED
        return approved, score

    def network_health(self) -> Dict[str, Any]:
        """Global network health metrics."""
        open_breakers = sum(
            1 for b in self.breakers.values()
            if b.state != CircuitBreakerState.CLOSED
        )
        avg_risk = 0.0
        if self.transaction_log:
            recent = [t for t in self.transaction_log if t.timestamp > time.time() - 3600]
            if recent:
                avg_risk = sum(t.risk_score for t in recent) / len(recent)

        return {
            "total_agents_monitored": len(self.profiles),
            "open_circuit_breakers": open_breakers,
            "transactions_24h": self.global_tx_count_24h,
            "volume_24h": self.global_volume_24h,
            "average_risk_1h": avg_risk,
            "insurance_pools": len(self.insurance_pools),
        }
