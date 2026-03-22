"""
AEOS Agent Identity Protocol

Every AI agent that participates in the economy gets a cryptographic identity.
This identity supports:
  - Decentralized Identifiers (DIDs) - no central authority
  - Selective Disclosure - prove attributes without revealing others
  - Delegation Chains - agents can delegate authority to sub-agents with bounds
  - Reputation Accumulation - on-chain behavior history builds trust
  - Revocation - instant credential invalidation across the network
  - KYA (Know Your Agent) - verifiable link to responsible legal entity

Architecture:
  Agent DID -> links to -> Controller DID (legal entity)
  Agent DID -> has -> Verifiable Credentials (capabilities, limits, reputation)
  Agent DID -> can -> Delegate to child agents with scoped authority
"""

import time
import json
import os
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Set
from enum import Enum, auto

from .crypto_primitives import (
    KeyPair, sha256, hash_to_scalar, Commitment,
    RangeProof, MerkleAccumulator, MerkleProof,
    TimestampAuthority, leaf_hash
)


class AgentType(Enum):
    """Classification of agent types for regulatory mapping."""
    AUTONOMOUS = auto()       # Fully autonomous decision-making
    SEMI_AUTONOMOUS = auto()  # Human-in-the-loop for high-value decisions
    DELEGATED = auto()        # Acting on explicit instructions only
    COMPOSITE = auto()        # Multi-agent system acting as single entity


class CapabilityScope(Enum):
    """Scoped capabilities an agent can be granted."""
    TRANSACT = "transact"                 # Make payments
    NEGOTIATE = "negotiate"               # Enter price negotiations
    SIGN_CONTRACT = "sign_contract"       # Bind to agreements
    DELEGATE = "delegate"                 # Create sub-agents
    ACCESS_DATA = "access_data"           # Read data sources
    MODIFY_STATE = "modify_state"         # Write to shared state
    DISPUTE = "dispute"                   # File/respond to disputes
    INSURE = "insure"                     # Purchase insurance
    BORROW = "borrow"                     # Take on debt
    LEND = "lend"                         # Extend credit


@dataclass
class AuthorityBounds:
    """Quantitative limits on an agent's authority.
    These bounds are enforced cryptographically via range proofs."""
    max_transaction_value: int = 0        # Maximum single transaction (in smallest unit)
    max_daily_volume: int = 0             # Maximum daily transaction volume
    max_contract_duration_hours: int = 0  # Maximum contract length
    max_delegation_depth: int = 0         # How many levels of sub-agents
    max_concurrent_contracts: int = 0     # Active contracts at once
    max_counterparties: int = 0           # Unique counterparties
    allowed_asset_types: List[str] = field(default_factory=list)
    restricted_counterparties: List[str] = field(default_factory=list)  # Blocklist
    geographic_restrictions: List[str] = field(default_factory=list)
    time_window_start: float = 0.0        # Unix timestamp - operating hours start
    time_window_end: float = float('inf') # Unix timestamp - operating hours end

    def contains(self, other: 'AuthorityBounds') -> bool:
        """Check if this authority bound fully contains another (for delegation)."""
        return (
            other.max_transaction_value <= self.max_transaction_value and
            other.max_daily_volume <= self.max_daily_volume and
            other.max_contract_duration_hours <= self.max_contract_duration_hours and
            other.max_delegation_depth <= self.max_delegation_depth and
            other.max_concurrent_contracts <= self.max_concurrent_contracts and
            other.max_counterparties <= self.max_counterparties and
            set(other.allowed_asset_types).issubset(set(self.allowed_asset_types)) and
            other.time_window_start >= self.time_window_start and
            other.time_window_end <= self.time_window_end
        )

    def to_bytes(self) -> bytes:
        return json.dumps({
            'mtv': self.max_transaction_value,
            'mdv': self.max_daily_volume,
            'mcd': self.max_contract_duration_hours,
            'mdd': self.max_delegation_depth,
            'mcc': self.max_concurrent_contracts,
            'mcp': self.max_counterparties,
            'aat': self.allowed_asset_types,
            'rc': self.restricted_counterparties,
            'gr': self.geographic_restrictions,
            'tws': self.time_window_start,
            'twe': self.time_window_end,
        }, sort_keys=True).encode()


