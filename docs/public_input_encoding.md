# Public Input Encoding (ZK-008)

This document describes the dedicated encoding layer for withdrawal public inputs, which consolidates all encoding logic into a single, testable API.

## Overview

The `sdk/src/public_inputs.ts` module provides canonical encoding functions for all withdrawal public inputs. All public-input encoding should be routed through this module to ensure consistency between the SDK, fixtures, and contract verifier.

## Public Input Order

### Circuit Public Inputs (8 fields)

Matching `circuits/withdraw/src/main.nr`:

1. `pool_id` - Unique identifier for the shielded pool
2. `root` - Merkle root proving membership
3. `nullifier_hash` - Hash(nullifier, pool_id) preventing double-spend (ZK-035)
4. `recipient` - Stellar address hash preventing front-running
5. `amount` - Withdrawal amount
6. `relayer` - Optional relayer address hash (0 if none)
7. `fee` - Relayer fee (0 if no relayer)
8. `denomination` - Fixed denomination of the pool (ZK-030)

### Contract Verifier Inputs (6 fields)

Matching `contracts/privacy_pool/src/crypto/verifier.rs`:

1. `root`
2. `nullifier_hash`
3. `recipient`
4. `amount`
5. `relayer`
6. `fee`

Note: `pool_id` and `denomination` are SDK-only validation inputs not passed to the contract verifier.

## Encoding Functions

### Field Element Encoding

- `fieldToHex(n: bigint): string` - Convert bigint to 64-char hex string
- `hexToField(hex: string): bigint` - Parse hex string to field element (mod FIELD_MODULUS)
- `bufferToField(buf: Buffer): bigint` - Convert buffer to field element (mod FIELD_MODULUS)
- `fieldToBuffer(n: bigint, byteLength?: number): Buffer` - Serialize field element to big-endian bytes

### Public Input Encoding

- `encodePoolId(poolId: string): string` - Encode 32-byte pool ID hex string
- `encodeMerkleRoot(root: Buffer): string` - Encode 32-byte Merkle root
- `encodeNullifier(nullifier: Buffer): string` - Encode 31-byte nullifier
- `encodeSecret(secret: Buffer): string` - Encode 31-byte secret
- `encodeStellarAddress(address: string): string` - Encode Stellar address (SHA-256 hash)
- `encodeAmount(amount: bigint): string` - Encode amount as field element
- `encodeFee(fee: bigint): string` - Encode fee as field element
- `encodeDenomination(denomination: bigint): string` - Encode denomination as field element
- `encodeNullifierHash(nullifierField: string, poolIdField: string): string` - Compute domain-separated nullifier hash

### Serialization

- `serializeWithdrawalPublicInputs(source: WithdrawalPublicInputs): SerializedWithdrawalPublicInputs` - Serialize all 8 circuit public inputs
- `serializeContractVerifierInputs(source: WithdrawalPublicInputs): SerializedContractVerifierInputs` - Serialize 6 contract verifier inputs
- `packWithdrawalPublicInputs(...): string[]` - Convenience function to pack individual values

## Usage Examples

### Encoding Individual Values

```typescript
import { encodeAmount, encodeFee, encodeStellarAddress } from './public_inputs';

const amountField = encodeAmount(100n);
const feeField = encodeFee(10n);
const recipientField = encodeStellarAddress('G...');
```

### Serializing Public Inputs

```typescript
import { serializeWithdrawalPublicInputs } from './public_inputs';

const publicInputs = {
  pool_id: 'a'.repeat(64),
  root: 'b'.repeat(64),
  nullifier_hash: 'c'.repeat(64),
  recipient: 'd'.repeat(64),
  amount: '100',
  relayer: 'e'.repeat(64),
  fee: '10',
  denomination: '64'.padStart(64, '0'),
};

const serialized = serializeWithdrawalPublicInputs(publicInputs);
// serialized.fields: string[] - array of 64-char hex strings
// serialized.bytes: Buffer - 256 bytes (8 * 32 bytes)
```

### Contract Verifier Inputs

```typescript
import { serializeContractVerifierInputs } from './public_inputs';

const verifierInputs = serializeContractVerifierInputs(publicInputs);
// verifierInputs.fields: string[] - array of 6 64-char hex strings
// verifierInputs.bytes: Buffer - 192 bytes (6 * 32 bytes)
```

## Edge Cases

### Zero Values

- Zero amount: `encodeAmount(0n)` returns `'0'.padStart(64, '0')`
- Zero fee: `encodeFee(0n)` returns `'0'.padStart(64, '0')`
- Zero field element: `fieldToHex(0n)` returns `'0'.padStart(64, '0')`

### Boundary Amounts

- Amount of 1: `encodeAmount(1n)` returns `'1'.padStart(64, '0')`
- Large amount near field modulus: `encodeAmount(FIELD_MODULUS - 1n)` returns valid hex string

### Invalid Inputs

- Negative amount: `encodeAmount(-1n)` throws Error
- Negative fee: `encodeFee(-1n)` throws Error
- Zero or negative denomination: `encodeDenomination(0n)` or `encodeDenomination(-1n)` throws Error
- Invalid Stellar address: `encodeStellarAddress('invalid')` throws WitnessValidationError
- Invalid buffer length: `encodeNullifier(Buffer.alloc(32))` throws Error (expects 31 bytes)

## Backward Compatibility

The `sdk/src/encoding.ts` module re-exports all functions from `public_inputs.ts` for backward compatibility. Legacy function names are also available as aliases:

- `noteScalarToField` → `encodeNullifier`
- `merkleNodeToField` → `encodeMerkleRoot`
- `stellarAddressToField` → `encodeStellarAddress`
- `poolIdToField` → `encodePoolId`
- `computeNullifierHash` → `encodeNullifierHash`

New code should import directly from `public_inputs.ts` to ensure consistent encoding across the SDK.

## Testing

Comprehensive tests are provided in `sdk/test/public_inputs.test.ts`:

- Field element encoding tests
- Public input encoding tests
- Zero value and boundary amount tests
- Invalid Stellar address input tests
- Schema validation tests
- Serialization tests
- Encoding consistency tests

## Contract Verifier Alignment

The `serializeContractVerifierInputs` function produces the exact format expected by the Soroban contract verifier in `contracts/privacy_pool/src/crypto/verifier.rs`. The order and byte layout match:

```rust
let inputs: [&BytesN<32>; 6] = [
    &pub_inputs.root,
    &pub_inputs.nullifier_hash,
    &pub_inputs.recipient,
    &pub_inputs.amount,
    &pub_inputs.relayer,
    &pub_inputs.fee,
];
```

## Migration Guide

For existing code using the old `encoding.ts` module:

1. Update imports from `./encoding` to `./public_inputs`
2. Replace legacy function names with new ones (optional but recommended)
3. Ensure tests pass with the new encoding functions
4. Verify that fixture generation uses the same encoding functions

Example migration:

```typescript
// Old
import { noteScalarToField, stellarAddressToField } from './encoding';

// New
import { encodeNullifier, encodeStellarAddress } from './public_inputs';
```
