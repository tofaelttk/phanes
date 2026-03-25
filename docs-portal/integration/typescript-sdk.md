# TypeScript SDK (`@phanes/sdk`)

## Layout

Package root: `ts-sdk/`

| Area | File(s) | Exports |
|------|---------|---------|
| Crypto | `src/crypto.ts` | `KeyPair`, `sha256`, commitments, Merkle, VRF, AES-GCM envelopes |
| Identity | `src/identity.ts` | `AgentIdentity`, `AgentRegistry`, `DelegationChain`, bounds helpers |
| Contracts | `src/contracts.ts` | `Contract`, `ContractFactory`, `EscrowAccount`, states, obligations |
| HTTP | `src/client.ts` | `PhanesClient` typed REST wrapper |
| Barrel | `src/index.ts` | Public API surface |

## Usage modes

1. **Local / offline protocol helpers** — import crypto + identity + contracts without a running server (useful for signing flows in CI or browser wallets).  
2. **Remote** — `new PhanesClient("http://host:8420")` mirrors REST endpoints.

## Parity with Python

The SDK **reimplements** a faithful subset of cryptographic and contract semantics in TypeScript for **frontend and Node** consumers. For **authoritative** behavior in disputes or regulated contexts, prefer the Python reference implementation or a audited WASM build strategy.

## Build & test

```bash
cd ts-sdk
npm install
npm test
```

## Related

- [REST API](rest-api.md)  
- [Repository source map](../reference/repository-source-map.md)  