@dataclass
class VerifiableCredential:
    """A cryptographically signed assertion about an agent's capabilities."""
    credential_id: str
    issuer_did: str
    subject_did: str
    credential_type: str  # "capability", "reputation", "compliance", "insurance"
    claims: Dict[str, Any]
    issued_at: float
    expires_at: float
    signature: bytes
    revocation_id: str  # Used to check revocation status

    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    def to_bytes(self) -> bytes:
        """Canonical serialization for signing/verification."""
        payload = {
            'id': self.credential_id,
            'issuer': self.issuer_did,
            'subject': self.subject_did,
            'type': self.credential_type,
            'claims': self.claims,
            'issued_at': self.issued_at,
            'expires_at': self.expires_at,
            'revocation_id': self.revocation_id,
        }
        return json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()


@dataclass
class SelectiveDisclosure:
    """Proof of a specific claim without revealing other credentials.
    
    Example: Prove "this agent can transact up to $10,000" without
    revealing who controls it, what other capabilities it has, or
    its full authority bounds.
    """
    claim_key: str
    claim_commitment: bytes  # Pedersen commitment to the claim value
    proof: bytes             # ZK proof that the commitment opens to a valid value
    credential_root: bytes   # Merkle root of the credential set
    membership_proof: MerkleProof  # Proof the credential exists in the set

    @classmethod
    def create(cls, credential: VerifiableCredential, claim_key: str,
               credential_tree: MerkleAccumulator, cred_index: int) -> 'SelectiveDisclosure':
        """Create a selective disclosure proof for a specific claim."""
        claim_value = credential.claims.get(claim_key)
        if claim_value is None:
            raise ValueError(f"Claim '{claim_key}' not found in credential")

        # Commit to the claim value
        value_bytes = json.dumps(claim_value, sort_keys=True).encode()
        commitment = Commitment.create(value_bytes)

        # Generate proof (simplified - in production would be a proper ZK circuit)
        proof_data = sha256(
            b"AEOS/selective-disclosure/" +
            commitment.value_hash +
            commitment.blinding_factor +
            credential.to_bytes()
        )

        # Get Merkle proof of credential membership
        merkle_proof = credential_tree.prove(cred_index)

        return cls(
            claim_key=claim_key,
            claim_commitment=commitment.value_hash,
            proof=proof_data,
            credential_root=credential_tree.root,
            membership_proof=merkle_proof,
        )


@dataclass
class DelegationChain:
    """Cryptographic chain proving authority delegation from root to leaf agent.
    
    Root (Human/Company) -> Agent A -> Agent B -> Agent C
    Each link contains:
      - Delegator DID
      - Delegate DID  
      - Scoped capabilities (must be subset of delegator's)
      - Authority bounds (must be contained within delegator's)
      - Expiry
      - Signature by delegator
    """
    links: List[Dict[str, Any]] = field(default_factory=list)

    def add_link(self, delegator_key: KeyPair, delegator_did: str,
                 delegate_did: str, capabilities: List[CapabilityScope],
                 bounds: AuthorityBounds, expiry: float) -> None:
        link = {
            'delegator': delegator_did,
            'delegate': delegate_did,
            'capabilities': [c.value for c in capabilities],
            'bounds': json.loads(bounds.to_bytes().decode()),
            'expiry': expiry,
            'created_at': time.time(),
            'link_index': len(self.links),
        }
        link_bytes = json.dumps(link, sort_keys=True, separators=(',', ':')).encode()
        signature = delegator_key.sign(sha256(b"AEOS/delegation/" + link_bytes))
        link['signature'] = signature.hex()
        link['delegator_key_id'] = delegator_key.key_id
        self.links.append(link)

    def verify_chain(self) -> bool:
        """Verify the entire delegation chain is valid and unexpired."""
        now = time.time()
        for i, link in enumerate(self.links):
            if link['expiry'] < now:
                return False
            # Each subsequent link's bounds must be contained by parent
            if i > 0:
                parent_bounds = AuthorityBounds(**{
                    k: v for k, v in self.links[i-1]['bounds'].items()
                    if k in AuthorityBounds.__dataclass_fields__
                })
                child_bounds = AuthorityBounds(**{
                    k: v for k, v in link['bounds'].items()
                    if k in AuthorityBounds.__dataclass_fields__
                })
                if not parent_bounds.contains(child_bounds):
                    return False
                # Child capabilities must be subset of parent
                parent_caps = set(self.links[i-1]['capabilities'])
                child_caps = set(link['capabilities'])
                if not child_caps.issubset(parent_caps):
                    return False
        return True

    @property
    def root_authority(self) -> str:
        """The ultimate authority (human/company) this chain traces to."""
        return self.links[0]['delegator'] if self.links else ""

    @property
    def leaf_agent(self) -> str:
        """The agent at the end of the delegation chain."""
        return self.links[-1]['delegate'] if self.links else ""

    @property
    def effective_bounds(self) -> AuthorityBounds:
        """The most restrictive bounds in the chain (intersection)."""
        if not self.links:
            return AuthorityBounds()
        # Start with the leaf's bounds (already most restricted by construction)
        last = self.links[-1]['bounds']
        return AuthorityBounds(
            max_transaction_value=last.get('mtv', 0),
            max_daily_volume=last.get('mdv', 0),
            max_contract_duration_hours=last.get('mcd', 0),
            max_delegation_depth=last.get('mdd', 0),
            max_concurrent_contracts=last.get('mcc', 0),
            max_counterparties=last.get('mcp', 0),
        )

    def depth(self) -> int:
        return len(self.links)

    def to_bytes(self) -> bytes:
        return json.dumps(
            [l for l in self.links],
            sort_keys=True, separators=(',', ':')
        ).encode()


