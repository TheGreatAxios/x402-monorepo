import type { Context, Next } from 'hono';
import { X402HeaderSchema } from '../validators';
import { channelStorage } from '../storage';
import { verifySignature } from '../crypto';

// Middleware to validate and process x402 payment headers
export async function x402Middleware(c: Context, next: Next) {
  // Check if x402 header is present
  const x402Header = c.req.header('X-402');
  
  if (!x402Header) {
    return c.json({ success: false, error: 'X-402 header required' }, 402);
  }

  try {
    // Parse the x402 header (assuming JSON format)
    const paymentData = JSON.parse(x402Header);
    const validatedPayment = X402HeaderSchema.parse(paymentData);

    // Get the channel
    const channel = channelStorage.getChannel(validatedPayment.channelId);
    if (!channel) {
      return c.json({ success: false, error: 'Payment channel not found' }, 404);
    }

    // Check if channel has expired
    const now = Math.floor(Date.now() / 1000);
    if (now > channel.expiresAt) {
      return c.json({ success: false, error: 'Payment channel has expired' }, 400);
    }

    // Verify nonce is incrementing
    if (validatedPayment.nonce <= channel.nonce) {
      return c.json({ success: false, error: 'Invalid payment nonce' }, 400);
    }

    // Verify signature
    const isValid = verifySignature(
      validatedPayment.channelId,
      validatedPayment.amount,
      validatedPayment.nonce,
      validatedPayment.signature,
      channel.sender
    );

    if (!isValid) {
      return c.json({ success: false, error: 'Invalid payment signature' }, 401);
    }

    // Check if amount is within channel balance
    const amount = BigInt(validatedPayment.amount);
    const totalWithdrawn = channel.withdrawn + amount;
    
    if (totalWithdrawn > channel.balance) {
      return c.json({ success: false, error: 'Insufficient channel balance' }, 402);
    }

    // Update channel state
    channelStorage.updateChannel(validatedPayment.channelId, {
      withdrawn: totalWithdrawn,
      nonce: validatedPayment.nonce,
    });

    // Store payment info in context for downstream handlers
    c.set('x402Payment', {
      channelId: validatedPayment.channelId,
      amount: validatedPayment.amount,
      nonce: validatedPayment.nonce,
      withdrawn: totalWithdrawn.toString(),
      remaining: (channel.balance - totalWithdrawn).toString(),
    });

    await next();
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    return c.json({ success: false, error: 'Invalid X-402 header' }, 400);
  }
}
