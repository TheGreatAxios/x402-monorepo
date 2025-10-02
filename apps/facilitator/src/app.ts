import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { createRavenStore } from "./services/db";
import { RedisCache, InMemoryCache } from "./services/cache";
import { runtime } from "./config";
import { loggerMiddleware } from "./middleware/logger";
import type { AppVariables } from "./context";
import {
	verifyEIP3009Authorization,
	verifyEIP3009Forwarder
} from "./services/eip3009";
import { settleEIP3009, settleEIP3009Forwarder } from "./services/onchain";
import { logger } from "./logger";

const EIP3009PayloadSchema = z.object({
	type: z.literal("eip3009"),
	from: z.string(),
	to: z.string(),
	value: z.string(), // decimal string
	validAfter: z.string(),
	validBefore: z.string(),
	nonce: z.string(),
	signature: z.string(),
	chainId: z.number(),
	verifyingContract: z.string() // USDC contract
});

const EIP3009ForwarderSchema = z.object({
	type: z.literal("eip3009-forwarder"),
	from: z.string(),
	to: z.string(),
	value: z.string(),
	validAfter: z.string(),
	validBefore: z.string(),
	nonce: z.string(),
	signature: z.string(),
	chainId: z.number(),
	forwarderAddress: z.string(),
	token: z.string(), // underlying USDC address
	name: z.string().optional(),
	version: z.string().optional()
});

const VerifySchema = z.union([EIP3009PayloadSchema, EIP3009ForwarderSchema]);

const app = new Hono<{ Variables: AppVariables }>();

// Simple in-memory rate limiting middleware (token bucket)
function createRateLimiter(windowMs: number, limit: number) {
	const counters = new Map<string, { count: number; resetAt: number }>();
	return async (c: any, next: any) => {
		const ip =
			c.req.header("x-forwarded-for") ??
			c.req.header("cf-connecting-ip") ??
			"anon";
		const key = `${ip}`;
		const now = Date.now();
		const entry = counters.get(key) ?? {
			count: 0,
			resetAt: now + windowMs
		};
		if (now > entry.resetAt) {
			entry.count = 0;
			entry.resetAt = now + windowMs;
		}
		if (entry.count >= limit) {
			return c.json({ success: false, error: "Too Many Requests" }, 429);
		}
		entry.count++;
		counters.set(key, entry);
		c.res.headers.set(
			"X-RateLimit-Remaining",
			String(Math.max(0, limit - entry.count))
		);
		await next();
	};
}

app.use("*", cors());
app.use("*", secureHeaders());
app.use("*", createRateLimiter(60_000, 120));

// Services initialization (RavenDB + Cache)
let store: ReturnType<typeof createRavenStore> | null = null;
try {
	if (runtime.ravendbUrl && runtime.ravendbDatabase) {
		let certificate: Buffer | undefined;
		if (runtime.ravendbCertPath) {
			const fs = await import("node:fs");
			certificate = fs.readFileSync(runtime.ravendbCertPath);
		}
		store = createRavenStore(runtime.ravendbUrl, runtime.ravendbDatabase, {
			certificate,
			password: runtime.ravendbCertPassword
		});
	}
} catch (e) {
	logger.error("RavenDB init failed", { error: String(e) });
}

const cache = runtime.redisUrl
	? new RedisCache(runtime.redisUrl)
	: new InMemoryCache(60_000);

// Basic usage tracking middleware
app.use("*", loggerMiddleware);
app.use("*", async (c, next) => {
	const key = `usage:${c.req.method}:${c.req.path}`;
	const ip =
		c.req.header("x-forwarded-for") ??
		c.req.header("cf-connecting-ip") ??
		"anon";
	try {
		const current = await cache.fetch<number>(key);
		const count = (current ?? 0) + 1;
		await cache.set(key, count, 60_000);
		await cache.set(`usage:ip:${ip}`, Date.now(), 60_000);
	} catch {}
	await next();
});

// Health check endpoint
app.get("/", (c) => {
	return c.json({
		version: "1.0.0",
		status: "healthy",
		endpoints: {
			health: "GET /",
			options: "GET /api/options",
			verify: "POST /verify",
			settle: "POST /settle"
		},
		backing: {
			ravendb: Boolean(store),
			cache: runtime.redisUrl ? "redis" : "memory"
		}
	});
});