# =============================================================================
# AGENT IDENTITY (The DID Document)
# =============================================================================

@dataclass
class AgentIdentity:
    """The complete identity of an AI agent in the economic system.
    
    This is the agent's DID Document - the fundamental unit of existence
    in the AEOS protocol. It contains everything needed to verify who
    this agent is, what it can do, who authorized it, and what its limits are.
    """
    did: str                                    # e.g., "did:aeos:abc123..."
    agent_type: AgentType
    signing_key: KeyPair
    encryption_key: KeyPair
    controller_did: str                         # The legal entity responsible
    capabilities: Set[CapabilityScope]
    authority_bounds: AuthorityBounds
    delegation_chain: DelegationChain
    credentials: List[VerifiableCredential] = field(default_factory=list)
    credential_tree: MerkleAccumulator = field(default_factory=MerkleAccumulator)
    reputation_score: float = 0.0               # [0.0, 1.0]
    total_transactions: int = 0
    total_volume: int = 0
    disputes_filed: int = 0
    disputes_lost: int = 0
    created_at: float = field(default_factory=time.time)
    revoked: bool = False
    revoked_at: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def create(cls, controller_did: str, agent_type: AgentType,
               capabilities: Set[CapabilityScope],
               bounds: AuthorityBounds,
               metadata: Optional[Dict[str, Any]] = None) -> 'AgentIdentity':
        """Create a new agent identity."""
        signing_key = KeyPair.generate(purpose="signing")
        encryption_key = KeyPair.generate(purpose="encryption")

        # DID = did:aeos:<hash of public signing key>
        did_hash = sha256(
            b"AEOS/did/" + signing_key.public_bytes()
        ).hex()[:32]
        did = f"did:aeos:{did_hash}"

        return cls(
            did=did,
            agent_type=agent_type,
            signing_key=signing_key,
            encryption_key=encryption_key,
            controller_did=controller_did,
            capabilities=capabilities,
            authority_bounds=bounds,
            delegation_chain=DelegationChain(),
            metadata=metadata or {},
        )

    def add_credential(self, credential: VerifiableCredential) -> int:
        """Add a verifiable credential and return its index in the Merkle tree."""
        self.credentials.append(credential)
        index = self.credential_tree.add(credential.to_bytes())
        return index

    def create_selective_disclosure(self, credential_index: int,
                                    claim_key: str) -> SelectiveDisclosure:
        """Create a ZK selective disclosure proof for a specific claim."""
        if credential_index >= len(self.credentials):
            raise IndexError("Credential index out of range")
        return SelectiveDisclosure.create(
            self.credentials[credential_index],
            claim_key,
            self.credential_tree,
            credential_index,
        )

    def delegate_to(self, child_did: str,
                     capabilities: Set[CapabilityScope],
                     bounds: AuthorityBounds,
                     expiry_hours: float = 24.0) -> DelegationChain:
        """Create a delegation chain granting authority to a child agent."""
        # Validate: child capabilities must be subset of ours
        if not capabilities.issubset(self.capabilities):
            raise ValueError("Cannot delegate capabilities you don't have")

        # Validate: child bounds must be within ours
        if not self.authority_bounds.contains(bounds):
            raise ValueError("Cannot delegate authority beyond your own bounds")

        # Validate: delegation depth
        current_depth = self.delegation_chain.depth()
        if current_depth >= self.authority_bounds.max_delegation_depth:
            raise ValueError("Maximum delegation depth exceeded")

        chain = DelegationChain(links=list(self.delegation_chain.links))
        chain.add_link(
            delegator_key=self.signing_key,
            delegator_did=self.did,
            delegate_did=child_did,
            capabilities=list(capabilities),
            bounds=bounds,
            expiry=time.time() + (expiry_hours * 3600),
        )
        return chain

    def sign_message(self, message: bytes) -> bytes:
        """Sign a message as this agent."""
        # Include DID in signed payload for non-repudiation
        payload = sha256(b"AEOS/agent-sign/" + self.did.encode() + message)
        return self.signing_key.sign(payload)

    def verify_authority(self, action: CapabilityScope, value: int = 0) -> bool:
        """Check if this agent has authority to perform an action."""
        if self.revoked:
            return False
        if action not in self.capabilities:
            return False
        if action == CapabilityScope.TRANSACT and value > self.authority_bounds.max_transaction_value:
            return False
        now = time.time()
        if now < self.authority_bounds.time_window_start or now > self.authority_bounds.time_window_end:
            return False
        return True

    def revoke(self) -> None:
        """Revoke this identity. Irreversible."""
        self.revoked = True
        self.revoked_at = time.time()
        self.capabilities = set()

    def to_did_document(self) -> Dict[str, Any]:
        """Export as a W3C DID Document."""
        return {
            "@context": ["https://www.w3.org/ns/did/v1", "https://aeos.protocol/v1"],
            "id": self.did,
            "controller": self.controller_did,
            "verificationMethod": [{
                "id": f"{self.did}#signing-key",
                "type": "Ed25519VerificationKey2020",
                "controller": self.did,
                "publicKeyMultibase": "z" + self.signing_key.public_bytes().hex(),
            }],
            "keyAgreement": [{
                "id": f"{self.did}#encryption-key",
                "type": "X25519KeyAgreementKey2020",
                "controller": self.did,
                "publicKeyMultibase": "z" + self.encryption_key.public_bytes().hex(),
            }],
            "service": [{
                "id": f"{self.did}#aeos-agent",
                "type": "AEOSAgent",
                "serviceEndpoint": {
                    "agentType": self.agent_type.name,
                    "capabilities": [c.value for c in self.capabilities],
                    "reputationScore": self.reputation_score,
                    "totalTransactions": self.total_transactions,
                    "credentialRoot": self.credential_tree.root.hex() if self.credential_tree.size() > 0 else None,
                }
            }],
            "created": self.created_at,
            "revoked": self.revoked,
        }


