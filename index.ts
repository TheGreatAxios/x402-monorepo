import app from "./src/app";
import { config } from "./src/config";

console.log(`Starting x402 Facilitator on ${config.host}:${config.port}...`);

export default {
	port: config.port,
	hostname: config.host,
	fetch: app.fetch
};
