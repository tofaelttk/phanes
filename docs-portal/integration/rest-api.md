# REST API (FastAPI)

## Entry point

- **Module:** `aeos/server.py`  
- **CLI:** `phanes-server` (see `pyproject.toml` `[project.scripts]`)  
- **Default dev:** `uvicorn aeos.server:app --host 0.0.0.0 --port 8420`  
- **Interactive docs:** `/docs` (OpenAPI)

**Install:** `pip install phanes[server]`

## Route catalog (17)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `POST` | `/agents` | Create agent |
| `GET` | `/agents/{did}` | Resolve agent |
| `POST` | `/agents/{did}/delegate` | Delegate authority |
| `DELETE` | `/agents/{did}` | Revoke agent |
| `POST` | `/contracts` | Create contract |
| `POST` | `/contracts/{contract_id}/sign` | Sign |
| `POST` | `/contracts/{contract_id}/fulfill` | Fulfill obligation |
| `GET` | `/contracts/{contract_id}` | Contract status |
| `POST` | `/disputes` | File dispute |
| `POST` | `/disputes/{dispute_id}/evidence` | Submit evidence |
| `POST` | `/disputes/{dispute_id}/resolve` | Resolve |
| `GET` | `/disputes/{dispute_id}` | Dispute status |
| `POST` | `/risk/assess` | Risk assessment |
| `GET` | `/risk/health` | Network risk health |
| `GET` | `/ledger/stats` | Ledger statistics |
| `GET` | `/ledger/entry/{index}` | Entry + Merkle proof |

## Request models (selected)

`CreateAgentRequest`, `DelegateRequest`, `CreateContractRequest`, `SignContractRequest`, `FulfillRequest`, `FileDisputeRequest`, `SubmitEvidenceRequest`, … — all Pydantic v2 models with sensible defaults for demos.

## CORS

`CORSMiddleware` is configured for browser clients — **tighten origins** in production deployments.

## Testing

`tests/test_all.py` includes REST tests **skipped** unless FastAPI stack is installed.

## Related

- [MCP server](mcp-server.md)  
- [TypeScript SDK](typescript-sdk.md)  
