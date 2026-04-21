# PrivacyLayer TypeScript SDK

TypeScript SDK for PrivacyLayer - a privacy-preserving protocol on Stellar/Soroban blockchain.

## Features

✅ **Core Functionality**
- Note generation and management
- Deposit and withdrawal operations
- Merkle tree implementation
- Zero-knowledge proof support

✅ **Cryptographic Utilities**
- Poseidon hash function
- Field element operations
- Commitment and nullifier generation
- Secure random generation

✅ **Validation & Encoding**
- Comprehensive input validation
- Hex/Base64 encoding utilities
- Type-safe operations
- Stellar address validation

✅ **Full TypeScript Support**
- Complete type definitions
- JSDoc documentation
- IntelliSense support

## Installation

```bash
npm install @privacylayer/sdk
```

## Quick Start

```typescript
import { 
  randomFieldElement,
  computeCommitment,
  Denomination 
} from '@privacylayer/sdk';

// Generate a note
const nullifier = randomFieldElement();
const secret = randomFieldElement();
const commitment = computeCommitment(nullifier, secret);

console.log('Note created:', {
  nullifier: nullifier.toString(),
  secret: secret.toString(),
  commitment: commitment.toString(),
  denomination: Denomination.TEN
});
```

## Core Concepts

### Notes

A note represents a private deposit in the PrivacyLayer protocol:

```typescript
interface Note {
  nullifier: string;      // Unique identifier (32 bytes hex)
  secret: string;         // Secret value (32 bytes hex)
  commitment: string;     // Commitment hash (32 bytes hex)
  denomination: Denomination;  // Amount (10, 100, 1000, 10000)
}
```

### Denominations

Fixed denominations for privacy:

```typescript
enum Denomination {
  TEN = 10,
  HUNDRED = 100,
  THOUSAND = 1000,
  TEN_THOUSAND = 10000
}
```

### Merkle Tree

Privacy-preserving commitment storage:

```typescript
const MERKLE_TREE_DEPTH = 20;  // Supports 2^20 = 1,048,576 deposits
```

## API Reference

### Cryptographic Functions

#### `randomFieldElement(): bigint`

Generate a random field element.

```typescript
const element = randomFieldElement();
```

#### `poseidonHash(inputs: bigint[]): bigint`

Compute Poseidon hash of inputs.

```typescript
const hash = poseidonHash([BigInt(123), BigInt(456)]);
```

#### `computeCommitment(nullifier: bigint, secret: bigint): bigint`

Compute commitment from nullifier and secret.

```typescript
const commitment = computeCommitment(nullifier, secret);
```

#### `computeNullifierHash(nullifier: bigint): bigint`

Compute nullifier hash for withdrawal.

```typescript
const nullifierHash = computeNullifierHash(nullifier);
```

### Encoding Utilities

#### `hexToBytes(hex: string): Buffer`

Convert hex string to bytes.

```typescript
const bytes = hexToBytes('deadbeef');
```

#### `bytesToHex(bytes: Buffer, prefix?: boolean): string`

Convert bytes to hex string.

```typescript
const hex = bytesToHex(buffer);
const hexWithPrefix = bytesToHex(buffer, true); // '0x...'
```

#### `stringToHex(str: string, prefix?: boolean): string`

Convert string to hex.

```typescript
const hex = stringToHex('hello');
```

#### `toBase64(data: string | Buffer): string`

Encode to Base64.

```typescript
const base64 = toBase64('hello');
```

### Validation Functions

#### `isValidAddress(address: string): boolean`

Validate Stellar address.

```typescript
if (isValidAddress(address)) {
  // Valid Stellar address
}
```

#### `isValidAmount(amount: number): boolean`

Validate denomination amount.

```typescript
if (isValidAmount(amount)) {
  // Valid denomination
}
```

#### `isValidFieldElement(value: bigint): boolean`

Validate field element.

```typescript
if (isValidFieldElement(value)) {
  // Valid field element
}
```

#### `isValidNote(note: unknown): boolean`

Validate note structure.

```typescript
if (isValidNote(note)) {
  // Valid note object
}
```

