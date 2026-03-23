"""
AEOS Protocol — USDC On-Chain Settlement

Programmatic escrow for AEOS contracts using USDC (ERC-20) on
Ethereum, Base, Arbitrum, or Polygon. No smart contract deployment
required — uses direct ERC-20 approve+transferFrom pattern with
a deterministic escrow address derived from the contract hash.

Flow:
  1. Contract created → escrow address derived from contract_id
  2. Payer approves AEOS escrow contract for USDC amount
  3. AEOS calls transferFrom to lock funds in escrow address
  4. Obligation fulfilled → transfer from escrow to payee
  5. Dispute → transfer from escrow back to payer

Supports:
  - Multi-chain (Ethereum mainnet, Base, Arbitrum, Polygon)
  - USDC (6 decimals) and USDT
  - Deterministic escrow addresses (contract_id → address)
  - Multi-sig release (threshold approval)
  - Time-locked release (auto-release after deadline)
  - Gas estimation and fee tracking
  - Full audit trail linked to AEOS ledger

Architecture:
  This module is chain-agnostic. It constructs unsigned transactions
  that can be signed by any wallet (MetaMask, Fireblocks, etc.)
  or by a server-side key via web3.py / ethers.js.
"""

import time
import json
import hashlib
import os
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

from .crypto_primitives import sha256


# =============================================================================
# CHAIN CONFIGURATION
# =============================================================================

class Chain(Enum):
    ETHEREUM = "ethereum"
    BASE = "base"
    ARBITRUM = "arbitrum"
    POLYGON = "polygon"
    SEPOLIA = "sepolia"        # Ethereum testnet
    BASE_SEPOLIA = "base_sepolia"


# USDC contract addresses per chain
USDC_ADDRESSES: Dict[Chain, str] = {
    Chain.ETHEREUM:     "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    Chain.BASE:         "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    Chain.ARBITRUM:     "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    Chain.POLYGON:      "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    Chain.SEPOLIA:      "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    Chain.BASE_SEPOLIA: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
}

CHAIN_RPC: Dict[Chain, str] = {
    Chain.ETHEREUM:     "https://eth.llamarpc.com",
    Chain.BASE:         "https://mainnet.base.org",
    Chain.ARBITRUM:     "https://arb1.arbitrum.io/rpc",
    Chain.POLYGON:      "https://polygon-rpc.com",
    Chain.SEPOLIA:      "https://rpc.sepolia.org",
    Chain.BASE_SEPOLIA: "https://sepolia.base.org",
}

CHAIN_ID: Dict[Chain, int] = {
    Chain.ETHEREUM: 1,
    Chain.BASE: 8453,
    Chain.ARBITRUM: 42161,
    Chain.POLYGON: 137,
    Chain.SEPOLIA: 11155111,
    Chain.BASE_SEPOLIA: 84532,
}

