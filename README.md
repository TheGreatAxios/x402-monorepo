# x402 Facilitator

A high-performance x402 payment facilitator built with Hono, Bun, and TypeScript. This facilitator enables micropayment channels for on-chain transactions, following the x402 protocol.

## Features

- **Payment Channel Management**: Create, manage, and settle payment channels
- **x402 Protocol Support**: Full implementation of x402 payment headers
- **Cryptographic Verification**: Signature validation for all payment operations
- **High Performance**: Built on Bun runtime with Hono framework for maximum speed
- **TypeScript**: Fully typed for better developer experience
- **In-Memory Storage**: Fast channel state management (easily replaceable with persistent storage)

## Installation

Ensure you have [Bun](https://bun.sh) installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

Install dependencies:

```bash
bun install
```

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Available configuration options:
- `PORT`: Server port (default: 3000)
- `HOST`: Server host (default: 0.0.0.0)

## Usage

### Development Mode (with hot reload)

```bash
bun run dev
```

### Production Mode

```bash
bun run start
```

### Build

```bash
bun run build
```

### Type Checking

```bash
bun run typecheck
```

## Quick Start

Run the example test client to see the facilitator in action:

1. Start the server in one terminal:
```bash
bun run dev
```

2. Run the test client in another terminal:
```bash
bun run examples/test-client.ts
```

The test client demonstrates creating channels, making payments, and accessing protected content with X-402 headers. See [examples/README.md](examples/README.md) for more details.

## API Endpoints

### Health Check

```
GET /
```

Returns facilitator status and available endpoints.

### Channel Management

#### Create a Payment Channel

```
POST /api/channels
Content-Type: application/json

{
  "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "receiver": "0x5aeda56215b167893e80b4fe645ba6d5bab767de",
  "initialDeposit": "1000000000000000000",
  "duration": 604800
}
```

#### List All Channels

```
GET /api/channels
```

#### Get Channel Details

```
GET /api/channels/:channelId
```

#### Process a Payment

```
POST /api/channels/:channelId/pay
Content-Type: application/json

{
  "channelId": "0x...",
  "amount": "1000000000000000",
  "nonce": 1,
  "signature": "0x..."
}
```

#### Settle and Close a Channel

```
POST /api/channels/:channelId/settle
Content-Type: application/json

{
  "channelId": "0x...",
  "finalAmount": "5000000000000000",
  "nonce": 5,
  "signature": "0x..."
}
```

### Protected Content (X-402 Payment Required)

```
GET /api/content
X-402: {"channelId":"0x...","amount":"1000000000000000","nonce":1,"signature":"0x..."}
```

This endpoint demonstrates how to protect resources with x402 micropayments. Include the X-402 header with payment details to access the content.

## x402 Protocol

The x402 protocol enables micropayments through off-chain payment channels. Key concepts:

- **Payment Channels**: Off-chain channels that allow multiple payments without blockchain transactions
- **Nonces**: Monotonically increasing counters to prevent replay attacks
- **Signatures**: Cryptographic signatures from the sender authorizing payments
- **Channel Settlement**: Final on-chain transaction to close a channel and settle balances

## Architecture

```
├── src/
│   ├── app.ts              # Main Hono application
│   ├── config.ts           # Configuration management
│   ├── crypto.ts           # Cryptographic utilities
│   ├── storage.ts          # Channel storage (in-memory)
│   ├── types.ts            # TypeScript type definitions
│   ├── validators.ts       # Zod validation schemas
│   ├── middleware/
│   │   ├── logger.ts       # Request logging middleware
│   │   └── x402.ts         # x402 payment verification middleware
│   └── routes/
│       └── channels.ts     # Channel management endpoints
└── index.ts                # Server entry point
```

## Security Considerations

- **Signature Verification**: All payments are cryptographically verified
- **Nonce Validation**: Prevents replay attacks
- **Balance Checks**: Ensures sufficient channel balance
- **Expiration Checks**: Prevents use of expired channels

## Deployment

### Docker

Build and run with Docker:

```bash
docker build -t x402-facilitator .
docker run -p 3000:3000 x402-facilitator
```

Or use Docker Compose:

```bash
docker-compose up -d
```

### Production Considerations

- Use a persistent database instead of in-memory storage
- Set up HTTPS with a reverse proxy (nginx, Caddy)
- Implement rate limiting and authentication
- Monitor channel expiration and cleanup
- Set up logging and metrics collection
- Use environment variables for configuration

## Development

This facilitator is designed to be extensible. Key areas for customization:

- **Storage Backend**: Replace `src/storage.ts` with a database implementation
- **Blockchain Integration**: Add smart contract interactions for channel creation/settlement
- **Additional Middleware**: Add authentication, rate limiting, or custom business logic
- **Payment Processing**: Extend payment verification with custom rules

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## References

- [x402 Protocol Documentation](https://x402.gitbook.io/x402)
- [Coinbase CDP x402 Guide](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)
- [Faremeter Implementation](https://github.com/faremeter/faremeter)
- [Hono Framework](https://hono.dev)
- [Bun Runtime](https://bun.sh)

## License

MIT
