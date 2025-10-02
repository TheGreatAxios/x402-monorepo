import app from './src/app';
import { runtime } from './src/config';

console.log(`Starting x402 Facilitator on ${runtime.host}:${runtime.port}...`);

export default {
  port: runtime.port,
  hostname: runtime.host,
  fetch: app.fetch,
};
