"""
AEOS Graph Intelligence

Network-level analysis of the agent economy. Models the entire transaction
network as a graph and applies advanced algorithms for:

  - Trust Propagation: PageRank-style trust scoring through the network
  - Collusion Detection: Identify suspiciously coordinated agent clusters
  - Systemic Risk: Model cascade failure propagation through counterparty chains
  - Community Detection: Find natural economic communities (supply chains, markets)
  - Sybil Detection: Identify fake identity networks
  - Concentration Risk: Measure network centrality to identify single points of failure
"""

import math
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional, Any

import numpy as np


@dataclass
class Edge:
    """A directed edge in the transaction graph."""
    source: str          # Source agent DID
    target: str          # Target agent DID
    weight: float        # Total transaction volume
    count: int           # Number of transactions
    avg_value: float     # Average transaction value
    last_tx: float       # Timestamp of last transaction
    contracts: int       # Number of contracts between these agents
    disputes: int        # Number of disputes between them


@dataclass
class NodeMetrics:
    """Computed metrics for a single node (agent) in the graph."""
    did: str
    in_degree: int = 0
    out_degree: int = 0
    total_degree: int = 0
    in_volume: float = 0.0
    out_volume: float = 0.0
    pagerank: float = 0.0
    trust_score: float = 0.0
    betweenness_centrality: float = 0.0
    clustering_coefficient: float = 0.0
    community_id: int = -1
    is_bridge: bool = False            # Critical connection between communities
    sybil_probability: float = 0.0
    systemic_risk_contribution: float = 0.0


