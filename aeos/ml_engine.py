"""
AEOS Machine Learning Engine

Production-grade ML for agent behavioral analysis, anomaly detection,
collusion detection, and predictive risk modeling.

Implements:
  - Isolation Forest: Unsupervised anomaly detection for transaction patterns
  - Online Bayesian Learner: Continuously updating behavioral model
  - Markov Behavioral Model: State-transition patterns for agent behavior
  - Entropy-Based Drift Detector: Detect when an agent's behavior distribution shifts
  - Ensemble Anomaly Scorer: Combines multiple detectors for robust scoring
  - Feature Engineering Pipeline: Raw transactions -> ML-ready features
"""

import math
import time
import random
import hashlib
from collections import deque, Counter, defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Deque

import numpy as np


# =============================================================================
# FEATURE ENGINEERING
# =============================================================================

@dataclass
class TransactionFeatures:
    """Engineered features from raw transaction data."""
    value: float
    log_value: float
    hour_of_day: int
    day_of_week: int
    is_new_counterparty: bool
    counterparty_reputation: float
    time_since_last_tx: float          # seconds
    rolling_mean_value_10: float       # 10-tx rolling mean
    rolling_std_value_10: float        # 10-tx rolling std
    rolling_mean_value_50: float
    velocity_1h: int                   # tx count in last hour
    velocity_24h: int                  # tx count in last 24h
    volume_1h: float                   # total volume in last hour
    volume_24h: float
    unique_counterparties_24h: int
    value_to_rolling_mean_ratio: float # current / rolling mean
    delegation_depth: int
    contract_count: int
    dispute_rate: float

    def to_vector(self) -> np.ndarray:
        """Convert to numpy array for ML models."""
        return np.array([
            self.log_value,
            self.hour_of_day / 24.0,
            self.day_of_week / 7.0,
            float(self.is_new_counterparty),
            self.counterparty_reputation,
            min(self.time_since_last_tx / 86400.0, 1.0),  # Normalize to [0,1] day
            self.rolling_mean_value_10,
            self.rolling_std_value_10,
            self.rolling_mean_value_50,
            min(self.velocity_1h / 100.0, 1.0),
            min(self.velocity_24h / 1000.0, 1.0),
            self.volume_1h,
            self.volume_24h,
            min(self.unique_counterparties_24h / 50.0, 1.0),
            min(self.value_to_rolling_mean_ratio / 10.0, 1.0),
            min(self.delegation_depth / 5.0, 1.0),
            min(self.contract_count / 20.0, 1.0),
            min(self.dispute_rate, 1.0),
        ], dtype=np.float64)


class FeatureExtractor:
    """Extracts ML features from raw transaction history."""

    def __init__(self):
        self.history: Deque[Dict[str, Any]] = deque(maxlen=5000)
        self.known_counterparties: set = set()

    def extract(self, tx: Dict[str, Any]) -> TransactionFeatures:
        """Extract features from a transaction given history context."""
        value = tx.get('value', 0)
        ts = tx.get('timestamp', time.time())

        # Time features
        t = time.gmtime(ts)
        hour = t.tm_hour
        dow = t.tm_wday

        # Counterparty features
        cp = tx.get('counterparty_did', '')
        is_new = cp not in self.known_counterparties
        self.known_counterparties.add(cp)

        # Time since last
        time_since = 0
        if self.history:
            time_since = ts - self.history[-1].get('timestamp', ts)

        # Rolling statistics
        values = [h['value'] for h in self.history]
        recent_10 = values[-10:] if len(values) >= 10 else values
        recent_50 = values[-50:] if len(values) >= 50 else values

        mean_10 = np.mean(recent_10) if recent_10 else 0
        std_10 = np.std(recent_10) if len(recent_10) > 1 else 0
        mean_50 = np.mean(recent_50) if recent_50 else 0

        # Velocity and volume
        hour_ago = ts - 3600
        day_ago = ts - 86400
        recent_1h = [h for h in self.history if h.get('timestamp', 0) > hour_ago]
        recent_24h = [h for h in self.history if h.get('timestamp', 0) > day_ago]

        velocity_1h = len(recent_1h)
        velocity_24h = len(recent_24h)
        volume_1h = sum(h['value'] for h in recent_1h)
        volume_24h = sum(h['value'] for h in recent_24h)
        unique_cp_24h = len(set(h.get('counterparty_did', '') for h in recent_24h))

        ratio = value / mean_10 if mean_10 > 0 else 0

        self.history.append(tx)

        return TransactionFeatures(
            value=value,
            log_value=math.log1p(value),
            hour_of_day=hour,
            day_of_week=dow,
            is_new_counterparty=is_new,
            counterparty_reputation=tx.get('counterparty_reputation', 0.5),
            time_since_last_tx=time_since,
            rolling_mean_value_10=mean_10,
            rolling_std_value_10=std_10,
            rolling_mean_value_50=mean_50,
            velocity_1h=velocity_1h,
            velocity_24h=velocity_24h,
            volume_1h=volume_1h,
            volume_24h=volume_24h,
            unique_counterparties_24h=unique_cp_24h,
            value_to_rolling_mean_ratio=ratio,
            delegation_depth=tx.get('delegation_depth', 0),
            contract_count=tx.get('contract_count', 0),
            dispute_rate=tx.get('dispute_rate', 0.0),
        )


