# @privacylayer/sdk

TypeScript SDK for PrivacyLayer - Zero-Knowledge Privacy Pool on Stellar Soroban

## Overview

This SDK provides a comprehensive interface for interacting with PrivacyLayer privacy pools on the Stellar network using Soroban smart contracts. It enables developers to:

- Create shielded deposits with zero-knowledge proofs
- Generate and manage privacy notes
- Execute private withdrawals
- Verify Merkle tree inclusion proofs

## Installation

```bash
npm install @privacylayer/sdk
```

## Quick Start

```typescript
import { PrivacyLayerSDK, NETWORKS, generateNote } from '@privacylayer/sdk';

// Initialize the SDK
const sdk = new PrivacyLayerSDK({ 
  network: NETWORKS.testnet,
  debug: true 
});

// Initialize cryptographic parameters
await sdk.init();

// Create a deposit note
const note = await sdk.createNote(100);
console.log('Generated note:', note);

// Compute commitment
const commitment = await sdk.computeCommitment(note.nullifier, note.secret);
console.log('Commitment:', commitment);
```

## API Reference

### PrivacyLayerSDK

Main class for interacting with privacy pools.

#### Constructor

```typescript
const sdk = new PrivacyLayerSDK(options: SDKOptions);
```

**SDKOptions:**
| Property | Type | Description |
|----------|------|-------------|
| `network` | `NetworkConfig` | Network configuration |
| `debug` | `boolean` | Enable debug logging (optional) |

#### Methods

- `init(): Promise<void>` - Initialize cryptographic parameters
- `createNote(denomination: number): Promise<Note>` - Generate a new deposit note
- `computeCommitment(nullifier: string, secret: string): Promise<string>` - Compute Pedersen commitment
- `getPoolState(): Promise<PoolState>` - Get current pool state
- `deposit(denomination: number): Promise<{ note, receipt }>` - Create a deposit
- `withdraw(params: WithdrawParams): Promise<TransactionResult>` - Execute a withdrawal

### Constants

```typescript
import { 
  NETWORKS,           // Network configurations
  MERKLE_TREE_DEPTH,  // Merkle tree depth (20)
  FIELD_SIZE,         // BN254 scalar field size
  ZERO_VALUE,         // Zero leaf value
  SDK_VERSION         // SDK version string
} from '@privacylayer/sdk';
```

### Types

```typescript
import {
  Denomination,       // Deposit denominations (10, 100, 1000, 10000)
  Note,               // Privacy note structure
  DepositReceipt,     // Deposit transaction receipt
  NetworkConfig,      // Network configuration
  MerkleProof,        // Merkle tree proof
  WithdrawParams,     // Withdrawal parameters
  TransactionStatus,  // Transaction status enum
  TransactionResult   // Transaction result
} from '@privacylayer/sdk';
```

### Utilities

#### Crypto Utilities

```typescript
import {
  randomFieldElement,     // Generate random BN254 field element
  randomHex,              // Generate random hex string
  pedersenHash,           // Compute Pedersen hash
  sha256,                 // Compute SHA-256 hash
  computeCommitment,      // Compute note commitment
  computeNullifierHash,   // Compute nullifier hash
  generateNote            // Generate new deposit note
} from '@privacylayer/sdk';
```

#### Encoding Utilities

```typescript
import {
  hexToBytes,             // Hex string to Buffer
  bytesToHex,             // Buffer to hex string
  bigintToHex,            // BigInt to hex string
  hexToBigint,            // Hex string to BigInt
  toBase64,               // Encode to base64
  fromBase64,             // Decode from base64
  formatHex               // Format hex string
} from '@privacylayer/sdk';
```

#### Validation Utilities

```typescript
import {
  isValidStellarAddress,  // Validate Stellar address
  isValidHex,             // Validate hex string
  isFieldElement,         // Check BN254 field element
  isValidDenomination,    // Validate denomination
  isValidAmount,          // Validate amount
  isValidNote,            // Validate note structure
  isValidMerkleProof      // Validate merkle proof
} from '@privacylayer/sdk';
```

## Usage Examples

### Creating a Deposit

```typescript
// Initialize SDK
const sdk = new PrivacyLayerSDK({ network: NETWORKS.testnet });
await sdk.init();

// Create a 100 XLM deposit
const { note, receipt } = await sdk.deposit(100);

// Save the note securely - it's needed for withdrawal!
console.log('Save this note:', JSON.stringify(note));
console.log('Deposit receipt:', receipt);
```

### Withdrawing Funds

```typescript
// Load your saved note
const savedNote = JSON.parse(storedNoteJson);

// Get merkle proof from the pool (implementation-specific)
const merkleProof = await getMerkleProof(savedNote.commitment);

// Execute withdrawal
const result = await sdk.withdraw({
  note: savedNote,
  merkleProof: merkleProof,
  recipient: 'GD5PXWBKVV4VLYKXG3Y3JLG7TLTJAQKQ3LQY3L5XJ7QKQ3LQY3L5XJ7QKQ3LQY3',
});

console.log('Withdrawal status:', result.status);
```

### Using Low-Level Crypto Functions

```typescript
import { 
  randomFieldElement, 
  computeCommitment, 
  computeNullifierHash 
} from '@privacylayer/sdk';

// Generate random nullifier and secret
const nullifier = randomFieldElement();
const secret = randomFieldElement();

// Compute commitment
const commitment = await computeCommitment(nullifier, secret);

// Compute nullifier hash (bound to a root)
const root = 12345n; // Current merkle root
const nullifierHash = await computeNullifierHash(nullifier, root);
```

## Network Configuration

```typescript
// Pre-configured networks
NETWORKS.testnet   // Stellar Testnet
NETWORKS.mainnet   // Stellar Mainnet
NETWORKS.futurenet // Stellar Futurenet

// Custom network
const customNetwork: NetworkConfig = {
  rpcUrl: 'https://custom-rpc.example.com',
  networkPassphrase: 'Custom Network Passphrase',
  contractId: 'your-deployed-contract-id',
  name: 'Custom Network'
};
```

## Security Considerations

1. **Note Storage**: Notes must be stored securely. Anyone with access to the note can withdraw the funds.

2. **Nullifier Uniqueness**: Each note can only be withdrawn once. The nullifier hash prevents double-spending.

3. **Pedersen Hash**: The SDK uses Pedersen hash for ZK-friendly operations, matching the Noir circuit implementation.

4. **Field Elements**: All cryptographic values are within the BN254 scalar field.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Lint

```bash
npm run lint
npm run lint:fix
```

## License

MIT

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.