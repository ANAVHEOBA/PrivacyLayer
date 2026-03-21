# @privacylayer/sdk

TypeScript SDK for PrivacyLayer — the first ZK-proof shielded pool on Stellar Soroban.

## Installation

```bash
npm install @privacylayer/sdk
```

## Quick Start

```typescript
import {
  randomFieldElement,
  computeCommitment,
  NETWORKS,
  Denomination,
  isValidStellarAddress,
} from "@privacylayer/sdk";

// Generate a new privacy note
const nullifier = randomFieldElement();
const secret = randomFieldElement();
const commitment = computeCommitment(
  nullifier.toString(16),
  secret.toString(16),
);

console.log("Commitment:", commitment);

// Validate a recipient address
const recipient = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
if (isValidStellarAddress(recipient)) {
  console.log("Valid address!");
}

// Use network config
const config = NETWORKS.testnet;
console.log("RPC:", config.rpcUrl);
```

## Modules

### Types

Core TypeScript interfaces and enums:
- `Note` — A privacy note with nullifier, secret, and commitment
- `DepositReceipt` — Receipt returned after deposit
- `NetworkConfig` — Stellar network configuration
- `WithdrawParams` — Parameters for withdrawal
- `Denomination` — Supported deposit denominations (10, 100, 1000, 10000)

### Constants

- `NETWORKS` — Pre-configured testnet/mainnet settings
- `MERKLE_TREE_DEPTH` — Depth of the commitment Merkle tree (20)
- `FIELD_SIZE` — BN254 scalar field size

### Utilities

**Crypto** (`utils/crypto`):
- `randomFieldElement()` — Random BN254 field element
- `randomHex(byteLength)` — Random hex string
- `sha256(data)` — SHA-256 hash
- `mimcHash(left, right)` — MiMC hash (ZK-friendly)
- `computeCommitment(nullifier, secret)` — Compute note commitment
- `computeNullifierHash(nullifier)` — Compute nullifier hash for withdrawal

**Encoding** (`utils/encoding`):
- `hexToBytes(hex)` — Hex string to Buffer
- `bytesToHex(bytes, prefix?)` — Buffer to hex string
- `toBase64(input)` / `fromBase64(input)` — Base64 encoding
- `bigintToHex(value, byteLength?)` — BigInt to zero-padded hex
- `hexToBigint(hex)` — Hex to BigInt

**Validation** (`utils/validation`):
- `isValidStellarAddress(address)` — Validate Stellar address format
- `isValidHex(hex, expectedLength?)` — Validate hex string
- `isFieldElement(value)` — Check if value is in BN254 scalar field
- `isValidDenomination(value)` — Validate denomination value
- `isValidAmount(amount)` — Validate positive amount

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.2

## License

MIT
