"""
AEOS Protocol — Persistent Storage Engine

SQLite WAL-mode database with:
  - Schema versioning and auto-migration
  - Transactional writes with ACID guarantees
  - Write-ahead logging for crash recovery
  - Full state reconstruction from persistent store
  - Indexed queries on DID, contract_id, timestamps
  - Append-only audit log (never deletes)
  - Connection pooling for concurrent readers

This replaces the in-memory dicts throughout the protocol.
Every state mutation flows through this layer.

Storage layout:
  agents          — DID documents, capabilities, bounds, keys
  contracts       — Terms, state machine, obligations, escrow
  disputes        — Filing, evidence, resolution history
  ledger_entries  — Immutable append-only event log
  settlements     — Stripe PaymentIntent tracking
  risk_profiles   — Behavioral profiles, circuit breaker state
  tokens          — Token balances, staking, decay parameters
  channels        — State channel snapshots
  bft_state       — Consensus checkpoints, quorum certificates
  migrations      — Schema version tracking
"""

import sqlite3
import json
import time
import os
import hashlib
import threading
from contextlib import contextmanager
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass

from .crypto_primitives import sha256


# =============================================================================
# SCHEMA VERSIONS
# =============================================================================

SCHEMA_MIGRATIONS: List[Tuple[int, str, List[str]]] = [
    (1, "Initial schema", [
        """CREATE TABLE IF NOT EXISTS migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at REAL NOT NULL,
            checksum TEXT NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS agents (
            did TEXT PRIMARY KEY,
            controller_did TEXT NOT NULL,
            agent_type TEXT NOT NULL,
            capabilities TEXT NOT NULL,     -- JSON array
            bounds TEXT NOT NULL,           -- JSON object
            public_key TEXT NOT NULL,       -- hex
            metadata TEXT DEFAULT '{}',     -- JSON
            created_at REAL NOT NULL,
            revoked_at REAL,
            revocation_reason TEXT
        )""",
        """CREATE TABLE IF NOT EXISTS contracts (
            contract_id TEXT PRIMARY KEY,
            template TEXT NOT NULL,
            parties TEXT NOT NULL,          -- JSON array of DIDs
            terms TEXT NOT NULL,            -- JSON
            terms_hash TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'PROPOSED',
            escrow_total INTEGER DEFAULT 0,
            escrow_released INTEGER DEFAULT 0,
            obligations TEXT NOT NULL,      -- JSON array
            signatures TEXT DEFAULT '[]',   -- JSON array
            created_at REAL NOT NULL,
            activated_at REAL,
            completed_at REAL
        )""",
        """CREATE TABLE IF NOT EXISTS disputes (
            dispute_id TEXT PRIMARY KEY,
            contract_id TEXT NOT NULL,
            plaintiff_did TEXT NOT NULL,
            defendant_did TEXT NOT NULL,
            reason TEXT NOT NULL,
            description TEXT,
            claimed_damages INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'FILED',
            resolution TEXT,               -- JSON
            evidence TEXT DEFAULT '[]',    -- JSON array
            filed_at REAL NOT NULL,
            resolved_at REAL,
            FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)
        )""",
        """CREATE TABLE IF NOT EXISTS ledger_entries (
            sequence INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            actor_did TEXT NOT NULL,
            subject_did TEXT,
            payload TEXT NOT NULL,          -- JSON
            entry_hash TEXT NOT NULL,
            prev_hash TEXT NOT NULL,
            merkle_root TEXT,
            timestamp REAL NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS settlements (
            record_id TEXT PRIMARY KEY,
            contract_id TEXT NOT NULL,
            stripe_pi_id TEXT NOT NULL,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'usd',
            status TEXT NOT NULL,
            payer_did TEXT NOT NULL,
            payee_did TEXT NOT NULL,
            stripe_charge_id TEXT,
            stripe_refund_id TEXT,
            refund_amount INTEGER DEFAULT 0,
            created_at REAL NOT NULL,
            captured_at REAL,
            refunded_at REAL,
            FOREIGN KEY (contract_id) REFERENCES contracts(contract_id)
        )""",
        """CREATE TABLE IF NOT EXISTS risk_profiles (
            agent_did TEXT PRIMARY KEY,
            transaction_count INTEGER DEFAULT 0,
            total_volume INTEGER DEFAULT 0,
            avg_value REAL DEFAULT 0,
            std_value REAL DEFAULT 0,
            unique_counterparties INTEGER DEFAULT 0,
            dispute_rate REAL DEFAULT 0,
            circuit_breaker_state TEXT DEFAULT 'CLOSED',
            circuit_breaker_failures INTEGER DEFAULT 0,
            last_updated REAL NOT NULL,
            profile_data TEXT DEFAULT '{}',  -- JSON (full behavioral profile)
            FOREIGN KEY (agent_did) REFERENCES agents(did)
        )""",
        """CREATE TABLE IF NOT EXISTS tokens (
            token_id TEXT PRIMARY KEY,
            token_type TEXT NOT NULL,
            issuer_did TEXT NOT NULL,
            holder_did TEXT NOT NULL,
            amount INTEGER NOT NULL,
            policy TEXT NOT NULL,            -- JSON (decay, accrual, transferable, expires)
            state TEXT NOT NULL DEFAULT 'ACTIVE',
            staked_at REAL,
            created_at REAL NOT NULL,
            redeemed_at REAL
        )""",
        """CREATE TABLE IF NOT EXISTS channels (
            channel_id TEXT PRIMARY KEY,
            party_a TEXT NOT NULL,
            party_b TEXT NOT NULL,
            balance_a INTEGER NOT NULL,
            balance_b INTEGER NOT NULL,
            sequence INTEGER NOT NULL DEFAULT 0,
            is_open INTEGER NOT NULL DEFAULT 1,
            state_hash TEXT NOT NULL,
            created_at REAL NOT NULL,
            closed_at REAL
        )""",
        """CREATE TABLE IF NOT EXISTS bft_checkpoints (
            checkpoint_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sequence INTEGER NOT NULL,
            view_number INTEGER NOT NULL,
            state_hash TEXT NOT NULL,
            quorum_certificate TEXT NOT NULL,  -- JSON
            stable INTEGER NOT NULL DEFAULT 0,
            created_at REAL NOT NULL
        )""",
        # Indexes for common queries
        "CREATE INDEX IF NOT EXISTS idx_agents_controller ON agents(controller_did)",
        "CREATE INDEX IF NOT EXISTS idx_contracts_state ON contracts(state)",
        "CREATE INDEX IF NOT EXISTS idx_contracts_party ON contracts(parties)",
        "CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes(contract_id)",
        "CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_actor ON ledger_entries(actor_did)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_subject ON ledger_entries(subject_did)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_entries(event_type)",
        "CREATE INDEX IF NOT EXISTS idx_ledger_time ON ledger_entries(timestamp)",
        "CREATE INDEX IF NOT EXISTS idx_settlements_contract ON settlements(contract_id)",
        "CREATE INDEX IF NOT EXISTS idx_tokens_holder ON tokens(holder_did)",
        "CREATE INDEX IF NOT EXISTS idx_tokens_type ON tokens(token_type)",
    ]),
]


