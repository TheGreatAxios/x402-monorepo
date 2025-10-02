import { $ } from "bun";

await $`bun --cwd packages/x402-middleware run build`;
await $`bun --cwd apps/facilitator run build`;

console.log("Build complete.");