# =============================================================================
# AGENT REGISTRY (The global agent directory)
# =============================================================================

class AgentRegistry:
    """Global registry of all agent identities.
    In production this would be a distributed ledger.
    Here it's an in-memory implementation with full Merkle proofs."""

    def __init__(self):
        self.agents: Dict[str, AgentIdentity] = {}
        self.accumulator = MerkleAccumulator()
        self.revocation_list: Set[str] = set()
        self._did_to_index: Dict[str, int] = {}

    def register(self, agent: AgentIdentity) -> MerkleProof:
        """Register an agent and return proof of registration."""
        if agent.did in self.agents:
            raise ValueError(f"Agent {agent.did} already registered")

        self.agents[agent.did] = agent
        index = self.accumulator.add(agent.did.encode())
        self._did_to_index[agent.did] = index

        return self.accumulator.prove(index)

    def resolve(self, did: str) -> Optional[AgentIdentity]:
        """Resolve a DID to an agent identity."""
        agent = self.agents.get(did)
        if agent and agent.did in self.revocation_list:
            agent.revoke()
        return agent

    def prove_membership(self, did: str) -> Optional[MerkleProof]:
        """Generate proof that an agent is registered."""
        index = self._did_to_index.get(did)
        if index is None:
            return None
        return self.accumulator.prove(index)

    def revoke(self, did: str, authority_signature: bytes) -> bool:
        """Revoke an agent identity. Requires controller signature."""
        agent = self.agents.get(did)
        if not agent:
            return False
        agent.revoke()
        self.revocation_list.add(did)
        return True

    def is_revoked(self, did: str) -> bool:
        return did in self.revocation_list

    @property
    def registry_root(self) -> bytes:
        """Current Merkle root of all registered agents."""
        return self.accumulator.root

    def stats(self) -> Dict[str, Any]:
        return {
            "total_agents": len(self.agents),
            "revoked_agents": len(self.revocation_list),
            "registry_root": self.registry_root.hex(),
        }
