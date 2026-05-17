# PrivacyLayer Event Indexer

A high-performance event indexer for the PrivacyLayer smart contract on Stellar/Soroban.

## Features

- **Real-time Event Indexing**: Automatically indexes all PrivacyLayer contract events
- **GraphQL API**: Query deposits, withdrawals, and admin events efficiently
- **WebSocket Subscriptions**: Real-time updates via GraphQL subscriptions
- **PostgreSQL Storage**: Persistent, indexed storage for historical queries
- **Docker Support**: Easy deployment with Docker Compose

## Events Indexed

| Event | Description | Fields |
|-------|-------------|--------|
| `DepositEvent` | Emitted on deposit | commitment, leafIndex, root |
| `WithdrawEvent` | Emitted on withdrawal | nullifierHash, recipient, relayer, fee, amount |
| `PoolPausedEvent` | Emitted when pool is paused | admin |
| `PoolUnpausedEvent` | Emitted when pool is unpaused | admin |
| `VkUpdatedEvent` | Emitted when verifying key is updated | admin |

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer/indexer

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# - DATABASE_URL: PostgreSQL connection string
# - CONTRACT_ID: Your deployed PrivacyLayer contract ID
# - SOROBAN_RPC_URL: Soroban RPC endpoint
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### Running the Indexer

```bash
# Development mode with auto-reload
npm run dev

# Production build
npm run build
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f indexer
```

## API Documentation

### GraphQL Endpoint

The indexer exposes a GraphQL API at `http://localhost:4000/graphql`.

### Example Queries

#### Get recent deposits

```graphql
query {
  deposits(pagination: { skip: 0, take: 10 }) {
    id
    commitment
    leafIndex
    root
    txHash
    timestamp
    ledger
  }
}
```

#### Get withdrawals by recipient

```graphql
query {
  withdrawals(filter: { recipient: "G..." }) {
    id
    nullifierHash
    recipient
    amount
    timestamp
  }
}
```

#### Check if commitment is used

```graphql
query {
  isCommitmentUsed(commitment: "0x...")
}
```

#### Get current Merkle tree state

```graphql
query {
  merkleTreeState {
    currentRoot
    leafCount
    lastUpdated
  }
}
```

### Real-time Subscriptions

#### Subscribe to new deposits

```graphql
subscription {
  onDeposit {
    commitment
    leafIndex
    root
    timestamp
  }
}
```

#### Subscribe to Merkle tree updates

```graphql
subscription {
  onMerkleTreeUpdate {
    currentRoot
    leafCount
    lastUpdated
  }
}
```

## Configuration

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org:443` |
| `NETWORK_PASSPHRASE` | Stellar network passphrase | Testnet |
| `CONTRACT_ID` | PrivacyLayer contract ID | Required |
| `POLL_INTERVAL` | Event polling interval (ms) | `5000` |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GraphQL API                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Queries   │  │ Mutations   │  │   Subscriptions     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Event Indexer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Parser    │  │  Processor  │  │   Merkle Sync       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Soroban RPC   │  │   PostgreSQL    │  │    PubSub       │
│   (Events)      │  │   (Storage)     │  │  (WebSocket)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Development

### Project Structure

```
indexer/
├── src/
│   ├── index.ts          # Main entry point
│   ├── indexer.ts        # Event indexing logic
│   ├── parsers.ts        # Event parsing utilities
│   ├── resolvers.ts      # GraphQL resolvers
│   └── schema.graphql    # GraphQL schema
├── prisma/
│   └── schema.prisma     # Database schema
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Running Tests

```bash
npm test
```

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please see the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Support

For issues and feature requests, please open a GitHub issue.