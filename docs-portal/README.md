# Phanes / AEOS — Technical documentation portal

This directory is **self-contained**: every file lives under `docs-portal/`. Point **docs.phanes.app** (or any static-site generator) at this folder as the content root.

**Interactive site:** the repository includes `../docs-site/` — a Vite + React documentation UI (command palette, search, Shiki, Mermaid, protocol visualizations) that loads these Markdown files at build time. Run `cd docs-site && npm install && npm run dev`.

## Audience

- **Protocol engineers** — cryptography, consensus, settlement, formal specs  
- **ML / risk engineers** — behavioral models, graph intelligence, circuit breakers  
- **Product & backend** — REST, MCP, TypeScript SDK, deployment  
- **Security & compliance** — threat framing, audit artifacts, industrial roadmap (draft)

## Map

| Section | Purpose |
|--------|---------|
| [Overview](overview.md) | Positioning, scope, how this relates to [phanes.app](https://phanes.app) |
| [Architecture / layered stack](architecture/layered-stack.md) | Six-layer spine, dependency logic |
| [Architecture / data flows](architecture/data-flows-and-invariants.md) | End-to-end lifecycle, invariants |
| [Protocol / module matrix](protocol/module-matrix.md) | All 19 modules at a glance |
| [Protocol / identity](protocol/identity.md) | DIDs, delegation, credentials, bounds |
| [Protocol / contracts & escrow](protocol/contracts-escrow.md) | State machine, obligations, milestones |
| [Protocol / disputes](protocol/disputes.md) | Resolution tiers, VRF, evidence |
| [Protocol / risk, ML, graph](protocol/risk-ml-graph.md) | Risk engine + intelligence layer |
| [Protocol / tokenization & channels](protocol/tokenization-state-channels.md) | Tokens, bilateral channels |
| [Protocol / consensus & ledger](protocol/consensus-ledger.md) | PBFT, immutable hash chain, Merkle |
| [Protocol / settlement](protocol/settlement.md) | Stripe + USDC multi-chain |
| [Protocol / persistence](protocol/persistence.md) | SQLite WAL, schema, recovery |
| [Cryptography](cryptography/primitives-proofs-threshold.md) | Ed25519, commitments, Bulletproofs, SSS |
| [Integration / REST](integration/rest-api.md) | FastAPI surface (17 routes) |
| [Integration / MCP](integration/mcp-server.md) | 11 tools, stdio JSON-RPC |
| [Integration / TypeScript SDK](integration/typescript-sdk.md) | `@phanes/sdk` usage |
| [Formal verification](formal-verification/tla-plus-specs.md) | TLA+ modules and properties |
| [Operations](operations/deployment-docker-fly.md) | Docker, Fly.io, local server |
| [Reference / glossary](reference/glossary.md) | Terms and acronyms |
| [Reference / source map](reference/repository-source-map.md) | Repo file → responsibility |
| **Industrial (draft)** | |
| [Compliance & controls roadmap](industrial/compliance-controls-roadmap.md) | **Coming soon** — production control framework |
| [SLOs & incident response](industrial/slos-incident-response-roadmap.md) | **Coming soon** — operability |
| [Supply chain & provenance](industrial/supply-chain-provenance-roadmap.md) | **Coming soon** — build integrity |

## Conventions

- **Implemented today** — Describes behavior reflected in the `phanes` Python package (`aeos/`), Rust `bulletproofs/`, `ts-sdk/`, and `tests/test_all.py`.  
- **Coming soon** — Explicitly marked in `industrial/*` and where multi-tenant SaaS hardening is not yet specified in code.

## Verification

From the repository root (not inside this folder):

```bash
python3 tests/test_all.py
```

With optional server tests:

```bash
pip install 'phanes[server,dev]'
python3 tests/test_all.py
```

## External surfaces (marketing)

- [phanes.app](https://phanes.app) — product narrative  
- [Protocol](https://phanes.app/protocol) — module descriptions  
- [Architecture](https://phanes.app/architecture) — layered diagram narrative  

This portal goes **deeper**: implementation-aligned semantics, APIs, and cryptographic detail.
