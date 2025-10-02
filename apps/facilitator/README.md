# x402 Facilitator (Hono + Bun)

Production-ready facilitator with:
- `/api/options` — advertise accepted networks/assets/schemes
- `/verify` — verify payment payloads (stub; extend for EIP-3009)
- `/settle` — settle payments (stub)
- Security headers + rate limiting
- RavenDB for authorization/settlement audit logging (optional)

Run:

```bash
bun --cwd apps/facilitator run dev
```

Environment:
- `PORT`, `HOST`
- `RAVENDB_URL`, `RAVENDB_DATABASE`, `RAVENDB_CERT_PATH`, `RAVENDB_CERT_PASSWORD`
- `REDIS_URL` (reserved for future metrics/rate-limit/storage)
