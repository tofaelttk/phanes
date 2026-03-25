# MCP server (Model Context Protocol)

## Purpose

`aeos/mcp_server.py` exposes AEOS as **first-class tools** for Claude Desktop, ChatGPT, or any MCP-capable host — **JSON-RPC over stdio**.

## Launch

```bash
python -m aeos.mcp_server
# or
phanes-mcp
```

## Tool catalog (11)

| Tool name | Role |
|-----------|------|
| `aeos_create_agent` | Mint DID identity with capabilities and bounds |
| `aeos_get_agent` | Resolve agent profile |
| `aeos_create_contract` | Instantiate agreement |
| `aeos_sign_contract` | Party signature step |
| `aeos_fulfill_obligation` | Attach fulfillment proof |
| `aeos_get_contract` | Inspect contract |
| `aeos_file_dispute` | Open dispute case |
| `aeos_resolve_dispute` | Drive resolution |
| `aeos_assess_risk` | Score proposed action |
| `aeos_ledger_stats` | Audit trail stats |
| `aeos_network_health` | Risk-system health |

Each tool includes JSON Schema `inputSchema` for automatic UI in MCP clients.

## Global state

In-process singletons: `AgentRegistry`, `RiskEngine`, `Ledger`, contract/dispute maps, optional settlement engine — suitable for **single-operator** demos. **Multi-tenant production** requires externalizing state (see `industrial/` roadmaps — **Coming soon**).

## Claude Desktop config (example)

```json
{
  "mcpServers": {
    "aeos": {
      "command": "python",
      "args": ["-m", "aeos.mcp_server"]
    }
  }
}
```

## Related

- [REST API](rest-api.md)  
- [Risk & ML](../protocol/risk-ml-graph.md)  
