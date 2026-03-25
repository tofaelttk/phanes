# Deployment: Docker, Compose, and Fly.io

## Python package

```bash
pip install phanes[server,settlement,ml]
phanes-server
# → http://localhost:8420/docs
```

## Docker

`Dockerfile` builds an image with the AEOS stack suitable for container orchestration.

```bash
docker compose up -d
# → http://localhost:8420/docs (per README)
```

**Volumes:** `docker-compose.yml` should mount a persistent volume for SQLite files and secrets — **do not** store databases inside ephemeral container layers.

## Fly.io

`fly.toml` configures Fly Machines / apps:

- Set **secrets** for Stripe keys, RPC URLs, and signing keys — never commit secrets.  
- Scale **single-region** first; multi-region BFT is a **roadmap** item (see root `README.md`).

## Environment hardening checklist

- Restrict CORS origins in `server.py` deployment wrapper.  
- Terminate TLS at edge (Fly, Cloudflare, AWS ALB).  
- Run RPC nodes and Stripe webhooks on **allowlisted** networks.  
- Enable structured logging and trace IDs across REST and settlement webhooks.

## Health checks

Use `GET /health` for load balancer probes.

## Related

- [Persistence](../protocol/persistence.md)  
- [Industrial SLO roadmap](../industrial/slos-incident-response-roadmap.md) — **Coming soon**  
