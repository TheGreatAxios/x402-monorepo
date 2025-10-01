# x402 Facilitator Examples

This directory contains example code for interacting with the x402 Facilitator.

## Test Client

The `test-client.ts` demonstrates the complete workflow of using the facilitator:

1. **Creating a payment channel** - Establishes a channel between sender and receiver
2. **Making payments** - Sends signed payment requests to the facilitator
3. **Accessing protected content** - Uses X-402 headers to pay for premium content
4. **Settling the channel** - Closes the channel with final settlement

### Running the Test Client

1. Start the facilitator server:
```bash
bun run dev
```

2. In another terminal, run the test client:
```bash
bun run examples/test-client.ts
```

### What the Test Client Does

The test client:
- Generates a random Ethereum wallet for testing
- Creates a payment channel with 1 ETH deposit
- Makes two payments (0.01 ETH and 0.02 ETH)
- Accesses protected content using X-402 header (0.001 ETH)
- Settles the channel with the final amount

### Key Concepts Demonstrated

#### 1. Channel Creation
```typescript
const channelData = {
  sender: wallet.address,
  receiver: receiverAddress,
  initialDeposit: '1000000000000000000', // 1 ETH in wei
  duration: 86400, // 1 day in seconds
};
```

#### 2. Payment Signing
Payments must be cryptographically signed by the sender:
```typescript
const messageHash = ethers.solidityPackedKeccak256(
  ['bytes32', 'uint256', 'uint256'],
  [channelId, amount, nonce]
);
const signature = await wallet.signMessage(ethers.getBytes(messageHash));
```

#### 3. X-402 Header Format
To access protected content, include payment details in the X-402 header:
```typescript
const x402Header = JSON.stringify({
  channelId: '0x...',
  amount: '1000000000000000',
  nonce: 1,
  signature: '0x...',
});

fetch('/api/content', {
  headers: { 'X-402': x402Header }
});
```

## Creating Your Own Client

To integrate the facilitator into your application:

1. **Install ethers.js** for signature generation:
```bash
bun add ethers
```

2. **Create a wallet** (in production, load from secure storage):
```typescript
import { ethers } from 'ethers';
const wallet = new ethers.Wallet(privateKey);
```

3. **Open a channel** before making payments

4. **Sign each payment** with incrementing nonces

5. **Include X-402 headers** when accessing paid content

6. **Settle channels** when done to reclaim unused balance

## Security Notes

- Never expose private keys in client-side code
- Always verify signatures on the server side
- Use HTTPS in production
- Implement rate limiting and abuse prevention
- Store channel state persistently in production
- Monitor for replay attacks and expired channels
