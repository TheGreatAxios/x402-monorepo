# x402 Facilitator Monorepo

This repo hosts four codebases:

1. apps/facilitator — a minimal x402 Facilitator service (Hono + Bun)
2. packages/x402-middleware — a reusable payment middleware (tsup build)
3. apps/example-mcp — an example MCP-style server that uses the middleware
4. apps/example-rest — a simple REST API that uses the middleware

## Facilitator service

Endpoints:

- GET /api/options — advertise accepted payment options (networks, limits)
- POST /verify — verify a payment payload (stubbed)
- POST /settle — settle a payment (stubbed)

Run:

```bash
bun --cwd apps/facilitator run dev
```

## Middleware package

Behavior:

- Protects configured routes
- Expects an X-402 JSON header
- Calls facilitator /verify
- If missing/invalid, responds with HTTP 402 + payment instructions

Build:

```bash
bun --cwd packages/x402-middleware run build
```

## Examples

Start facilitator first, then in another shell run one of:

```bash
# REST API example
bun --cwd apps/example-rest run dev

# MCP-style example
bun --cwd apps/example-mcp run dev
```

Point middleware to your facilitator URL in each example.
