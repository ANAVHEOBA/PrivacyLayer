# ZK-074: Circuit Version and Manifest Identity Implementation Summary

## Overview

This implementation extends pool-scoped verifying keys with metadata that identifies which circuit artifact set, public-input arity, and manifest hash they correspond to. This enables auditable upgrades and rollbacks of circuit implementations across pools.

## Changes Made

### 1. Contract Changes (Rust)

#### `contracts/privacy_pool/src/types/state.rs`

- Extended `VerifyingKey` struct with three new fields:
  - `circuit_id: String` - Identifies which circuit this VK corresponds to (e.g., "withdraw")
  - `public_input_count: u32` - Number of public inputs expected (for arity validation)
  - `manifest_hash: BytesN<32>` - SHA-256 hash of the manifest this VK was built from

#### `contracts/privacy_pool/src/types/errors.rs`

- Added new error variants:
  - `CircuitIdMismatch` (52) - Circuit ID mismatch between VK and expected circuit
  - `PublicInputCountMismatch` (53) - Public input count mismatch between proof and VK

#### `contracts/privacy_pool/src/crypto/verifier.rs`

- Added `validate_vk_metadata()` function that validates VK metadata before expensive pairing operations:
  - Checks circuit ID matches expected circuit ("withdraw")
  - Validates public input count matches gamma_abc_g1 length
  - Ensures gamma_abc_g1 has (public_input_count + 1) elements
- Updated `verify_proof()` to call `validate_vk_metadata()` before pairing check
- Updated `compute_vk_x()` to validate public input count

#### Test Files Updated

- `contracts/privacy_pool/src/integration_test.rs`:
  - Updated `dummy_vk()` helper to include metadata fields
  - Added 4 new integration tests:
    - `test_e2e_vk_circuit_id_mismatch_rejected`
    - `test_e2e_vk_public_input_count_mismatch_rejected`
    - `test_e2e_vk_gamma_abc_length_mismatch_rejected`
    - `test_e2e_vk_metadata_allows_upgrade_auditability`

- `contracts/privacy_pool/src/test/core.rs`:
  - Updated `dummy_vk()` helper with metadata fields

- `contracts/privacy_pool/src/test/verifier_hardening.rs`:
  - Updated `create_dummy_vk()` helper with metadata fields

- `contracts/privacy_pool/src/test/malformed_corpora.rs`:
  - Updated all `VerifyingKey` constructions with metadata fields

### 2. SDK Changes (TypeScript)

#### `sdk/src/types.ts`

- Extended `ZkArtifactManifestCircuit` interface with:
  - `public_input_count?: number` - Number of public inputs for VK validation

#### `sdk/src/artifacts.ts`

- Added `computeManifestHash()` method to `BrowserArtifactLoader` class
  - Computes SHA-256 hash of manifest for VK metadata tracking

#### `sdk/src/vk_metadata.ts` (NEW)

- Created comprehensive VK metadata utilities:
  - `VkMetadata` interface matching on-chain structure
  - `computeManifestHash()` - Computes manifest hash for VK metadata
  - `createVkMetadata()` - Creates VK metadata from manifest circuit entry
  - `validateProofMetadata()` - Client-side validation before on-chain submission
  - `extractVkMetadata()` - Extracts VK metadata from manifest for a circuit
  - `vkMetadataEquals()` - Compares VK metadata for equality

#### `sdk/src/vk_metadata.test.ts` (NEW)

- Comprehensive test suite for VK metadata utilities
- Tests cover:
  - Manifest hash computation and consistency
  - VK metadata creation and derivation
  - Proof metadata validation
  - VK upgrade and rollback scenarios

### 3. Artifact Changes

#### `artifacts/zk/manifest.json`

- Updated withdraw circuit entry:
  - Added `"public_input_count": 8`
  - Added missing "denomination" to `public_input_schema`

### 4. Documentation

#### `contracts/privacy_pool/VK_UPGRADE_GUIDE.md` (NEW)