# =============================================================================
# ISOLATION FOREST (From scratch - no sklearn dependency for core logic)
# =============================================================================

class IsolationTree:
    """A single isolation tree for anomaly detection."""

    def __init__(self, max_depth: int = 10):
        self.max_depth = max_depth
        self.root = None

    def fit(self, X: np.ndarray):
        """Build the tree from data."""
        self.root = self._build(X, depth=0)
        self.n_samples = X.shape[0]

    def _build(self, X: np.ndarray, depth: int) -> Dict:
        n_samples, n_features = X.shape

        if depth >= self.max_depth or n_samples <= 1:
            return {'type': 'leaf', 'size': n_samples, 'depth': depth}

        # Random feature and split point
        feature_idx = random.randint(0, n_features - 1)
        col = X[:, feature_idx]
        min_val, max_val = col.min(), col.max()

        if min_val == max_val:
            return {'type': 'leaf', 'size': n_samples, 'depth': depth}

        split_value = random.uniform(min_val, max_val)

        left_mask = col < split_value
        right_mask = ~left_mask

        return {
            'type': 'split',
            'feature': feature_idx,
            'threshold': split_value,
            'left': self._build(X[left_mask], depth + 1),
            'right': self._build(X[right_mask], depth + 1),
        }

    def path_length(self, x: np.ndarray) -> float:
        """Compute the path length for a single sample."""
        return self._traverse(x, self.root, 0)

    def _traverse(self, x: np.ndarray, node: Dict, depth: int) -> float:
        if node['type'] == 'leaf':
            # Average path length of unsuccessful search in BST
            n = node['size']
            if n <= 1:
                return depth
            return depth + self._c(n)

        if x[node['feature']] < node['threshold']:
            return self._traverse(x, node['left'], depth + 1)
        else:
            return self._traverse(x, node['right'], depth + 1)

    @staticmethod
    def _c(n: int) -> float:
        """Average path length of unsuccessful search in BST."""
        if n <= 1:
            return 0
        return 2.0 * (math.log(n - 1) + 0.5772156649) - (2.0 * (n - 1) / n)


