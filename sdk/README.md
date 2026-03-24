# @privacylayer/sdk

TypeScript SDK for PrivacyLayer - Zero-knowledge shielded pool on Stellar Soroban

## Installation

```bash
npm install @privacylayer/sdk
```

## Quick Start

```typescript
import { utils, Denomination } from '@privacylayer/sdk';

// Generate a new note
const note = utils.generateNote(Denomination.TEN);
console.log('Generated note:', note);

// Validate the note
const errors = utils.validateNote(note);
if (errors.length === 0) {
  console.log('Note is valid');
}

// Convert between formats
const hex = 'deadbeef';
const buffer = utils.hexToBuffer(hex);
const backToHex = utils.bufferToHex(buffer);
console.log('Conversion successful:', backToHex === hex);
```

## Features

- **Note Generation**: Create privacy-preserving notes for deposits
- **Cryptographic Utilities**: Field element operations and validation
- **Encoding/Decoding**: Hex, base64, and buffer conversions
- **Validation**: Address, amount, and network configuration validation
- **Type Safety**: Full TypeScript support with comprehensive type definitions

## API Reference

### Core Types

```typescript
import { Note, Denomination, DepositReceipt, NetworkConfig } from '@privacylayer/sdk';

// Note structure
const note: Note = {
  nullifier: 'hex-string',
  secret: 'hex-string',
  commitment: 'hex-string',
  denomination: Denomination.TEN
};
```

### Utilities

The SDK provides utility functions in three categories:

1. **Crypto**: Cryptographic operations and field element handling
2. **Encoding**: Data format conversions
3. **Validation**: Input validation and sanitization

```typescript
import { utils } from '@privacylayer/sdk';

// Generate random field element
const fieldElement = utils.randomFieldElement();

// Validate Stellar address
const isValid = utils.isValidStellarAddress('G...');

// Convert hex to base64
const base64 = utils.hexToBase64('deadbeef');
```

## Development

### Setup

```bash
cd sdk
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Contributing

Contributions are welcome! Please see the main repository's [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT
