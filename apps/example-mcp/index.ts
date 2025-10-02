import { Hono } from "hono";
import { paymentMiddleware } from "../../packages/x402-middleware/src/index";

// This is a simplified example of how an MCP server could compose the middleware.
const app = new Hono();

app.use(
	"/mcp/*",
	paymentMiddleware(
		"0x0000000000000000000000000000000000000002",
		{
			"POST /mcp/tool/run": {
				price: "$0.005",
				network: "base-sepolia",
				config: { description: "Run a paid MCP tool" }
			}
		},
		{ url: "http://localhost:3000" },
		{ description: "Example MCP server" }
	)
);

app.post("/mcp/tool/run", async (c) => {
	const body = await c.req.json();
	return c.json({
		ok: true,
		tool: body?.tool ?? "unknown",
		result: "paid execution complete"
	});
});

export default {
	port: 4022,
	fetch: app.fetch
};
