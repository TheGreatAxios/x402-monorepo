# @enfusion-ai/x402-middleware

Extensible x402 payment middleware for Hono (and similar) servers.

Features:

- Protect routes with X-PAYMENT / X-402 header
- Calls a configured facilitator `/verify`
- Responds with `402 Payment Required` and payment instructions when missing/invalid

Usage:

```ts
import { Hono } from "hono";
import { paymentMiddleware } from "@enfusion-ai/x402-middleware";

const app = new Hono();

app.use(
	"*",
	paymentMiddleware(
		"0xYourReceiver",
		{ "GET /paid": { price: "$0.001", network: "base" } },
		{ url: "https://your-facilitator.example.com" }
	)
);

app.get("/paid", (c) => c.json({ ok: true }));
```

Config:

- price: string like `$0.001` (USDC)
- network: e.g. `base` or `base-sepolia`
- facilitator: `{ url }` or `{ client: { verify() } }`