// Minimal facilitator endpoints
app.post("/verify", async (c) => {
	try {
		const json = await c.req.json();
		const payload = VerifySchema.parse(json);

		let valid = false;
		let mode: "eip3009" | "forwarder" = "eip3009";

		if (payload.type === "eip3009") {
			// Convert to bigint where needed
			valid = await verifyEIP3009Authorization({
				from: payload.from as any,
				to: payload.to as any,
				value: BigInt(payload.value),
				validAfter: BigInt(payload.validAfter),
				validBefore: BigInt(payload.validBefore),
				nonce: payload.nonce as any,
				signature: payload.signature as any,
				chainId: payload.chainId,
				verifyingContract: payload.verifyingContract as any
			});
			mode = "eip3009";
		} else {
			valid = await verifyEIP3009Forwarder({
				from: payload.from as any,
				to: payload.to as any,
				value: BigInt(payload.value),
				validAfter: BigInt(payload.validAfter),
				validBefore: BigInt(payload.validBefore),
				nonce: payload.nonce as any,
				signature: payload.signature as any,
				chainId: payload.chainId,
				forwarderAddress: payload.forwarderAddress as any,
				token: payload.token as any,
				name: payload.name,
				version: payload.version
			});
			mode = "forwarder";
		}

		if (store) {
			const session = store.openSession();
			await session.store({
				type: "authorization",
				createdAt: new Date().toISOString(),
				mode,
				payload
			});
			await session.saveChanges();
		}
		return c.json({ valid, mode });
	} catch (e: any) {
		return c.json(
			{ valid: false, reason: e?.message || "bad-request" },
			400
		);
	}
});

app.post("/settle", async (c) => {
	try {
		const json = await c.req.json();
		const payload = VerifySchema.parse(json);
		// On-chain settlement based on payload type
		const pk = runtime.evmSettlementPrivateKey;
		if (!pk)
			return c.json(
				{ success: false, error: "missing-settlement-key" },
				500
			);

		let txHash: string | undefined;
		if (payload.type === "eip3009") {
			const res = await settleEIP3009(
				payload.chainId === 84532
					? "base-sepolia"
					: "skale-europa-testnet",
				runtime.rpc,
				pk,
				payload.verifyingContract as any,
				{
					from: payload.from as any,
					to: payload.to as any,
					value: BigInt(payload.value),
					validAfter: BigInt(payload.validAfter),
					validBefore: BigInt(payload.validBefore),
					nonce: payload.nonce as any,
					signature: payload.signature as any
				}
			);
			txHash = res.txHash;
		} else {
			const res = await settleEIP3009Forwarder(
				payload.chainId === 84532
					? "base-sepolia"
					: "skale-europa-testnet",
				runtime.rpc,
				pk,
				payload.forwarderAddress as any,
				{
					from: payload.from as any,
					to: payload.to as any,
					value: BigInt(payload.value),
					validAfter: BigInt(payload.validAfter),
					validBefore: BigInt(payload.validBefore),
					nonce: `0x${BigInt(payload.nonce).toString(16).padStart(64, "0")}` as `0x${string}`,
					signature: payload.signature as any
				}
			);
			txHash = res.txHash;
		}

		if (store) {
			const session = store.openSession();
			await session.store({
				type: "settlement",
				createdAt: new Date().toISOString(),
				payload,
				txHash
			});
			await session.saveChanges();
		}
		return c.json({ success: true, settled: true, txHash });
	} catch (e: any) {
		return c.json(
			{ success: false, error: e?.message || "bad-request" },
			400
		);
	}
});

// Advertise accepted payment options (simple static for now)
app.get("/api/options", (c) => {
	// This endpoint communicates what assets/schemes/networks are accepted
	return c.json({
		success: true,
		facilitator: {
			version: "0.1.0",
			networks: [
				{
					id: "base-sepolia",
					chainId: 84532,
					asset: "USDC",
					decimals: 6,
					contracts: {
						usdc: "0x0000000000000000000000000000000000000000",
						eip3009Forwarder:
							"0x0000000000000000000000000000000000000000"
					},
					schemes: ["exact", "upto"],
					methods: ["eip3009", "eip3009-forwarder"]
				},
				{
					id: "skale-europa-testnet",
					chainId: 2046399126,
					asset: "USDC",
					decimals: 6,
					contracts: {
						usdc: "0x9eAb55199f4481eCD7659540A17Af618766b07C4",
						eip3009Forwarder:
							"0x7779B0d1766e6305E5f8081E3C0CDF58FcA24330"
					},
					schemes: ["exact", "upto"],
					methods: ["eip3009", "eip3009-forwarder"]
				}
			],
			limits: {
				min: runtime.minPaymentAmount,
				max: runtime.maxPaymentAmount
			}
		}
	});
});

// 404 handler
app.notFound((c) => {
	return c.json({ success: false, error: "Not found" }, 404);
});

// Error handler
app.onError((err, c) => {
	logger.error("Unhandled error", { error: String(err) });
	return c.json(
		{ success: false, error: (err as any).message ?? "internal-error" },
		500
	);
});

export default app;