## Examples

### Creating a Note

```typescript
import { 
  randomFieldElement,
  computeCommitment,
  bigIntToHex,
  Denomination 
} from '@privacylayer/sdk';

// Generate random values
const nullifier = randomFieldElement();
const secret = randomFieldElement();

// Compute commitment
const commitment = computeCommitment(nullifier, secret);

// Create note
const note = {
  nullifier: bigIntToHex(nullifier, 32),
  secret: bigIntToHex(secret, 32),
  commitment: bigIntToHex(commitment, 32),
  denomination: Denomination.HUNDRED
};

console.log('Note:', note);
```

### Validating Input

```typescript
import { 
  isValidAddress,
  isValidAmount,
  isValidNote,
  assert 
} from '@privacylayer/sdk';

// Validate address
const address = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
assert(isValidAddress(address), 'Invalid Stellar address');

// Validate amount
const amount = 100;
assert(isValidAmount(amount), 'Invalid denomination');

// Validate note
assert(isValidNote(note), 'Invalid note structure');
```

### Computing Hashes

```typescript
import { 
  poseidonHash,
  hashPair,
  computeNullifierHash 
} from '@privacylayer/sdk';

// Hash multiple values
const hash = poseidonHash([BigInt(1), BigInt(2), BigInt(3)]);

// Hash a pair (for Merkle tree)
const pairHash = hashPair(leftNode, rightNode);

// Compute nullifier hash for withdrawal
const nullifierHash = computeNullifierHash(nullifier);
```

### Encoding/Decoding

```typescript
import { 
  hexToBytes,
  bytesToHex,
  stringToHex,
  hexToString,
  toBase64,
  fromBase64 
} from '@privacylayer/sdk';

// Hex operations
const bytes = hexToBytes('deadbeef');
const hex = bytesToHex(bytes);

// String operations
const hexStr = stringToHex('hello');
const str = hexToString(hexStr);

// Base64 operations
const base64 = toBase64('hello');
const decoded = fromBase64(base64);
```

## Constants

```typescript
// Merkle tree depth (supports 2^20 deposits)
export const MERKLE_TREE_DEPTH = 20;

// Maximum number of leaves
export const MAX_LEAVES = 2 ** MERKLE_TREE_DEPTH;

// Field size for BN254 curve
export const FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

// Zero value for empty tree nodes
export const ZERO_VALUE = BigInt(0);
```

## Network Configuration

```typescript
interface NetworkConfig {
  rpcUrl: string;              // Soroban RPC endpoint
  networkPassphrase: string;   // Network passphrase
  contractId: string;          // PrivacyLayer contract ID
}

// Example: Testnet
const testnetConfig: NetworkConfig = {
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM'
};
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Random Generation**: Uses cryptographically secure random generation
2. **Field Elements**: All values are validated to be within the field size
3. **Nullifier Uniqueness**: Nullifiers must be unique to prevent double-spending
4. **Secret Protection**: Secrets should never be shared or logged
5. **Commitment Privacy**: Commitments are public but don't reveal nullifier/secret

## Architecture

```
sdk/
├── src/
│   ├── types.ts           # Type definitions
│   ├── constants.ts       # Constants
│   ├── utils/
│   │   ├── crypto.ts      # Cryptographic utilities
│   │   ├── encoding.ts    # Encoding utilities
│   │   ├── validation.ts  # Validation utilities
│   │   └── index.ts       # Exports
│   ├── __tests__/         # Test files
│   └── index.ts           # Main entry point
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Links

- **Issue**: https://github.com/PrivacyLayer/PrivacyLayer/issues/7
- **Documentation**: https://privacylayer.org/docs
- **Stellar**: https://stellar.org
- **Soroban**: https://soroban.stellar.org

## Support

For questions and support:
- GitHub Issues: https://github.com/PrivacyLayer/PrivacyLayer/issues
- Discord: https://discord.gg/privacylayer

---

**Status**: Ready for review and testing

**Implementation**: Addresses issue #7 - TypeScript SDK for PrivacyLayer
