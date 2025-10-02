import type { Context, Next } from "hono";
import { logger } from "../logger";

export async function loggerMiddleware(c: Context, next: Next) {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;

	await next();

	const duration = Date.now() - start;
	const status = c.res.status;

	logger.info("request", { method, path, status, duration });
}
