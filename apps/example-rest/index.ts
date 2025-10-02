import 'dotenv/config';
import { Hono } from 'hono';
import { paymentMiddleware } from '../../packages/x402-middleware/src/index';

const { EVM_RECEIVING_ADDRESS, PORT } = process.env as Record<string, string | undefined>;

const payTo = EVM_RECEIVING_ADDRESS ?? '0x0000000000000000000000000000000000000001';
const network = 'skale-europa-testnet';
const port = PORT ? parseInt(PORT) : 4021;

const app = new Hono();

app.use(
  '/weather',
  paymentMiddleware(
    payTo,
    {
      'GET /weather': {
        price: '10000',
        network,
        scheme: 'exact',
        asset: 'USDC',
        config: { description: 'Weather endpoint' },
        extra: {
          name: 'USDC Forwarder',
          verifyingContract: '0x7779B0d1766e6305E5f8081E3C0CDF58FcA24330',
          version: '1',
          method: 'eip3009-forwarder',
          token: '0x9eAb55199f4481eCD7659540A17Af618766b07C4',
        },
      },
    },
    { url: 'http://localhost:3000' },
    { description: 'USDC Forwarder example', resource: 'http://localhost:4021/weather' }
  )
);

app.get('/weather', (c) => c.json({ temperature: 72, conditions: 'sunny', message: 'Thanks for your payment!' }));

export default {
  port,
  fetch: app.fetch,
};
