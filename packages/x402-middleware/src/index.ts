import type { Context, Next } from 'hono';
import { z } from 'zod';

/**
 * Network identifier (e.g., 'base', 'base-sepolia')
 */
export type NetworkId = 'base' | 'base-sepolia' | string;

/** Route-level payment configuration */
export interface RouteConfig {
  price: string; // e.g. "$0.001" in USDC dollars (6 decimals)
  network: NetworkId;
  scheme?: 'exact' | 'upto';
  asset?: string; // default USDC
  config?: Record<string, unknown>;
  extra?: {
    // Forwarder/EIP-712 domain hints for client SDKs
    name?: string;
    verifyingContract?: string; // forwarder contract
    version?: string;
    method?: 'eip3009' | 'eip3009-forwarder';
    token?: string; // underlying token (e.g., USDC) address
  };
}

export type RoutesConfig = Record<string, RouteConfig>; // key like "GET /path"

/** Minimal interface to allow custom facilitator clients */
export interface FacilitatorClientLike {
  verify(payment: unknown): Promise<{ valid: boolean; reason?: string }>;
}

export interface FacilitatorConfig {
  url?: string; // e.g. https://x402.org/facilitator
  client?: FacilitatorClientLike;
}

export interface PaymentMiddlewareConfig {
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  outputSchema?: Record<string, unknown>;
  customPaywallHtml?: string;
  resource?: string;
}

const PaymentHeaderSchema = z.union([
  // Legacy format
  z.object({
    channelId: z.string(),
    amount: z.string(),
    nonce: z.number(),
    signature: z.string(),
  }),
  // EIP-3009 format
  z.object({
    type: z.literal('eip3009'),
    from: z.string(),
    to: z.string(),
    value: z.string(),
    validAfter: z.string(),
    validBefore: z.string(),
    nonce: z.string(),
    signature: z.string(),
    chainId: z.number(),
    verifyingContract: z.string(),
  }),
  // EIP-3009-forwarder format
  z.object({
    type: z.literal('eip3009-forwarder'),
    from: z.string(),
    to: z.string(),
    value: z.string(),
    validAfter: z.string(),
    validBefore: z.string(),
    nonce: z.string(),
    signature: z.string(),
    chainId: z.number(),
    forwarderAddress: z.string(),
    token: z.string(),
    name: z.string().optional(),
    version: z.string().optional(),
  })
]);

/** Match a request method/path to a configured route key */
function matchRoute(method: string, path: string, routes: RoutesConfig): RouteConfig | undefined {
  const key = `${method.toUpperCase()} ${path}`;
  return routes[key];
}

/**
 * POST the payment payload to the facilitator /verify endpoint, or use a custom client
 */
async function verifyWithFacilitator(fac: FacilitatorConfig, payload: unknown): Promise<{ valid: boolean; reason?: string }> {
  if (fac.client) return fac.client.verify(payload);
  if (!fac.url) return { valid: false, reason: 'No facilitator configured' };
  try {
    const res = await fetch(new URL('/verify', fac.url).toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('Facilitator response status:', res.status);
    if (!res.ok) return { valid: false, reason: `facilitator ${res.status}` };
    const data = (await res.json()) as { valid?: boolean; reason?: string } | undefined;
    console.log('Facilitator response data:', data);
    const result = { valid: !!data?.valid, reason: data?.reason };
    console.log('Verification result:', result);
    return result;
  } catch (e: any) {
    console.log('Facilitator error:', e);
    return { valid: false, reason: e?.message || 'facilitator error' };
  }
}

/**
 * x402 payment middleware for Hono
 * - Checks for X-PAYMENT (preferred) or X-402 header
 * - Calls a facilitator /verify
 * - If invalid/missing, responds with 402 + JSON instructions
 */
export function paymentMiddleware(
  receiverAddress: string,
  routes: RoutesConfig,
  facilitator: FacilitatorConfig,
  options: PaymentMiddlewareConfig = {}
) {
  return async function middleware(c: Context, next: Next) {
    const method = c.req.method.toUpperCase();
    const path = c.req.path;
    const route = matchRoute(method, path, routes);
    if (!route) return next();

  // Expect X-PAYMENT (preferred) or X-402 header with JSON payload
  const raw = c.req.header('X-PAYMENT') ?? c.req.header('X-402');
    if (!raw) {
      return respond402(c, receiverAddress, route, facilitator, options);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
      PaymentHeaderSchema.parse(payload);
    } catch (e: any) {
      return respond402(c, receiverAddress, route, facilitator, options, 'Invalid payment header');
    }

    const result = await verifyWithFacilitator(facilitator, payload);
    if (!result.valid) {
      return respond402(c, receiverAddress, route, facilitator, options, result.reason);
    }

    // Attach payment info for handlers if environment supports it
    try {
      // Hono Context has set/get in most runtimes
      // @ts-ignore
      if (typeof c.set === 'function') c.set('x402Payment', payload);
    } catch {}
    return next();
  };
}

/** Respond with 402 Payment Required + instructions */
function respond402(
  c: Context,
  receiver: string,
  route: RouteConfig,
  facilitator: FacilitatorConfig,
  opts: PaymentMiddlewareConfig,
  reason?: string
) {
  const instructions = {
    version: 'x402-0.1',
    network: route.network,
    asset: route.asset ?? 'USDC',
    scheme: route.scheme ?? 'exact',
    price: route.price,
    receiver,
    facilitator: facilitator.url,
    timeout: opts.maxTimeoutSeconds ?? 60,
    resource: opts.resource,
    description: opts.description,
    outputSchema: opts.outputSchema,
    extra: route.extra,
    reason,
  };

  return c.json(
    {
      error: 'Payment Required',
      instructions,
    },
    402
  );
}

export type { RouteConfig as X402RouteConfig, RoutesConfig as X402RoutesConfig };