- Comprehensive guide covering:
  - VK metadata structure and validation flow
  - Circuit update preparation steps
  - VK generation with metadata
  - Deployment and verification procedures
  - Rollback procedures
  - Multi-pool upgrade strategies
  - Error handling and best practices
  - Integration test references

#### `ZK-074_IMPLEMENTATION_SUMMARY.md` (THIS FILE)

- Implementation summary and change documentation

## Validation Flow

The new validation flow ensures mismatched proofs fail fast:

1. **Pre-Pairing Validation** (new):
   - Circuit ID must match "withdraw"
   - Public input count must match VK expectation
   - gamma_abc_g1 length must equal public_input_count + 1

2. **Existing Validation**:
   - Pool ID matches
   - Denomination matches
   - Root is known
   - Nullifier not spent

3. **Pairing Check** (expensive):
   - Only executed if all validations pass

## Benefits

1. **Fast Failure**: Mismatched proofs fail before expensive pairing operations
2. **Auditability**: Each VK tracks its circuit version via manifest hash
3. **Upgrade Safety**: Circuit ID and input count validation prevent version mismatches
4. **Rollback Support**: Manifest hash enables tracking and reverting to previous versions
5. **Multi-Pool Management**: Each pool can be upgraded independently with full audit trail

## Testing

### Contract Tests

```bash
cd contracts/privacy_pool
cargo test test_e2e_vk  # Run VK metadata tests
cargo test              # Run all tests
```

### SDK Tests

```bash
cd sdk
npm test vk_metadata    # Run VK metadata utility tests
npm test                # Run all tests
```

## Integration Points

### Contract → SDK

- SDK must provide VK metadata when deploying/updating VKs
- SDK should validate proof metadata before submission

### SDK → Client

- Clients can query VK metadata to verify circuit versions
- Clients can validate proofs locally before submission

## Migration Path

### Existing Deployments

Existing VKs without metadata will need to be updated:

1. Retrieve current VK from contract
2. Add metadata fields:
   - `circuit_id: "withdraw"`
   - `public_input_count: 8`
   - `manifest_hash: <current_manifest_hash>`
3. Redeploy VK with metadata

### New Deployments

All new VK deployments must include metadata fields.

## Acceptance Criteria Status

✅ Each stored VK is identifiable by pool, circuit build, and verifier shape
✅ Mismatched proof payloads can fail before expensive pairing work begins
✅ Integration tests cover VK mismatch and stale-VK scenarios
✅ Documentation covers expected upgrade path for circuit and VK changes

## Related Issues

- ZK-006: (Dependency)
- ZK-041: (Dependency)
- ZK-085: Artifact integrity validation
- ZK-087: Verifier schema parity

## Files Modified

### Contract Files (8)

- `contracts/privacy_pool/src/types/state.rs`
- `contracts/privacy_pool/src/types/errors.rs`
- `contracts/privacy_pool/src/crypto/verifier.rs`
- `contracts/privacy_pool/src/integration_test.rs`
- `contracts/privacy_pool/src/test/core.rs`
- `contracts/privacy_pool/src/test/verifier_hardening.rs`
- `contracts/privacy_pool/src/test/malformed_corpora.rs`
- `contracts/privacy_pool/src/storage/config.rs` (no changes needed, uses existing types)

### SDK Files (4)

- `sdk/src/types.ts`
- `sdk/src/artifacts.ts`
- `sdk/src/vk_metadata.ts` (NEW)
- `sdk/src/vk_metadata.test.ts` (NEW)

### Artifact Files (1)

- `artifacts/zk/manifest.json`

### Documentation Files (2)

- `contracts/privacy_pool/VK_UPGRADE_GUIDE.md` (NEW)
- `ZK-074_IMPLEMENTATION_SUMMARY.md` (NEW)

## Next Steps

1. Run full test suite to verify all changes
2. Update any deployment scripts to include VK metadata
3. Update client applications to use new VK metadata utilities
4. Document VK metadata in API documentation
5. Create migration guide for existing deployments
