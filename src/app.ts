import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { loggerMiddleware } from './middleware/logger';
import { x402Middleware } from './middleware/x402';
import channels from './routes/channels';
import { config } from './config';
import type { AppVariables } from './context';

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware
app.use('*', loggerMiddleware);
app.use('*', cors());

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    name: 'x402 Facilitator',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      health: 'GET /',
      channels: {
        create: 'POST /api/channels',
        list: 'GET /api/channels',
        get: 'GET /api/channels/:channelId',
        pay: 'POST /api/channels/:channelId/pay',
        settle: 'POST /api/channels/:channelId/settle',
      },
      paid_content: 'GET /api/content (requires X-402 header)',
    },
  });
});

// API routes
app.route('/api/channels', channels);

// Example protected endpoint that requires x402 payment
app.get('/api/content', x402Middleware, (c) => {
  const payment = c.get('x402Payment');
  
  return c.json({
    success: true,
    message: 'This is protected content',
    payment,
    content: {
      data: 'Your premium content here',
      timestamp: new Date().toISOString(),
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: err.message }, 500);
});

export default app;
