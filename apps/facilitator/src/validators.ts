import { z } from 'zod';
import { isValidEthereumAddress } from './crypto';

export const CreateChannelSchema = z.object({
  sender: z.string().refine(isValidEthereumAddress, 'Invalid Ethereum address'),
  receiver: z.string().refine(isValidEthereumAddress, 'Invalid Ethereum address'),
  initialDeposit: z.string().regex(/^\d+$/, 'Invalid deposit amount'),
  duration: z.number().int().positive().optional(),
});

export const PaymentSchema = z.object({
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid channel ID'),
  amount: z.string().regex(/^\d+$/, 'Invalid amount'),
  nonce: z.number().int().nonnegative(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),
});

export const SettlementSchema = z.object({
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid channel ID'),
  finalAmount: z.string().regex(/^\d+$/, 'Invalid amount'),
  nonce: z.number().int().nonnegative(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),
});

export const X402HeaderSchema = z.object({
  amount: z.string().regex(/^\d+$/, 'Invalid amount'),
  channelId: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid channel ID'),
  nonce: z.number().int().nonnegative(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),
});
