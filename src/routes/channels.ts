import { Hono } from 'hono';
import { channelStorage } from '../storage';
import { CreateChannelSchema, PaymentSchema, SettlementSchema } from '../validators';
import { generateChannelId, verifySignature } from '../crypto';
import { config } from '../config';
import type { CreateChannelRequest, PaymentRequest, SettlementRequest } from '../types';

const channels = new Hono();

// Create a new payment channel
channels.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = CreateChannelSchema.parse(body) as CreateChannelRequest;

    // Generate unique channel ID
    const nonce = Date.now().toString();
    const channelId = generateChannelId(
      validatedData.sender,
      validatedData.receiver,
      nonce
    );

    const duration = validatedData.duration || config.defaultChannelDuration;
    const now = Math.floor(Date.now() / 1000);

    const channel = {
      id: channelId,
      sender: validatedData.sender,
      receiver: validatedData.receiver,
      balance: BigInt(validatedData.initialDeposit),
      withdrawn: BigInt(0),
      nonce: 0,
      expiresAt: now + duration,
      createdAt: now,
    };

    channelStorage.createChannel(channel);

    return c.json({
      success: true,
      channel: {
        id: channel.id,
        sender: channel.sender,
        receiver: channel.receiver,
        balance: channel.balance.toString(),
        withdrawn: channel.withdrawn.toString(),
        nonce: channel.nonce,
        expiresAt: channel.expiresAt,
        createdAt: channel.createdAt,
      },
    }, 201);
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    return c.json({ success: false, error: 'Unknown error' }, 500);
  }
});

// Get channel details
channels.get('/:channelId', async (c) => {
  const channelId = c.req.param('channelId');
  const channel = channelStorage.getChannel(channelId);

  if (!channel) {
    return c.json({ success: false, error: 'Channel not found' }, 404);
  }

  return c.json({
    success: true,
    channel: {
      id: channel.id,
      sender: channel.sender,
      receiver: channel.receiver,
      balance: channel.balance.toString(),
      withdrawn: channel.withdrawn.toString(),
      nonce: channel.nonce,
      expiresAt: channel.expiresAt,
      createdAt: channel.createdAt,
    },
  });
});

// Process a payment
channels.post('/:channelId/pay', async (c) => {
  try {
    const channelId = c.req.param('channelId');
    const body = await c.req.json();
    const validatedData = PaymentSchema.parse(body) as PaymentRequest;

    if (validatedData.channelId !== channelId) {
      return c.json({ success: false, error: 'Channel ID mismatch' }, 400);
    }

    const channel = channelStorage.getChannel(channelId);
    if (!channel) {
      return c.json({ success: false, error: 'Channel not found' }, 404);
    }

    // Check if channel has expired
    const now = Math.floor(Date.now() / 1000);
    if (now > channel.expiresAt) {
      return c.json({ success: false, error: 'Channel has expired' }, 400);
    }

    // Verify nonce is incrementing
    if (validatedData.nonce <= channel.nonce) {
      return c.json({ success: false, error: 'Invalid nonce' }, 400);
    }

    // Verify signature
    const isValid = verifySignature(
      channelId,
      validatedData.amount,
      validatedData.nonce,
      validatedData.signature,
      channel.sender
    );

    if (!isValid) {
      return c.json({ success: false, error: 'Invalid signature' }, 401);
    }

    // Check if amount is within channel balance
    const amount = BigInt(validatedData.amount);
    const totalWithdrawn = channel.withdrawn + amount;
    
    if (totalWithdrawn > channel.balance) {
      return c.json({ success: false, error: 'Insufficient channel balance' }, 400);
    }

    // Update channel state
    channelStorage.updateChannel(channelId, {
      withdrawn: totalWithdrawn,
      nonce: validatedData.nonce,
    });

    return c.json({
      success: true,
      payment: {
        channelId,
        amount: validatedData.amount,
        nonce: validatedData.nonce,
        withdrawn: totalWithdrawn.toString(),
        remaining: (channel.balance - totalWithdrawn).toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    return c.json({ success: false, error: 'Unknown error' }, 500);
  }
});

// Settle and close a channel
channels.post('/:channelId/settle', async (c) => {
  try {
    const channelId = c.req.param('channelId');
    const body = await c.req.json();
    const validatedData = SettlementSchema.parse(body) as SettlementRequest;

    if (validatedData.channelId !== channelId) {
      return c.json({ success: false, error: 'Channel ID mismatch' }, 400);
    }

    const channel = channelStorage.getChannel(channelId);
    if (!channel) {
      return c.json({ success: false, error: 'Channel not found' }, 404);
    }

    // Verify signature
    const isValid = verifySignature(
      channelId,
      validatedData.finalAmount,
      validatedData.nonce,
      validatedData.signature,
      channel.sender
    );

    if (!isValid) {
      return c.json({ success: false, error: 'Invalid signature' }, 401);
    }

    // Verify final amount doesn't exceed balance
    const finalAmount = BigInt(validatedData.finalAmount);
    if (finalAmount > channel.balance) {
      return c.json({ success: false, error: 'Final amount exceeds balance' }, 400);
    }

    // Delete the channel (settlement complete)
    channelStorage.deleteChannel(channelId);

    return c.json({
      success: true,
      settlement: {
        channelId,
        finalAmount: validatedData.finalAmount,
        refund: (channel.balance - finalAmount).toString(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ success: false, error: error.message }, 400);
    }
    return c.json({ success: false, error: 'Unknown error' }, 500);
  }
});

// List all channels
channels.get('/', async (c) => {
  const allChannels = channelStorage.listChannels();
  
  return c.json({
    success: true,
    channels: allChannels.map((ch) => ({
      id: ch.id,
      sender: ch.sender,
      receiver: ch.receiver,
      balance: ch.balance.toString(),
      withdrawn: ch.withdrawn.toString(),
      nonce: ch.nonce,
      expiresAt: ch.expiresAt,
      createdAt: ch.createdAt,
    })),
  });
});

export default channels;
