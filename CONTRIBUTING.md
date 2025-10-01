# Contributing to x402 Facilitator

Thank you for your interest in contributing! This document provides guidelines for contributing to the x402 Facilitator project.

## Development Setup

1. Install [Bun](https://bun.sh):
```bash
curl -fsSL https://bun.sh/install | bash
```

2. Clone the repository:
```bash
git clone https://github.com/enfusion-ai/facilitator.git
cd facilitator
```

3. Install dependencies:
```bash
bun install
```

4. Run the development server:
```bash
bun run dev
```

## Project Structure

```
├── src/
│   ├── app.ts              # Main Hono application
│   ├── config.ts           # Configuration management
│   ├── context.ts          # TypeScript context types
│   ├── crypto.ts           # Cryptographic utilities
│   ├── storage.ts          # Channel storage (in-memory)
│   ├── types.ts            # TypeScript type definitions
│   ├── validators.ts       # Zod validation schemas
│   ├── middleware/
│   │   ├── logger.ts       # Request logging middleware
│   │   └── x402.ts         # x402 payment verification middleware
│   └── routes/
│       └── channels.ts     # Channel management endpoints
├── examples/               # Example code and test clients
├── index.ts               # Server entry point
└── README.md              # Documentation
```

## Code Style

- Use TypeScript for all code
- Follow existing code formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Run `bun run typecheck` before committing

## Making Changes

1. Create a new branch for your feature/fix:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Test your changes:
```bash
bun run typecheck
bun run build
bun run examples/test-client.ts
```

4. Commit your changes with a clear message:
```bash
git commit -m "Add feature: description"
```

5. Push and create a pull request

## Adding New Features

### Adding New Endpoints

1. Create or modify routes in `src/routes/`
2. Add validation schemas in `src/validators.ts`
3. Update type definitions in `src/types.ts`
4. Document the endpoint in README.md

### Adding Middleware

1. Create a new file in `src/middleware/`
2. Export an async function that takes `(c: Context, next: Next)`
3. Register it in `src/app.ts`

### Replacing Storage Backend

The in-memory storage in `src/storage.ts` is designed to be easily replaced:

1. Create a new storage implementation with the same interface
2. Replace imports in route files
3. Ensure all methods return the same types

Example storage backends to implement:
- Redis for fast caching
- PostgreSQL for persistence
- MongoDB for document storage

## Testing

Currently, the project uses example scripts for testing. To test:

1. Start the server: `bun run dev`
2. Run test client: `bun run examples/test-client.ts`

Future contributions could add:
- Unit tests with Bun's test runner
- Integration tests
- Load testing

## Areas for Contribution

### High Priority
- [ ] Add persistent database storage
- [ ] Implement rate limiting
- [ ] Add authentication/authorization
- [ ] Smart contract integration for on-chain settlement
- [ ] WebSocket support for real-time updates

### Medium Priority
- [ ] Add comprehensive test suite
- [ ] Implement channel expiration cleanup
- [ ] Add metrics and monitoring
- [ ] Improve error messages
- [ ] Add OpenAPI/Swagger documentation

### Low Priority
- [ ] Add Docker support
- [ ] Create deployment guides
- [ ] Add more example clients (Python, Go, etc.)
- [ ] Performance benchmarking
- [ ] Add GraphQL API

## Security Considerations

When contributing, please keep in mind:

- Never commit secrets or private keys
- Validate all user inputs
- Use parameterized queries if adding database support
- Be mindful of replay attacks
- Consider rate limiting and DoS protection
- Review cryptographic operations carefully

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the code
- Suggestions for improvements

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