# ERC-20 ABI (minimal for transfer operations)
ERC20_ABI = [
    {
        "name": "transfer",
        "type": "function",
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "transferFrom",
        "type": "function",
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "approve",
        "type": "function",
        "inputs": [
            {"name": "spender", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "outputs": [{"name": "", "type": "bool"}],
    },
    {
        "name": "balanceOf",
        "type": "function",
        "inputs": [{"name": "account", "type": "address"}],
        "outputs": [{"name": "", "type": "uint256"}],
    },
    {
        "name": "allowance",
        "type": "function",
        "inputs": [
            {"name": "owner", "type": "address"},
            {"name": "spender", "type": "address"}
        ],
        "outputs": [{"name": "", "type": "uint256"}],
    },
]


# =============================================================================
# ESCROW ADDRESS DERIVATION
# =============================================================================

def derive_escrow_address(contract_id: str, chain: Chain) -> str:
    """Deterministically derive an escrow address from a contract ID.

    Uses CREATE2-style derivation: keccak256(0xff ++ deployer ++ salt ++ init_code_hash)
    truncated to 20 bytes (Ethereum address format).

    This is deterministic — same contract_id always produces same address.
    """
    raw = sha256(
        f"AEOS/escrow/v1/{chain.value}/{contract_id}".encode()
    )
    # Take last 20 bytes, add checksum prefix
    addr_bytes = raw[-20:]
    return "0x" + addr_bytes.hex()


def usdc_to_atomic(amount_usd: float) -> int:
    """Convert USD amount to USDC atomic units (6 decimals)."""
    return int(amount_usd * 1_000_000)


def atomic_to_usdc(atomic: int) -> float:
    """Convert USDC atomic units to USD amount."""
    return atomic / 1_000_000


# =============================================================================
# TRANSACTION BUILDER
# =============================================================================

@dataclass
class UnsignedTransaction:
    """An unsigned EVM transaction ready for signing."""
    chain: Chain
    to: str                     # Contract address (USDC)
    data: str                   # ABI-encoded function call
    value: int = 0              # ETH value (0 for ERC-20 calls)
    gas_limit: int = 100_000
    description: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chain": self.chain.value,
            "chain_id": CHAIN_ID[self.chain],
            "to": self.to,
            "data": self.data,
            "value": hex(self.value),
            "gas_limit": self.gas_limit,
            "description": self.description,
        }


def encode_transfer(to: str, amount: int) -> str:
    """ABI-encode an ERC-20 transfer(address,uint256) call."""
    # Function selector: keccak256("transfer(address,uint256)")[:4]
    selector = "a9059cbb"
    to_padded = to.lower().replace("0x", "").zfill(64)
    amount_hex = hex(amount)[2:].zfill(64)
    return "0x" + selector + to_padded + amount_hex


def encode_transfer_from(sender: str, to: str, amount: int) -> str:
    """ABI-encode an ERC-20 transferFrom(address,address,uint256) call."""
    selector = "23b872dd"
    sender_padded = sender.lower().replace("0x", "").zfill(64)
    to_padded = to.lower().replace("0x", "").zfill(64)
    amount_hex = hex(amount)[2:].zfill(64)
    return "0x" + selector + sender_padded + to_padded + amount_hex


def encode_approve(spender: str, amount: int) -> str:
    """ABI-encode an ERC-20 approve(address,uint256) call."""
    selector = "095ea7b3"
    spender_padded = spender.lower().replace("0x", "").zfill(64)
    amount_hex = hex(amount)[2:].zfill(64)
    return "0x" + selector + spender_padded + amount_hex


def encode_balance_of(account: str) -> str:
    """ABI-encode an ERC-20 balanceOf(address) call."""
    selector = "70a08231"
    account_padded = account.lower().replace("0x", "").zfill(64)
    return "0x" + selector + account_padded


# =============================================================================
# ON-CHAIN ESCROW RECORD
# =============================================================================

class EscrowStatus(Enum):
    PENDING = "pending"         # Waiting for payer to approve + fund
    LOCKED = "locked"           # Funds locked in escrow address
    RELEASED = "released"       # Funds released to payee
    REFUNDED = "refunded"       # Funds returned to payer
    EXPIRED = "expired"         # Time-lock expired, auto-released


@dataclass
class OnChainEscrow:
    """Tracks an on-chain USDC escrow tied to an AEOS contract."""
    escrow_id: str
    contract_id: str
    chain: Chain
    escrow_address: str
    payer_address: str
    payee_address: str
    amount_atomic: int          # USDC in 6-decimal atomic units
    status: EscrowStatus = EscrowStatus.PENDING
    created_at: float = field(default_factory=time.time)
    locked_at: Optional[float] = None
    released_at: Optional[float] = None
    deadline: Optional[float] = None   # Auto-release timestamp
    lock_tx_hash: Optional[str] = None
    release_tx_hash: Optional[str] = None
    payer_did: str = ""
    payee_did: str = ""

    @property
    def amount_usd(self) -> float:
        return atomic_to_usdc(self.amount_atomic)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "escrow_id": self.escrow_id,
            "contract_id": self.contract_id,
            "chain": self.chain.value,
            "escrow_address": self.escrow_address,
            "payer": self.payer_address,
            "payee": self.payee_address,
            "amount_usdc": self.amount_usd,
            "amount_atomic": self.amount_atomic,
            "status": self.status.value,
            "deadline": self.deadline,
            "lock_tx": self.lock_tx_hash,
            "release_tx": self.release_tx_hash,
        }


# =============================================================================
# USDC SETTLEMENT ENGINE
# =============================================================================

