# PrivacyLayer TypeScript SDK

TypeScript SDK for integrating privacy pool functionality into applications built on Stellar/Soroban.

## Installation

```bash
npm install @privacylayer/sdk
```

## Quick Start

```typescript
import { PrivacyLayer, Denomination } from '@privacylayer/sdk';

// Initialize the client
const client = new PrivacyLayer({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractId: 'YOUR_CONTRACT_ID',
});

// Generate a note for deposit
const { commitment } = await client.generateNote(Denomination.HUNDRED);
```

## Usage

### Client Configuration

```typescript
import { createClient } from '@privacylayer/sdk';

const client = createClient({
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractId: 'YOUR_CONTRACT_ID',
});
```

### Types

All types are exported from the main package:

```typescript
import { Note, DepositReceipt, Denomination, NetworkConfig } from '@privacylayer/sdk';
```

### Constants

```typescript
import { NETWORKS, MERKLE_TREE_DEPTH, Denomination } from '@privacylayer/sdk';

// Access predefined networks
const testnetConfig = NETWORKS.testnet;
```

### Utilities

The SDK exports utility functions for cryptographic operations, encoding, and validation:

```typescript
import {
  randomFieldElement,
  fieldToHex,
  validateAddress,
  validateAmount,
} from '@privacylayer/sdk';
```

## API Reference

### PrivacyLayer Client

#### `new PrivacyLayer(config)`

Creates a new PrivacyLayer client instance.

**Parameters:**
- `config.rpcUrl` - Soroban RPC endpoint URL
- `config.networkPassphrase` - Stellar network passphrase
- `config.contractId` - PrivacyLayer contract ID

#### `createClient(config)`

Factory function to create a PrivacyLayer client.

### Denomination

Enum for supported note denominations:

- `Denomination.TEN = 10`
- `Denomination.HUNDRED = 100`
- `Denomination.THOUSAND = 1000`
- `Denomination.TEN_THOUSAND = 10000`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run coverage

# Lint
npm run lint
```

## License

MIT
