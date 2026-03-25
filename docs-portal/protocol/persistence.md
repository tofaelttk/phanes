# Persistence engine

## Purpose (`aeos/persistence.py`)

**SQLite WAL mode** storage for:

- Agent records (create, query, revoke)  
- Contracts and state updates  
- Append-only **ledger** compatible with `ledger.py` semantics  
- Settlement and risk profile blobs for operator dashboards  
- Statistics endpoints backing `/ledger/stats`-style APIs

## Properties

- **ACID** transactions for multi-row updates.  
- **Schema migrations** — versioned upgrades without manual DDL in production.  
- **Crash recovery** — WAL journaling survives process kills (filesystem must be durable).

## Relationship to BFT

Single-node `StorageEngine` is the **operator database**. Multi-replica **BFT** state may be materialized into storage via replication logic in higher layers (`bft_ledger.py` + application glue).

## Deployment

Docker and Fly.io configs in repository root (`Dockerfile`, `docker-compose.yml`, `fly.toml`) mount or bind persistent volumes — **never** store production keys or DBs on ephemeral disks.

## Related

- [Operations / deployment](../operations/deployment-docker-fly.md)  
- [Consensus & ledger](consensus-ledger.md)  