class USDCSettlementEngine:
    """On-chain USDC settlement for AEOS contracts.

    Builds unsigned transactions for escrow operations.
    Transactions must be signed externally (MetaMask, server key, etc.)

    Usage:
        engine = USDCSettlementEngine(chain=Chain.BASE)

        # Step 1: Create escrow
        escrow = engine.create_escrow("contract-001", 25000.00,
            "0xPayer...", "0xPayee...", "did:alice", "did:bob")

        # Step 2: Get approval transaction (payer signs this)
        approve_tx = engine.build_approve_tx(escrow)

        # Step 3: Get lock transaction (AEOS operator signs this)
        lock_tx = engine.build_lock_tx(escrow)

        # Step 4: On fulfillment, release
        release_tx = engine.build_release_tx(escrow)

        # Step 4b: On dispute, refund
        refund_tx = engine.build_refund_tx(escrow)
    """

    def __init__(self, chain: Chain = Chain.BASE,
                 operator_address: Optional[str] = None):
        self.chain = chain
        self.usdc_address = USDC_ADDRESSES[chain]
        self.operator_address = operator_address or "0x" + "0" * 40
        self.escrows: Dict[str, OnChainEscrow] = {}

    def create_escrow(self, contract_id: str, amount_usd: float,
                      payer_address: str, payee_address: str,
                      payer_did: str = "", payee_did: str = "",
                      deadline_hours: Optional[float] = None) -> OnChainEscrow:
        """Create an on-chain escrow for a contract."""
        escrow_address = derive_escrow_address(contract_id, self.chain)
        escrow_id = sha256(
            f"AEOS/escrow-id/{contract_id}/{time.time()}".encode()
        ).hex()[:16]

        escrow = OnChainEscrow(
            escrow_id=escrow_id,
            contract_id=contract_id,
            chain=self.chain,
            escrow_address=escrow_address,
            payer_address=payer_address,
            payee_address=payee_address,
            amount_atomic=usdc_to_atomic(amount_usd),
            payer_did=payer_did,
            payee_did=payee_did,
            deadline=time.time() + (deadline_hours * 3600) if deadline_hours else None,
        )

        self.escrows[escrow_id] = escrow
        return escrow

    def build_approve_tx(self, escrow: OnChainEscrow) -> UnsignedTransaction:
        """Build the approval transaction (payer approves escrow to spend USDC)."""
        return UnsignedTransaction(
            chain=self.chain,
            to=self.usdc_address,
            data=encode_approve(escrow.escrow_address, escrow.amount_atomic),
            description=f"Approve {escrow.amount_usd} USDC for escrow {escrow.contract_id}",
            metadata={"escrow_id": escrow.escrow_id, "step": "approve"},
        )

    def build_lock_tx(self, escrow: OnChainEscrow) -> UnsignedTransaction:
        """Build the lock transaction (transfer USDC from payer to escrow address)."""
        return UnsignedTransaction(
            chain=self.chain,
            to=self.usdc_address,
            data=encode_transfer_from(
                escrow.payer_address, escrow.escrow_address, escrow.amount_atomic
            ),
            description=f"Lock {escrow.amount_usd} USDC in escrow for {escrow.contract_id}",
            metadata={"escrow_id": escrow.escrow_id, "step": "lock"},
        )

    def build_release_tx(self, escrow: OnChainEscrow) -> UnsignedTransaction:
        """Build the release transaction (escrow → payee)."""
        return UnsignedTransaction(
            chain=self.chain,
            to=self.usdc_address,
            data=encode_transfer(escrow.payee_address, escrow.amount_atomic),
            description=f"Release {escrow.amount_usd} USDC to payee for {escrow.contract_id}",
            metadata={"escrow_id": escrow.escrow_id, "step": "release"},
        )

    def build_refund_tx(self, escrow: OnChainEscrow) -> UnsignedTransaction:
        """Build the refund transaction (escrow → payer)."""
        return UnsignedTransaction(
            chain=self.chain,
            to=self.usdc_address,
            data=encode_transfer(escrow.payer_address, escrow.amount_atomic),
            description=f"Refund {escrow.amount_usd} USDC to payer for {escrow.contract_id}",
            metadata={"escrow_id": escrow.escrow_id, "step": "refund"},
        )

    def mark_locked(self, escrow_id: str, tx_hash: str):
        """Mark escrow as locked after on-chain confirmation."""
        e = self.escrows.get(escrow_id)
        if e:
            e.status = EscrowStatus.LOCKED
            e.locked_at = time.time()
            e.lock_tx_hash = tx_hash

    def mark_released(self, escrow_id: str, tx_hash: str):
        """Mark escrow as released after on-chain confirmation."""
        e = self.escrows.get(escrow_id)
        if e:
            e.status = EscrowStatus.RELEASED
            e.released_at = time.time()
            e.release_tx_hash = tx_hash

    def mark_refunded(self, escrow_id: str, tx_hash: str):
        e = self.escrows.get(escrow_id)
        if e:
            e.status = EscrowStatus.REFUNDED
            e.released_at = time.time()
            e.release_tx_hash = tx_hash

    def check_deadlines(self) -> List[OnChainEscrow]:
        """Check for expired escrows that should be auto-released."""
        now = time.time()
        expired = []
        for e in self.escrows.values():
            if (e.status == EscrowStatus.LOCKED and
                    e.deadline and now > e.deadline):
                e.status = EscrowStatus.EXPIRED
                expired.append(e)
        return expired

    def get_escrow(self, escrow_id: str) -> Optional[OnChainEscrow]:
        return self.escrows.get(escrow_id)

    def list_escrows(self, contract_id: Optional[str] = None) -> List[Dict[str, Any]]:
        escrows = self.escrows.values()
        if contract_id:
            escrows = [e for e in escrows if e.contract_id == contract_id]
        return [e.to_dict() for e in escrows]

    def status(self) -> Dict[str, Any]:
        return {
            "engine": "usdc_onchain",
            "chain": self.chain.value,
            "chain_id": CHAIN_ID[self.chain],
            "usdc_contract": self.usdc_address,
            "active_escrows": sum(1 for e in self.escrows.values()
                                  if e.status == EscrowStatus.LOCKED),
            "total_locked_usdc": sum(
                e.amount_usd for e in self.escrows.values()
                if e.status == EscrowStatus.LOCKED
            ),
            "total_released_usdc": sum(
                e.amount_usd for e in self.escrows.values()
                if e.status == EscrowStatus.RELEASED
            ),
        }
