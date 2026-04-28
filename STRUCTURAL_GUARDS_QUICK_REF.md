# Structural Guards Quick Reference (ZK-075)

## What Are Structural Guards?

Structural guards validate byte lengths and vector counts BEFORE deserializing elliptic curve points or touching cryptographic operations. They ensure malformed payloads fail fast with explicit errors.

## Expected Byte Lengths

```
G1 Point:        64 bytes
G2 Point:       128 bytes
Field Element:   32 bytes

Proof:
  A (G1):        64 bytes
  B (G2):       128 bytes
  C (G1):        64 bytes
  Total:        256 bytes

VK:
  alpha_g1:      64 bytes
  beta_g2:      128 bytes
  gamma_g2:     128 bytes
  delta_g2:     128 bytes
  IC vector:      9 points × 64 bytes = 576 bytes

Public Inputs:    8 fields × 32 bytes = 256 bytes
```

## Contract Usage (Rust)

### Automatic Validation

```rust
use crate::crypto::verifier::verify_proof;

// Structural guards run automatically in verify_proof()
let result = verify_proof(&env, &vk, &proof, &pub_inputs);

match result {
    Err(Error::MalformedProofA) => {
        // Proof A has wrong length
    }
    Err(Error::VkIcVectorWrongLength) => {
        // VK IC vector doesn't have 9 points
    }
    Err(Error::PublicInputWrongLength) => {
        // A public input field has wrong length
    }
    Ok(valid) => {
        // Structural validation passed, check pairing result
    }
    _ => {}
}
```

### Error Codes

```rust
// Proof errors
Error::MalformedProofA          // A is not 64 bytes
Error::MalformedProofB          // B is not 128 bytes
Error::MalformedProofC          // C is not 64 bytes

// VK errors
Error::VkAlphaG1WrongLength     // alpha_g1 is not 64 bytes
Error::VkBetaG2WrongLength      // beta_g2 is not 128 bytes
Error::VkGammaG2WrongLength     // gamma_g2 is not 128 bytes
Error::VkDeltaG2WrongLength     // delta_g2 is not 128 bytes
Error::VkIcVectorWrongLength    // IC vector doesn't have 9 points
Error::VkIcPointWrongLength     // An IC point is not 64 bytes

// Public input errors
Error::PublicInputWrongLength   // A field is not 32 bytes
```

## SDK Usage (TypeScript)

### Validate Proof

```typescript
import { validateProofStructure } from "./structural_guards";

try {
  validateProofStructure(proofBytes);
  // Proof structure is valid
} catch (error) {
  // Proof has wrong length
  console.error("Invalid proof structure:", error.message);
}
```

### Validate VK

```typescript
import { validateVkStructure } from "./structural_guards";

const vk = {
  alpha_g1: new Uint8Array(64),
  beta_g2: new Uint8Array(128),
  gamma_g2: new Uint8Array(128),
  delta_g2: new Uint8Array(128),
  gamma_abc_g1: [
    /* 9 points of 64 bytes each */
  ],
};

try {
  validateVkStructure(vk);
  // VK structure is valid
} catch (error) {
  // VK has structural issues
  console.error("Invalid VK structure:", error.message);
}
```

### Validate Public Inputs

```typescript
import {
  validatePublicInputsStructure,
  validatePublicInputsHexStructure,
} from "./structural_guards";

// Validate byte arrays
const inputs = [
  /* 8 Uint8Array of 32 bytes each */
];
validatePublicInputsStructure(inputs);

// Validate hex strings
const hexInputs = [
  /* 8 strings of 64 hex chars each */
];
validatePublicInputsHexStructure(hexInputs);
```

### Extract Proof Components

```typescript
import { extractProofComponents } from "./structural_guards";

const proof = new Uint8Array(256);
const { a, b, c } = extractProofComponents(proof);

console.log("A:", a.length); // 64
console.log("B:", b.length); // 128
console.log("C:", c.length); // 64
```

## Common Errors and Fixes

### Proof Too Short/Long

```
Error: Proof must be 256 bytes (64 + 128 + 64), got 255
Fix: Ensure proof contains all three components (A, B, C)
```

### VK IC Vector Wrong Length

```
Error: VK gamma_abc_g1 must have 9 points (IC[0] + 8 inputs), got 8
Fix: IC vector needs IC[0] plus one point per public input
```

### Public Input Wrong Length

```
Error: Public input[3] must be 32 bytes, got 16
Fix: All public inputs must be 32-byte field elements
```

### VK Point Wrong Length

```
Error: VK alpha_g1 must be 64 bytes, got 32
Fix: G1 points are 64 bytes, G2 points are 128 bytes
```

## Testing

### Contract Tests

```bash
# Run structural guard tests
cargo test structural_guards

# Run specific test
cargo test test_proof_a_wrong_length_rejected
```

### SDK Tests

```bash
# Run structural guard tests
npm test structural_guards

# Run specific test
npm test -- -t "should reject proof that is too short"
```

## Constants

### Contract (Rust)

```rust
const G1_POINT_BYTE_LENGTH: u32 = 64;
const G2_POINT_BYTE_LENGTH: u32 = 128;
const FIELD_ELEMENT_BYTE_LENGTH: u32 = 32;
const EXPECTED_PUBLIC_INPUT_COUNT: u32 = 8;
const EXPECTED_IC_VECTOR_LENGTH: u32 = 9;
```

### SDK (TypeScript)

```typescript
export const G1_POINT_BYTE_LENGTH = 64;
export const G2_POINT_BYTE_LENGTH = 128;
export const FIELD_ELEMENT_BYTE_LENGTH = 32;
export const EXPECTED_PUBLIC_INPUT_COUNT = 8;
export const EXPECTED_IC_VECTOR_LENGTH = 9;
export const GROTH16_PROOF_TOTAL_LENGTH = 256;
```

## Validation Order

Structural guards run in this order:

1. **Proof Structure**
   - Check A length (64 bytes)
   - Check B length (128 bytes)
   - Check C length (64 bytes)

2. **VK Structure**
   - Check alpha_g1 length (64 bytes)
   - Check beta_g2 length (128 bytes)
   - Check gamma_g2 length (128 bytes)
   - Check delta_g2 length (128 bytes)
   - Check IC vector length (9 points)
   - Check each IC point length (64 bytes)

3. **Public Inputs Structure**
   - Check input count (8 fields)
   - Check each field length (32 bytes)

4. **Cryptographic Operations**
   - Deserialize curve points
   - Compute linear combination
   - Perform pairing check

## Best Practices

1. **Always validate before deserialization**
   - Structural guards should run first
   - Prevents expensive operations on bad data

2. **Use specific error codes**
   - Don't catch all errors generically
   - Handle structural errors differently from crypto errors

3. **Validate early in the pipeline**
   - SDK should validate before sending to contract
   - Contract validates again for defense in depth

4. **Test malformed payloads**
   - Include structural guard tests in your test suite
   - Test all error paths

5. **Log structural errors**
   - Structural errors indicate bugs or attacks
   - Log them for debugging and security monitoring

## See Also

- [ZK-075_IMPLEMENTATION_SUMMARY.md](./ZK-075_IMPLEMENTATION_SUMMARY.md) - Full implementation details
- [contracts/privacy_pool/src/test/structural_guards.rs](./contracts/privacy_pool/src/test/structural_guards.rs) - Contract tests
- [sdk/src/structural_guards.test.ts](./sdk/src/structural_guards.test.ts) - SDK tests
