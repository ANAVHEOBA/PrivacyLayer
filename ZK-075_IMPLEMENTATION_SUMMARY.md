# ZK-075: Structural Guards for Proof, VK, and Public Input Shapes

## Summary

This implementation adds structural validation guards that reject malformed byte lengths, wrong IC counts, and impossible payload shapes BEFORE deserializing elliptic-curve points or touching pairing logic. These guards ensure malformed data fails early in both contract and SDK environments.

## Changes Made

### Contract Changes (Rust)

#### `contracts/privacy_pool/src/types/errors.rs`

Added granular error codes for structural validation:

- `VkAlphaG1WrongLength` (52) - VK alpha_g1 has wrong byte length (expected 64)
- `VkBetaG2WrongLength` (53) - VK beta_g2 has wrong byte length (expected 128)
- `VkGammaG2WrongLength` (54) - VK gamma_g2 has wrong byte length (expected 128)
- `VkDeltaG2WrongLength` (55) - VK delta_g2 has wrong byte length (expected 128)
- `VkIcVectorWrongLength` (56) - VK gamma_abc_g1 vector has wrong length (expected 9)
- `VkIcPointWrongLength` (57) - VK gamma_abc_g1 contains a point with wrong byte length
- `PublicInputWrongLength` (63) - Public input field has wrong byte length (expected 32)

#### `contracts/privacy_pool/src/crypto/verifier.rs`

Added three structural validation functions that run BEFORE deserialization:

1. **`validate_proof_structure()`**
   - Validates G1 point A is 64 bytes
   - Validates G2 point B is 128 bytes
   - Validates G1 point C is 64 bytes
   - Returns specific error for each malformed component

2. **`validate_vk_structure()`**
   - Validates alpha_g1 is 64 bytes
   - Validates beta_g2, gamma_g2, delta_g2 are 128 bytes each
   - Validates gamma_abc_g1 has exactly 9 elements (IC[0] + 8 public inputs)
   - Validates each IC point is 64 bytes
   - Returns specific error for each malformed component

3. **`validate_public_inputs_structure()`**
   - Validates all 8 public input fields are exactly 32 bytes
   - Returns error if any field has wrong length

Updated `verify_proof()` to call all three validation functions before any cryptographic operations.

#### `contracts/privacy_pool/src/test/structural_guards.rs` (NEW)

Comprehensive test suite with 20+ tests covering:

- Proof structure validation (wrong A, B, C lengths)
- VK structure validation (wrong alpha, beta, gamma, delta lengths)
- IC vector validation (too short, too long, empty, wrong point lengths)
- Public inputs validation (wrong field lengths)
- Multiple structural errors (first error reported)
- Valid structures passing guards

### SDK Changes (TypeScript)

#### `sdk/src/structural_guards.ts` (NEW)

Created comprehensive structural validation module mirroring contract-side guards:

**Constants:**

- `G1_POINT_BYTE_LENGTH = 64`
- `G2_POINT_BYTE_LENGTH = 128`
- `FIELD_ELEMENT_BYTE_LENGTH = 32`
- `EXPECTED_PUBLIC_INPUT_COUNT = 8`
- `EXPECTED_IC_VECTOR_LENGTH = 9`
- `GROTH16_PROOF_TOTAL_LENGTH = 256`

**Functions:**

1. **`validateProofStructure(proof: Uint8Array)`**
   - Validates proof is exactly 256 bytes (64 + 128 + 64)
   - Throws `WitnessValidationError` on malformed proof

2. **`validateVkStructure(vk: VerifyingKeyStructure)`**
   - Validates all VK curve points have correct byte lengths
   - Validates IC vector has exactly 9 points
   - Validates each IC point is 64 bytes
   - Throws `WitnessValidationError` with specific error messages

3. **`validatePublicInputsStructure(publicInputs: Uint8Array[])`**
   - Validates exactly 8 public inputs
   - Validates each input is 32 bytes
   - Throws `WitnessValidationError` on malformed inputs

4. **`validatePublicInputsHexStructure(publicInputs: string[])`**
   - Validates hex string format (64 hex chars = 32 bytes)
   - Validates hex characters are valid
   - Throws `WitnessValidationError` on malformed inputs

5. **`extractProofComponents(proof: Uint8Array)`**
   - Extracts A, B, C components from raw proof bytes
   - Validates structure before extraction

#### `sdk/src/structural_guards.test.ts` (NEW)

Comprehensive test suite with 30+ tests covering:

- Proof structure validation (correct length, too short, too long, empty)
- VK structure validation (all point lengths, IC vector lengths)
- Public inputs validation (bytes and hex formats)
- Component extraction
- Multiple structural errors
- Constants validation

#### `sdk/src/witness.ts`

Updated `assertValidGroth16ProofBytes()` to use `validateProofStructure()` from structural guards module, providing consistent validation across SDK.

## Validation Flow

### Before ZK-075

```
verify_proof() → deserialize points → pairing check
                 ↑ Malformed data discovered here
```

### After ZK-075

```
verify_proof() → structural guards → deserialize points → pairing check
                 ↑ Malformed data discovered here (FAST)
```

## Benefits