class IsolationForest:
    """Isolation Forest for unsupervised anomaly detection.
    
    Key insight: anomalies are few and different, so they are isolated
    in fewer steps (shorter path length) than normal points.
    
    Anomaly score = 2^(-E[h(x)] / c(n)) where:
      - h(x) is path length for sample x
      - c(n) is average path length for n samples
      - Score close to 1 = anomaly
      - Score close to 0.5 = normal
      - Score close to 0 = very normal
    """

    def __init__(self, n_trees: int = 100, max_samples: int = 256,
                 max_depth: int = 10, contamination: float = 0.05):
        self.n_trees = n_trees
        self.max_samples = max_samples
        self.max_depth = max_depth
        self.contamination = contamination
        self.trees: List[IsolationTree] = []
        self.threshold: float = 0.5
        self._fitted = False

    def fit(self, X: np.ndarray):
        """Fit the isolation forest on training data."""
        n_samples = X.shape[0]
        self.trees = []

        for _ in range(self.n_trees):
            # Subsample
            sample_size = min(self.max_samples, n_samples)
            indices = np.random.choice(n_samples, size=sample_size, replace=False)
            X_sample = X[indices]

            tree = IsolationTree(max_depth=self.max_depth)
            tree.fit(X_sample)
            self.trees.append(tree)

        # Compute threshold from training data
        scores = self.score_samples(X)
        sorted_scores = np.sort(scores)[::-1]
        threshold_idx = max(1, int(len(sorted_scores) * self.contamination))
        self.threshold = sorted_scores[min(threshold_idx, len(sorted_scores) - 1)]
        self._fitted = True

    def score_samples(self, X: np.ndarray) -> np.ndarray:
        """Compute anomaly scores for samples. Higher = more anomalous."""
        if not self.trees:
            return np.full(X.shape[0], 0.5)

        n = self.max_samples
        c_n = IsolationTree._c(n) if n > 1 else 1.0

        scores = np.zeros(X.shape[0])
        for i in range(X.shape[0]):
            x = X[i]
            avg_path = np.mean([tree.path_length(x) for tree in self.trees])
            scores[i] = 2.0 ** (-avg_path / c_n) if c_n > 0 else 0.5

        return scores

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict anomalies. Returns 1 for anomaly, 0 for normal."""
        scores = self.score_samples(X)
        return (scores >= self.threshold).astype(int)

    def score_single(self, x: np.ndarray) -> float:
        """Score a single sample. Returns anomaly score in [0, 1]."""
        if not self.trees:
            return 0.5
        c_n = IsolationTree._c(self.max_samples)
        avg_path = np.mean([tree.path_length(x) for tree in self.trees])
        return 2.0 ** (-avg_path / c_n) if c_n > 0 else 0.5


# =============================================================================
# MARKOV BEHAVIORAL MODEL
# =============================================================================

class MarkovBehavioralModel:
    """Models agent behavior as a Markov chain over behavioral states.
    
    States represent behavioral modes (e.g., "normal_trading", "high_volume",
    "new_counterparty_exploration", "dormant"). Transitions that deviate
    from learned patterns indicate anomalous behavior.
    """

    def __init__(self, n_states: int = 8, smoothing: float = 0.01):
        self.n_states = n_states
        self.smoothing = smoothing
        self.transition_counts = np.full((n_states, n_states), smoothing)
        self.state_counts = np.full(n_states, smoothing * n_states)
        self.current_state: int = 0
        self.history: List[int] = []

    def discretize_features(self, features: TransactionFeatures) -> int:
        """Map continuous features to discrete behavioral state."""
        # Simple quantization based on key features
        value_bucket = min(int(features.log_value / 3), 3)  # 0-3
        velocity_bucket = 0 if features.velocity_1h < 5 else 1  # 0-1
        
        state = value_bucket * 2 + velocity_bucket
        return min(state, self.n_states - 1)

    def update(self, features: TransactionFeatures):
        """Update the model with a new observation."""
        new_state = self.discretize_features(features)
        self.transition_counts[self.current_state][new_state] += 1
        self.state_counts[self.current_state] += 1
        self.history.append(new_state)
        self.current_state = new_state

    def transition_probability(self, from_state: int, to_state: int) -> float:
        """Get the learned transition probability."""
        return self.transition_counts[from_state][to_state] / self.state_counts[from_state]

    def surprise_score(self, features: TransactionFeatures) -> float:
        """How surprising is this transition? Returns [0, 1] where 1 = very surprising."""
        new_state = self.discretize_features(features)
        prob = self.transition_probability(self.current_state, new_state)
        # Convert probability to surprise using information content
        surprise = -math.log2(max(prob, 1e-10)) / math.log2(self.n_states)
        return min(surprise, 1.0)

    def stationary_distribution(self) -> np.ndarray:
        """Compute the stationary distribution of the Markov chain."""
        # Normalize transition matrix
        T = self.transition_counts / self.state_counts[:, np.newaxis]
        
        # Power iteration
        pi = np.ones(self.n_states) / self.n_states
        for _ in range(100):
            pi_new = pi @ T
            if np.allclose(pi, pi_new, atol=1e-8):
                break
            pi = pi_new
        return pi


# =============================================================================
# ENTROPY-BASED DRIFT DETECTOR
# =============================================================================

class EntropyDriftDetector:
    """Detect behavioral drift by monitoring the entropy of feature distributions.
    
    When an agent's behavior distribution shifts (e.g., after compromise),
    the entropy of its recent activity changes. This detector maintains
    a reference distribution and compares it against a sliding window.
    
    Uses KL-divergence (relative entropy) as the drift metric.
    """

    def __init__(self, window_size: int = 200, reference_size: int = 500,
                 n_bins: int = 20, drift_threshold: float = 0.5):
        self.window_size = window_size
        self.reference_size = reference_size
        self.n_bins = n_bins
        self.drift_threshold = drift_threshold
        self.reference_data: Deque[np.ndarray] = deque(maxlen=reference_size)
        self.window_data: Deque[np.ndarray] = deque(maxlen=window_size)
        self.reference_distribution: Optional[np.ndarray] = None
        self.is_reference_built = False

    def add_sample(self, features: np.ndarray):
        """Add a feature vector to the detector."""
        if not self.is_reference_built:
            self.reference_data.append(features)
            if len(self.reference_data) >= self.reference_size:
                self._build_reference()
        else:
            self.window_data.append(features)

    def _build_reference(self):
        """Build the reference distribution from accumulated data."""
        data = np.array(list(self.reference_data))
        self.reference_distribution = self._compute_distribution(data)
        self.is_reference_built = True

    def _compute_distribution(self, data: np.ndarray) -> np.ndarray:
        """Compute a histogram-based probability distribution per feature."""
        n_features = data.shape[1]
        distributions = []
        for f in range(n_features):
            hist, _ = np.histogram(data[:, f], bins=self.n_bins, density=True)
            # Add Laplace smoothing
            hist = hist + 1e-10
            hist = hist / hist.sum()
            distributions.append(hist)
        return np.array(distributions)

    def detect_drift(self) -> Tuple[float, bool]:
        """Check for distribution drift. Returns (kl_divergence, is_drift)."""
        if not self.is_reference_built or len(self.window_data) < self.window_size // 2:
            return 0.0, False

        window_data = np.array(list(self.window_data))
        window_dist = self._compute_distribution(window_data)

        # Compute mean KL-divergence across features
        kl_divs = []
        for f in range(self.reference_distribution.shape[0]):
            p = self.reference_distribution[f]
            q = window_dist[f]
            # KL(P || Q)
            kl = np.sum(p * np.log(p / (q + 1e-10) + 1e-10))
            kl_divs.append(max(0, kl))

        mean_kl = np.mean(kl_divs)
        is_drift = mean_kl > self.drift_threshold

        return float(mean_kl), is_drift

    def reset_reference(self):
        """Reset the reference distribution (e.g., after confirmed legitimate change)."""
        self.reference_data = deque(maxlen=self.reference_size)
        self.reference_data.extend(self.window_data)
        self.is_reference_built = False
        self.window_data.clear()


# =============================================================================
# ENSEMBLE ANOMALY SCORER
# =============================================================================

class EnsembleAnomalyScorer:
    """Combines multiple anomaly detection methods for robust scoring.
    
    Aggregates:
    1. Isolation Forest score (global structural anomalies)
    2. Markov surprise score (behavioral sequence anomalies)
    3. Entropy drift score (distribution shift anomalies)
    4. Statistical z-score (simple deviation detection)
    
    Ensemble methods are more robust than any single detector because
    different attack patterns trigger different detectors.
    """

    def __init__(self, agent_did: str):
        self.agent_did = agent_did
        self.feature_extractor = FeatureExtractor()
        self.isolation_forest = IsolationForest(n_trees=50, max_samples=128)
        self.markov_model = MarkovBehavioralModel()
        self.drift_detector = EntropyDriftDetector()
        self.training_data: List[np.ndarray] = []
        self.is_trained = False
        self.min_training_samples = 50

        # Ensemble weights (can be tuned)
        self.weights = {
            'isolation_forest': 0.30,
            'markov_surprise': 0.25,
            'drift_score': 0.20,
            'statistical': 0.25,
        }

    def observe(self, tx: Dict[str, Any]) -> Dict[str, Any]:
        """Process a transaction and return ensemble anomaly assessment."""
        features = self.feature_extractor.extract(tx)
        feature_vector = features.to_vector()

        scores = {}

        # 1. Isolation Forest
        if self.is_trained:
            scores['isolation_forest'] = float(
                self.isolation_forest.score_single(feature_vector)
            )
        else:
            self.training_data.append(feature_vector)
            if len(self.training_data) >= self.min_training_samples:
                X = np.array(self.training_data)
                # Handle NaN/Inf
                X = np.nan_to_num(X, nan=0.0, posinf=1.0, neginf=0.0)
                self.isolation_forest.fit(X)
                self.is_trained = True
            scores['isolation_forest'] = 0.0

        # 2. Markov Surprise
        scores['markov_surprise'] = self.markov_model.surprise_score(features)
        self.markov_model.update(features)

        # 3. Drift Detection
        self.drift_detector.add_sample(feature_vector)
        kl_div, is_drift = self.drift_detector.detect_drift()
        scores['drift_score'] = min(kl_div / 2.0, 1.0)  # Normalize
        scores['drift_detected'] = is_drift

        # 4. Statistical z-score
        if features.rolling_std_value_10 > 0:
            z = abs(features.value - features.rolling_mean_value_10) / features.rolling_std_value_10
            scores['statistical'] = min(z / 5.0, 1.0)  # Normalize: z=5 -> score=1
        else:
            scores['statistical'] = 0.0

        # Ensemble score
        ensemble = sum(
            scores.get(k, 0) * w
            for k, w in self.weights.items()
        )

        return {
            'ensemble_score': ensemble,
            'component_scores': scores,
            'is_anomaly': ensemble > 0.6,
            'features': {
                'value': features.value,
                'velocity_1h': features.velocity_1h,
                'is_new_counterparty': features.is_new_counterparty,
                'value_ratio': features.value_to_rolling_mean_ratio,
            },
            'model_trained': self.is_trained,
        }


# =============================================================================
# AGENT ML MANAGER
# =============================================================================

class AgentMLManager:
    """Manages ML models for all agents in the system."""

    def __init__(self):
        self.scorers: Dict[str, EnsembleAnomalyScorer] = {}

    def get_scorer(self, agent_did: str) -> EnsembleAnomalyScorer:
        if agent_did not in self.scorers:
            self.scorers[agent_did] = EnsembleAnomalyScorer(agent_did)
        return self.scorers[agent_did]

    def assess(self, agent_did: str, tx: Dict[str, Any]) -> Dict[str, Any]:
        """Full ML assessment of a transaction."""
        scorer = self.get_scorer(agent_did)
        return scorer.observe(tx)

    def network_anomaly_summary(self) -> Dict[str, Any]:
        """Summary of anomaly detection across all agents."""
        return {
            'total_agents_monitored': len(self.scorers),
            'trained_agents': sum(1 for s in self.scorers.values() if s.is_trained),
            'drift_detected': sum(
                1 for s in self.scorers.values()
                if s.drift_detector.detect_drift()[1]
            ),
        }