class TransactionGraph:
    """The economic graph of all agent interactions."""

    def __init__(self):
        self.edges: Dict[Tuple[str, str], Edge] = {}
        self.adjacency: Dict[str, Set[str]] = defaultdict(set)  # outgoing
        self.reverse_adjacency: Dict[str, Set[str]] = defaultdict(set)  # incoming
        self.nodes: Set[str] = set()
        self.node_metrics: Dict[str, NodeMetrics] = {}
        self._dirty = True  # Metrics need recomputation

    def add_transaction(self, source: str, target: str, value: float,
                        is_contract: bool = False, is_dispute: bool = False):
        """Record a transaction in the graph."""
        self.nodes.add(source)
        self.nodes.add(target)
        self.adjacency[source].add(target)
        self.reverse_adjacency[target].add(source)

        key = (source, target)
        if key in self.edges:
            edge = self.edges[key]
            edge.count += 1
            edge.weight += value
            edge.avg_value = edge.weight / edge.count
            edge.last_tx = time.time()
            if is_contract:
                edge.contracts += 1
            if is_dispute:
                edge.disputes += 1
        else:
            self.edges[key] = Edge(
                source=source, target=target,
                weight=value, count=1, avg_value=value,
                last_tx=time.time(),
                contracts=1 if is_contract else 0,
                disputes=1 if is_dispute else 0,
            )
        self._dirty = True

    # =========================================================================
    # PAGERANK TRUST PROPAGATION
    # =========================================================================

    def compute_pagerank(self, damping: float = 0.85, iterations: int = 100,
                          tolerance: float = 1e-8) -> Dict[str, float]:
        """Compute PageRank-style trust scores.
        
        Trust propagates through the network: an agent is trustworthy if
        it transacts with other trustworthy agents. Weighted by volume.
        """
        n = len(self.nodes)
        if n == 0:
            return {}

        nodes = list(self.nodes)
        node_idx = {node: i for i, node in enumerate(nodes)}

        # Initialize
        pr = np.ones(n) / n

        for _ in range(iterations):
            pr_new = np.ones(n) * (1 - damping) / n

            for node in nodes:
                i = node_idx[node]
                outgoing = self.adjacency.get(node, set())
                if not outgoing:
                    # Dangling node: distribute equally
                    pr_new += damping * pr[i] / n
                    continue

                # Weight by transaction volume
                total_weight = sum(
                    self.edges.get((node, t), Edge(node, t, 0, 0, 0, 0, 0, 0)).weight
                    for t in outgoing
                )
                if total_weight == 0:
                    total_weight = 1

                for target in outgoing:
                    j = node_idx[target]
                    edge = self.edges.get((node, target))
                    weight_frac = edge.weight / total_weight if edge else 1.0 / len(outgoing)
                    pr_new[j] += damping * pr[i] * weight_frac

            # Check convergence
            if np.sum(np.abs(pr_new - pr)) < tolerance:
                pr = pr_new
                break
            pr = pr_new

        result = {nodes[i]: float(pr[i]) for i in range(n)}
        for did, score in result.items():
            if did not in self.node_metrics:
                self.node_metrics[did] = NodeMetrics(did=did)
            self.node_metrics[did].pagerank = score
            self.node_metrics[did].trust_score = score

        return result

    # =========================================================================
    # COLLUSION DETECTION
    # =========================================================================

    def detect_collusion_clusters(self, min_cluster_size: int = 3,
                                    reciprocity_threshold: float = 0.7,
                                    timing_window: float = 60.0) -> List[Dict[str, Any]]:
        """Detect clusters of agents that may be colluding.
        
        Collusion signals:
        1. High reciprocity: A->B and B->A with similar volumes
        2. Tight timing: Transactions happen in suspiciously close time windows
        3. Circular flows: A->B->C->A (layering pattern)
        4. Synchronized behavior: Multiple agents change behavior simultaneously
        """
        suspicious_clusters = []

        # 1. Find highly reciprocal pairs
        reciprocal_pairs = []
        for (s, t), edge in self.edges.items():
            reverse_edge = self.edges.get((t, s))
            if reverse_edge:
                # Reciprocity ratio: how similar are the volumes?
                ratio = min(edge.weight, reverse_edge.weight) / max(edge.weight, reverse_edge.weight)
                if ratio > reciprocity_threshold:
                    reciprocal_pairs.append((s, t, ratio))

        # 2. Find cycles (circular flows) using DFS
        cycles = self._find_short_cycles(max_length=5)

        # 3. Cluster reciprocal pairs using connected components
        pair_graph: Dict[str, Set[str]] = defaultdict(set)
        for s, t, _ in reciprocal_pairs:
            pair_graph[s].add(t)
            pair_graph[t].add(s)

        visited = set()
        for node in pair_graph:
            if node in visited:
                continue
            cluster = set()
            queue = deque([node])
            while queue:
                current = queue.popleft()
                if current in visited:
                    continue
                visited.add(current)
                cluster.add(current)
                for neighbor in pair_graph[current]:
                    if neighbor not in visited:
                        queue.append(neighbor)

            if len(cluster) >= min_cluster_size:
                # Score the cluster
                internal_volume = sum(
                    self.edges[(s, t)].weight
                    for s in cluster for t in cluster
                    if (s, t) in self.edges
                )
                internal_count = sum(
                    self.edges[(s, t)].count
                    for s in cluster for t in cluster
                    if (s, t) in self.edges
                )

                cycle_involvement = sum(
                    1 for cycle in cycles
                    if any(n in cluster for n in cycle)
                )

                suspicious_clusters.append({
                    'agents': list(cluster),
                    'size': len(cluster),
                    'internal_volume': internal_volume,
                    'internal_transactions': internal_count,
                    'cycle_involvement': cycle_involvement,
                    'suspicion_score': min(1.0,
                        len(cluster) / 10.0 * 0.3 +
                        min(internal_count / 50.0, 1.0) * 0.3 +
                        min(cycle_involvement / 3.0, 1.0) * 0.4
                    ),
                })

        return sorted(suspicious_clusters, key=lambda x: x['suspicion_score'], reverse=True)

    def _find_short_cycles(self, max_length: int = 5) -> List[List[str]]:
        """Find short cycles in the directed graph (potential layering)."""
        cycles = []
        for start in self.nodes:
            self._dfs_cycles(start, start, [start], set(), cycles, max_length)
            if len(cycles) > 100:  # Cap for performance
                break
        return cycles

    def _dfs_cycles(self, start: str, current: str, path: List[str],
                     visited: Set[str], cycles: List[List[str]], max_length: int):
        if len(path) > max_length:
            return
        for neighbor in self.adjacency.get(current, set()):
            if neighbor == start and len(path) >= 3:
                cycles.append(list(path))
            elif neighbor not in visited and len(path) < max_length:
                visited.add(neighbor)
                path.append(neighbor)
                self._dfs_cycles(start, neighbor, path, visited, cycles, max_length)
                path.pop()
                visited.discard(neighbor)

    # =========================================================================
    # SYSTEMIC RISK PROPAGATION
    # =========================================================================

    def simulate_cascade(self, failed_agent: str,
                          contagion_probability: float = 0.3,
                          simulations: int = 1000) -> Dict[str, Any]:
        """Monte Carlo simulation of cascade failures.
        
        If agent X fails, what's the probability that each other agent
        is affected through counterparty exposure?
        
        This answers: "How systemically important is this agent?"
        """
        if failed_agent not in self.nodes:
            return {"error": "Agent not in graph"}

        failure_counts: Dict[str, int] = defaultdict(int)
        total_cascade_sizes = []

        for _ in range(simulations):
            failed = {failed_agent}
            queue = deque([failed_agent])

            while queue:
                agent = queue.popleft()
                # Check each counterparty
                for neighbor in self.adjacency.get(agent, set()):
                    if neighbor in failed:
                        continue
                    # Probability of contagion based on exposure
                    edge = self.edges.get((agent, neighbor))
                    if edge:
                        # Higher exposure = higher contagion probability
                        exposure_factor = min(edge.weight / 1_000_000, 1.0)
                        prob = contagion_probability * (0.5 + 0.5 * exposure_factor)
                        if np.random.random() < prob:
                            failed.add(neighbor)
                            failure_counts[neighbor] += 1
                            queue.append(neighbor)

                # Also check reverse (agents that depend on this one)
                for neighbor in self.reverse_adjacency.get(agent, set()):
                    if neighbor in failed:
                        continue
                    edge = self.edges.get((neighbor, agent))
                    if edge:
                        exposure_factor = min(edge.weight / 1_000_000, 1.0)
                        prob = contagion_probability * (0.3 + 0.7 * exposure_factor)
                        if np.random.random() < prob:
                            failed.add(neighbor)
                            failure_counts[neighbor] += 1
                            queue.append(neighbor)

            total_cascade_sizes.append(len(failed) - 1)

        # Compute results
        cascade_probs = {
            agent: count / simulations
            for agent, count in failure_counts.items()
        }

        avg_cascade = np.mean(total_cascade_sizes) if total_cascade_sizes else 0
        max_cascade = max(total_cascade_sizes) if total_cascade_sizes else 0

        # Systemic importance score
        systemic_score = avg_cascade / max(len(self.nodes) - 1, 1)

        if failed_agent in self.node_metrics:
            self.node_metrics[failed_agent].systemic_risk_contribution = systemic_score

        return {
            'failed_agent': failed_agent,
            'avg_cascade_size': float(avg_cascade),
            'max_cascade_size': int(max_cascade),
            'systemic_importance': float(systemic_score),
            'contagion_probabilities': dict(sorted(
                cascade_probs.items(), key=lambda x: x[1], reverse=True
            )[:20]),
            'simulations': simulations,
        }

    # =========================================================================
    # SYBIL DETECTION
    # =========================================================================

    def detect_sybil_clusters(self, trust_seeds: Set[str],
                                max_iterations: int = 20) -> Dict[str, float]:
        """SybilRank-inspired detection of fake identity networks.
        
        Starting from known-good "trust seed" nodes, propagate trust through
        the network. Nodes that receive little trust despite having many
        connections are likely Sybil (fake) identities.
        
        Key insight: an attacker can create many fake identities, but
        creating genuine economic connections to trusted agents is expensive.
        """
        n = len(self.nodes)
        if n == 0:
            return {}

        nodes = list(self.nodes)
        node_idx = {node: i for i, node in enumerate(nodes)}

        # Initialize: trust seeds get trust = 1/|seeds|, others get 0
        trust = np.zeros(n)
        for seed in trust_seeds:
            if seed in node_idx:
                trust[node_idx[seed]] = 1.0 / len(trust_seeds)

        # Propagate trust (similar to PageRank but from seeds)
        for _ in range(max_iterations):
            new_trust = np.zeros(n)
            for node in nodes:
                i = node_idx[node]
                neighbors = self.adjacency.get(node, set()) | self.reverse_adjacency.get(node, set())
                degree = len(neighbors)
                if degree == 0:
                    continue
                share = trust[i] / degree
                for neighbor in neighbors:
                    j = node_idx[neighbor]
                    new_trust[j] += share
            trust = new_trust

        # Normalize by degree: Sybil nodes have high degree but low trust-per-degree
        sybil_scores = {}
        for node in nodes:
            i = node_idx[node]
            degree = len(self.adjacency.get(node, set())) + len(self.reverse_adjacency.get(node, set()))
            if degree > 0:
                trust_per_degree = trust[i] / degree
                # Low trust-per-degree = likely Sybil
                sybil_scores[node] = 1.0 - min(trust_per_degree * n, 1.0)
            else:
                sybil_scores[node] = 0.5  # Unknown

            if node in self.node_metrics:
                self.node_metrics[node].sybil_probability = sybil_scores[node]

        return sybil_scores

    # =========================================================================
    # NETWORK STATISTICS
    # =========================================================================

    def compute_all_metrics(self, trust_seeds: Optional[Set[str]] = None):
        """Compute all graph metrics."""
        self.compute_pagerank()
        if trust_seeds:
            self.detect_sybil_clusters(trust_seeds)

        # Basic degree metrics
        for node in self.nodes:
            if node not in self.node_metrics:
                self.node_metrics[node] = NodeMetrics(did=node)
            m = self.node_metrics[node]
            m.out_degree = len(self.adjacency.get(node, set()))
            m.in_degree = len(self.reverse_adjacency.get(node, set()))
            m.total_degree = m.in_degree + m.out_degree
            m.out_volume = sum(
                self.edges[(node, t)].weight
                for t in self.adjacency.get(node, set())
                if (node, t) in self.edges
            )
            m.in_volume = sum(
                self.edges[(s, node)].weight
                for s in self.reverse_adjacency.get(node, set())
                if (s, node) in self.edges
            )

        self._dirty = False

    def network_summary(self) -> Dict[str, Any]:
        """High-level network statistics."""
        if self._dirty:
            self.compute_all_metrics()

        total_volume = sum(e.weight for e in self.edges.values())
        total_tx = sum(e.count for e in self.edges.values())

        return {
            'total_nodes': len(self.nodes),
            'total_edges': len(self.edges),
            'total_volume': total_volume,
            'total_transactions': total_tx,
            'avg_degree': np.mean([
                m.total_degree for m in self.node_metrics.values()
            ]) if self.node_metrics else 0,
            'density': len(self.edges) / max(len(self.nodes) * (len(self.nodes) - 1), 1),
            'top_pagerank': sorted(
                [(did, m.pagerank) for did, m in self.node_metrics.items()],
                key=lambda x: x[1], reverse=True
            )[:5],
        }