✅ **Early Failure**: Malformed payloads fail before expensive cryptographic operations
✅ **Explicit Errors**: Specific error codes identify exactly which component is malformed
✅ **Consistent Validation**: Same invariants enforced in both contract and SDK
✅ **Performance**: Structural checks are O(1) vs. O(n) for curve operations
✅ **Security**: Prevents malformed data from reaching cryptographic code
✅ **Debuggability**: Clear error messages help developers identify issues quickly

## Error Mapping

| Malformed Component       | Contract Error           | SDK Error             |
| ------------------------- | ------------------------ | --------------------- |
| Proof A wrong length      | `MalformedProofA`        | `PROOF_FORMAT`        |
| Proof B wrong length      | `MalformedProofB`        | `PROOF_FORMAT`        |
| Proof C wrong length      | `MalformedProofC`        | `PROOF_FORMAT`        |
| VK alpha_g1 wrong length  | `VkAlphaG1WrongLength`   | `VK_FORMAT`           |
| VK beta_g2 wrong length   | `VkBetaG2WrongLength`    | `VK_FORMAT`           |
| VK gamma_g2 wrong length  | `VkGammaG2WrongLength`   | `VK_FORMAT`           |
| VK delta_g2 wrong length  | `VkDeltaG2WrongLength`   | `VK_FORMAT`           |
| VK IC vector wrong length | `VkIcVectorWrongLength`  | `VK_FORMAT`           |
| VK IC point wrong length  | `VkIcPointWrongLength`   | `VK_FORMAT`           |
| Public input wrong length | `PublicInputWrongLength` | `PUBLIC_INPUT_FORMAT` |

## Testing

### Contract Tests

```bash
cd contracts/privacy_pool
cargo test structural_guards  # Run structural guard tests
cargo test                     # Run all tests
```

### SDK Tests

```bash
cd sdk
npm test structural_guards     # Run structural guard tests
npm test                       # Run all tests
```

## Expected Byte Lengths

| Component     | Type          | Bytes | Notes                               |
| ------------- | ------------- | ----- | ----------------------------------- |
| G1 Point      | Curve point   | 64    | Two 32-byte field elements (x, y)   |
| G2 Point      | Curve point   | 128   | Two pairs of 32-byte field elements |
| Field Element | Scalar        | 32    | BN254 field element                 |
| Proof A       | G1 Point      | 64    | First proof component               |
| Proof B       | G2 Point      | 128   | Second proof component              |
| Proof C       | G1 Point      | 64    | Third proof component               |
| Total Proof   | A + B + C     | 256   | Complete Groth16 proof              |
| VK alpha_g1   | G1 Point      | 64    | VK component                        |
| VK beta_g2    | G2 Point      | 128   | VK component                        |
| VK gamma_g2   | G2 Point      | 128   | VK component                        |
| VK delta_g2   | G2 Point      | 128   | VK component                        |
| VK IC point   | G1 Point      | 64    | Each IC vector element              |
| VK IC vector  | 9 × G1        | 576   | IC[0] + 8 public inputs             |
| Public Input  | Field Element | 32    | Each public input field             |

## Acceptance Criteria

✅ Malformed proof or VK structures fail with explicit pre-verification errors
✅ Contract and SDK tests cover short, long, and count-mismatch payloads
✅ Verifier code is no longer the first place malformed data is discovered
✅ Structural guards run before any elliptic curve deserialization
✅ Error messages clearly identify which component is malformed

## Integration Points

### Contract → SDK

- SDK validates payloads before sending to contract
- Same byte length expectations in both environments
- Consistent error semantics

### SDK → Client

- Clients receive clear error messages about malformed payloads
- Structural errors fail fast before expensive operations
- Debugging is easier with specific error codes

## Files Modified

### Contract Files (4)

- `contracts/privacy_pool/src/types/errors.rs` - Added 8 new error codes
- `contracts/privacy_pool/src/crypto/verifier.rs` - Added 3 validation functions
- `contracts/privacy_pool/src/test/structural_guards.rs` - NEW: 20+ tests
- `contracts/privacy_pool/src/test/mod.rs` - Added structural_guards module

### SDK Files (4)

- `sdk/src/structural_guards.ts` - NEW: Validation functions and constants
- `sdk/src/structural_guards.test.ts` - NEW: 30+ tests
- `sdk/src/witness.ts` - Updated to use structural guards
- `ZK-075_IMPLEMENTATION_SUMMARY.md` - NEW: This document

## Performance Impact

Structural guards add minimal overhead:

- **Contract**: ~3 length checks + 1 vector iteration = O(n) where n=9 (IC vector length)
- **SDK**: ~3 length checks + 1 array iteration = O(n) where n=9
- **Benefit**: Avoids expensive elliptic curve deserialization on malformed data

Estimated savings on malformed payload:

- Without guards: Full deserialization attempt + potential panic/error
- With guards: Simple length check (< 1% of deserialization cost)

## Migration Notes

No breaking changes - this is purely additive validation. Existing valid payloads continue to work unchanged.

## Future Enhancements

Potential future improvements:

1. Add range checks for field elements (< BN254 modulus)
2. Validate curve point encoding (compressed vs uncompressed)
3. Add structural guards for commitment and merkle circuits
4. Create malformed payload corpus for fuzzing

## Related Issues

- ZK-044: (Dependency)
- ZK-114: Verifier hardening tests (malformed corpora)
- ZK-087: Verifier schema parity

Wave Issue Key: ZK-075