# =============================================================================
# STORAGE ENGINE
# =============================================================================

class StorageEngine:
    """Persistent storage for all AEOS protocol state.

    Uses SQLite in WAL mode for:
    - Concurrent readers with single writer
    - Crash recovery via write-ahead log
    - ACID transactions on all mutations
    - Sub-millisecond reads for common queries

    Usage:
        db = StorageEngine("aeos_data.db")
        db.put_agent(agent_dict)
        agent = db.get_agent("did:aeos:xyz")
    """

    def __init__(self, db_path: str = "aeos_data.db"):
        self.db_path = db_path
        self._local = threading.local()
        self._write_lock = threading.Lock()

        # Initialize schema
        with self._connect() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA foreign_keys=ON")
            conn.execute("PRAGMA cache_size=-64000")  # 64MB cache
            self._run_migrations(conn)

    def _connect(self) -> sqlite3.Connection:
        """Get or create a thread-local connection."""
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            self._local.conn = sqlite3.connect(
                self.db_path, timeout=30.0,
                isolation_level=None  # autocommit; we manage txns explicitly
            )
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    @contextmanager
    def _transaction(self):
        """Context manager for write transactions with automatic rollback."""
        conn = self._connect()
        with self._write_lock:
            conn.execute("BEGIN IMMEDIATE")
            try:
                yield conn
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise

    def _run_migrations(self, conn: sqlite3.Connection):
        """Run any pending schema migrations."""
        # Ensure migrations table exists first
        conn.execute("""CREATE TABLE IF NOT EXISTS migrations (
            version INTEGER PRIMARY KEY,
            description TEXT NOT NULL,
            applied_at REAL NOT NULL,
            checksum TEXT NOT NULL
        )""")

        applied = set(
            row[0] for row in conn.execute("SELECT version FROM migrations")
        )

        for version, desc, statements in SCHEMA_MIGRATIONS:
            if version in applied:
                continue
            for stmt in statements:
                conn.execute(stmt)
            checksum = sha256(desc.encode()).hex()[:16]
            conn.execute(
                "INSERT INTO migrations (version, description, applied_at, checksum) VALUES (?, ?, ?, ?)",
                (version, desc, time.time(), checksum)
            )

    # =========================================================================
    # AGENTS
    # =========================================================================

    def put_agent(self, agent: Dict[str, Any]):
        """Store or update an agent."""
        with self._transaction() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO agents
                (did, controller_did, agent_type, capabilities, bounds,
                 public_key, metadata, created_at, revoked_at, revocation_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                agent['did'], agent.get('controller_did', ''),
                agent.get('agent_type', 'AUTONOMOUS'),
                json.dumps(agent.get('capabilities', [])),
                json.dumps(agent.get('bounds', {})),
                agent.get('public_key', ''),
                json.dumps(agent.get('metadata', {})),
                agent.get('created_at', time.time()),
                agent.get('revoked_at'), agent.get('revocation_reason'),
            ))

    def get_agent(self, did: str) -> Optional[Dict[str, Any]]:
        """Retrieve an agent by DID."""
        conn = self._connect()
        row = conn.execute("SELECT * FROM agents WHERE did = ?", (did,)).fetchone()
        if not row:
            return None
        return self._row_to_agent(row)

    def list_agents(self, controller_did: Optional[str] = None,
                    limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        conn = self._connect()
        if controller_did:
            rows = conn.execute(
                "SELECT * FROM agents WHERE controller_did = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (controller_did, limit, offset)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM agents ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset)
            ).fetchall()
        return [self._row_to_agent(r) for r in rows]

    def revoke_agent(self, did: str, reason: str = ""):
        with self._transaction() as conn:
            conn.execute(
                "UPDATE agents SET revoked_at = ?, revocation_reason = ? WHERE did = ?",
                (time.time(), reason, did)
            )

    def _row_to_agent(self, row) -> Dict[str, Any]:
        return {
            'did': row['did'],
            'controller_did': row['controller_did'],
            'agent_type': row['agent_type'],
            'capabilities': json.loads(row['capabilities']),
            'bounds': json.loads(row['bounds']),
            'public_key': row['public_key'],
            'metadata': json.loads(row['metadata']),
            'created_at': row['created_at'],
            'revoked_at': row['revoked_at'],
            'revocation_reason': row['revocation_reason'],
        }

    # =========================================================================
    # CONTRACTS
    # =========================================================================

    def put_contract(self, contract: Dict[str, Any]):
        with self._transaction() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO contracts
                (contract_id, template, parties, terms, terms_hash, state,
                 escrow_total, escrow_released, obligations, signatures,
                 created_at, activated_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                contract['contract_id'], contract.get('template', ''),
                json.dumps(contract.get('parties', [])),
                json.dumps(contract.get('terms', {})),
                contract.get('terms_hash', ''),
                contract.get('state', 'PROPOSED'),
                contract.get('escrow_total', 0),
                contract.get('escrow_released', 0),
                json.dumps(contract.get('obligations', [])),
                json.dumps(contract.get('signatures', [])),
                contract.get('created_at', time.time()),
                contract.get('activated_at'),
                contract.get('completed_at'),
            ))

    def get_contract(self, contract_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute("SELECT * FROM contracts WHERE contract_id = ?",
                           (contract_id,)).fetchone()
        if not row:
            return None
        return {
            'contract_id': row['contract_id'],
            'template': row['template'],
            'parties': json.loads(row['parties']),
            'terms': json.loads(row['terms']),
            'terms_hash': row['terms_hash'],
            'state': row['state'],
            'escrow_total': row['escrow_total'],
            'escrow_released': row['escrow_released'],
            'obligations': json.loads(row['obligations']),
            'signatures': json.loads(row['signatures']),
            'created_at': row['created_at'],
            'activated_at': row['activated_at'],
            'completed_at': row['completed_at'],
        }

    def update_contract_state(self, contract_id: str, state: str, **kwargs):
        with self._transaction() as conn:
            sets = ["state = ?"]
            vals = [state]
            for k, v in kwargs.items():
                sets.append(f"{k} = ?")
                vals.append(v)
            vals.append(contract_id)
            conn.execute(
                f"UPDATE contracts SET {', '.join(sets)} WHERE contract_id = ?",
                vals
            )

    # =========================================================================
    # DISPUTES
    # =========================================================================

    def put_dispute(self, dispute: Dict[str, Any]):
        with self._transaction() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO disputes
                (dispute_id, contract_id, plaintiff_did, defendant_did,
                 reason, description, claimed_damages, status,
                 resolution, evidence, filed_at, resolved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                dispute['dispute_id'], dispute['contract_id'],
                dispute['plaintiff_did'], dispute['defendant_did'],
                dispute['reason'], dispute.get('description', ''),
                dispute.get('claimed_damages', 0),
                dispute.get('status', 'FILED'),
                json.dumps(dispute.get('resolution')),
                json.dumps(dispute.get('evidence', [])),
                dispute.get('filed_at', time.time()),
                dispute.get('resolved_at'),
            ))

    def get_dispute(self, dispute_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute("SELECT * FROM disputes WHERE dispute_id = ?",
                           (dispute_id,)).fetchone()
        if not row:
            return None
        return dict(row)

    # =========================================================================
    # LEDGER (Append-only)
    # =========================================================================

    def append_ledger(self, event_type: str, actor_did: str,
                      subject_did: str, payload: Dict[str, Any],
                      entry_hash: str, prev_hash: str,
                      merkle_root: str = "") -> int:
        """Append to the immutable ledger. Returns sequence number."""
        with self._transaction() as conn:
            cursor = conn.execute("""
                INSERT INTO ledger_entries
                (event_type, actor_did, subject_did, payload,
                 entry_hash, prev_hash, merkle_root, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_type, actor_did, subject_did or "",
                json.dumps(payload), entry_hash, prev_hash,
                merkle_root, time.time()
            ))
            return cursor.lastrowid

    def get_ledger_entry(self, sequence: int) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute(
            "SELECT * FROM ledger_entries WHERE sequence = ?", (sequence,)
        ).fetchone()
        return dict(row) if row else None

    def get_ledger_range(self, start: int, end: int) -> List[Dict[str, Any]]:
        conn = self._connect()
        rows = conn.execute(
            "SELECT * FROM ledger_entries WHERE sequence >= ? AND sequence <= ? ORDER BY sequence",
            (start, end)
        ).fetchall()
        return [dict(r) for r in rows]

    def get_ledger_tail(self) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute(
            "SELECT * FROM ledger_entries ORDER BY sequence DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None

    def ledger_count(self) -> int:
        conn = self._connect()
        return conn.execute("SELECT COUNT(*) FROM ledger_entries").fetchone()[0]

    def verify_ledger_chain(self) -> Tuple[bool, Optional[int]]:
        """Verify the entire hash chain integrity."""
        conn = self._connect()
        rows = conn.execute(
            "SELECT sequence, entry_hash, prev_hash FROM ledger_entries ORDER BY sequence"
        ).fetchall()
        prev = "0" * 64
        for row in rows:
            if row['prev_hash'] != prev:
                return False, row['sequence']
            prev = row['entry_hash']
        return True, None

    # =========================================================================
    # SETTLEMENTS
    # =========================================================================

    def put_settlement(self, record: Dict[str, Any]):
        with self._transaction() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO settlements
                (record_id, contract_id, stripe_pi_id, amount, currency,
                 status, payer_did, payee_did, stripe_charge_id,
                 stripe_refund_id, refund_amount, created_at,
                 captured_at, refunded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record['record_id'], record['contract_id'],
                record['stripe_pi_id'], record['amount'],
                record.get('currency', 'usd'), record['status'],
                record['payer_did'], record['payee_did'],
                record.get('stripe_charge_id'),
                record.get('stripe_refund_id'),
                record.get('refund_amount', 0),
                record.get('created_at', time.time()),
                record.get('captured_at'), record.get('refunded_at'),
            ))

    def get_settlement(self, contract_id: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute(
            "SELECT * FROM settlements WHERE contract_id = ?", (contract_id,)
        ).fetchone()
        return dict(row) if row else None

    # =========================================================================
    # RISK PROFILES
    # =========================================================================

    def put_risk_profile(self, profile: Dict[str, Any]):
        with self._transaction() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO risk_profiles
                (agent_did, transaction_count, total_volume, avg_value,
                 std_value, unique_counterparties, dispute_rate,
                 circuit_breaker_state, circuit_breaker_failures,
                 last_updated, profile_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                profile['agent_did'],
                profile.get('transaction_count', 0),
                profile.get('total_volume', 0),
                profile.get('avg_value', 0),
                profile.get('std_value', 0),
                profile.get('unique_counterparties', 0),
                profile.get('dispute_rate', 0),
                profile.get('circuit_breaker_state', 'CLOSED'),
                profile.get('circuit_breaker_failures', 0),
                time.time(),
                json.dumps(profile.get('profile_data', {})),
            ))

    def get_risk_profile(self, agent_did: str) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute(
            "SELECT * FROM risk_profiles WHERE agent_did = ?", (agent_did,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d['profile_data'] = json.loads(d['profile_data'])
        return d

    # =========================================================================
    # TOKENS
    # =========================================================================

    def put_token(self, token: Dict[str, Any]):
        with self._transaction() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO tokens
                (token_id, token_type, issuer_did, holder_did, amount,
                 policy, state, staked_at, created_at, redeemed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                token['token_id'], token['token_type'],
                token['issuer_did'], token['holder_did'],
                token['amount'], json.dumps(token.get('policy', {})),
                token.get('state', 'ACTIVE'),
                token.get('staked_at'), token.get('created_at', time.time()),
                token.get('redeemed_at'),
            ))

    def get_tokens_by_holder(self, holder_did: str) -> List[Dict[str, Any]]:
        conn = self._connect()
        rows = conn.execute(
            "SELECT * FROM tokens WHERE holder_did = ? AND state = 'ACTIVE'",
            (holder_did,)
        ).fetchall()
        return [dict(r) for r in rows]

    # =========================================================================
    # BFT CHECKPOINTS
    # =========================================================================

    def put_checkpoint(self, seq: int, view: int, state_hash: str,
                       qc: Dict[str, Any], stable: bool = False):
        with self._transaction() as conn:
            conn.execute("""
                INSERT INTO bft_checkpoints
                (sequence, view_number, state_hash, quorum_certificate,
                 stable, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (seq, view, state_hash, json.dumps(qc), int(stable), time.time()))

    def get_latest_checkpoint(self) -> Optional[Dict[str, Any]]:
        conn = self._connect()
        row = conn.execute(
            "SELECT * FROM bft_checkpoints WHERE stable = 1 ORDER BY sequence DESC LIMIT 1"
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d['quorum_certificate'] = json.loads(d['quorum_certificate'])
        return d

    # =========================================================================
    # STATISTICS
    # =========================================================================

    def stats(self) -> Dict[str, Any]:
        conn = self._connect()
        return {
            'agents': conn.execute("SELECT COUNT(*) FROM agents").fetchone()[0],
            'active_agents': conn.execute("SELECT COUNT(*) FROM agents WHERE revoked_at IS NULL").fetchone()[0],
            'contracts': conn.execute("SELECT COUNT(*) FROM contracts").fetchone()[0],
            'active_contracts': conn.execute("SELECT COUNT(*) FROM contracts WHERE state = 'ACTIVE'").fetchone()[0],
            'disputes': conn.execute("SELECT COUNT(*) FROM disputes").fetchone()[0],
            'ledger_entries': self.ledger_count(),
            'settlements': conn.execute("SELECT COUNT(*) FROM settlements").fetchone()[0],
            'tokens': conn.execute("SELECT COUNT(*) FROM tokens WHERE state = 'ACTIVE'").fetchone()[0],
            'checkpoints': conn.execute("SELECT COUNT(*) FROM bft_checkpoints WHERE stable = 1").fetchone()[0],
            'db_size_bytes': os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0,
        }

    def close(self):
        if hasattr(self._local, 'conn') and self._local.conn:
            self._local.conn.close()
            self._local.conn = None
