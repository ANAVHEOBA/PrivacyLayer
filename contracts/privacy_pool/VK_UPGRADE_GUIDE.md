# Verifying Key Upgrade and Rollback Guide (ZK-074)

## Overview

Pool-scoped verifying keys now include metadata that identifies which circuit artifact set, public-input arity, and manifest hash they correspond to. This enables auditable upgrades and rollbacks of circuit implementations across pools.

## VK Metadata Structure

Each stored verifying key includes:

- **circuit_id**: String identifier for the circuit (e.g., "withdraw")
- **public_input_count**: Number of public inputs expected (e.g., 8 for withdraw circuit)
- **manifest_hash**: SHA-256 hash of the manifest this VK was derived from

## Validation Flow

Before expensive pairing operations, the contract validates:

1. **Circuit ID Match**: VK circuit_id must match expected circuit ("withdraw")
2. **Public Input Count**: VK public_input_count must match the number of inputs provided
3. **gamma_abc_g1 Length**: Must equal public_input_count + 1 (for IC_0)

This allows mismatched proof payloads to fail fast before pairing work begins.

## Upgrade Path

### 1. Circuit Update Preparation

When updating circuit logic:

```bash
# 1. Compile new circuit version
cd circuits/withdraw
nargo compile

# 2. Generate new manifest with updated checksums
node scripts/generate_manifest.mjs

# 3. Compute manifest hash
MANIFEST_HASH=$(sha256sum artifacts/zk/manifest.json | cut -d' ' -f1)
```

### 2. Generate New VK

```typescript
// SDK: Generate VK with metadata
import { loadManifest, computeManifestHash } from "./sdk/artifacts";

const manifest = await loadManifest();
const manifestHash = await computeManifestHash(manifest);

const vk = {
  // ... elliptic curve points ...
  circuit_id: "withdraw",
  public_input_count: 8,
  manifest_hash: manifestHash,
};
```

### 3. Deploy VK Update

```rust
// Contract: Admin updates VK for a pool
client.update_verifying_key(&pool_id, &new_vk);
```

### 4. Verification

After deployment, verify the VK metadata:

```rust
let stored_vk = client.get_verifying_key(&pool_id);
assert_eq!(stored_vk.circuit_id, "withdraw");
assert_eq!(stored_vk.public_input_count, 8);
assert_eq!(stored_vk.manifest_hash, expected_manifest_hash);
```

## Rollback Path

To rollback to a previous circuit version:

1. Retrieve the previous manifest and VK from version control
2. Verify the manifest hash matches the stored VK's manifest_hash
3. Deploy the previous VK using `update_verifying_key`

```rust
// Rollback to v1
let vk_v1 = load_vk_from_backup("v1");
client.update_verifying_key(&pool_id, &vk_v1);
```

## Multi-Pool Considerations

Each pool maintains its own VK independently:

- **Gradual Rollout**: Update VKs pool-by-pool to test new circuits
- **Isolated Risk**: Issues in one pool don't affect others
- **Audit Trail**: Each pool's VK metadata provides upgrade history

### Example: Staged Upgrade

```rust
// Stage 1: Update test pool
client.update_verifying_key(&test_pool_id, &new_vk);

// Stage 2: Verify test pool works correctly
// ... run integration tests ...

// Stage 3: Update production pools
client.update_verifying_key(&prod_pool_1_id, &new_vk);
client.update_verifying_key(&prod_pool_2_id, &new_vk);
```

## Error Handling

### Circuit ID Mismatch

```
Error: CircuitIdMismatch
Cause: VK circuit_id does not match expected circuit
Action: Verify correct VK is deployed for this pool
```

### Public Input Count Mismatch

```
Error: PublicInputCountMismatch
Cause: Proof provides different number of inputs than VK expects
Action: Ensure proof was generated with matching circuit version
```

### Malformed VK

```
Error: MalformedVerifyingKey
Cause: gamma_abc_g1 length doesn't match public_input_count + 1
Action: Regenerate VK from circuit artifacts
```

## Best Practices

1. **Version Control**: Store VKs and manifests in version control with tags
2. **Manifest Hashing**: Always compute and verify manifest hashes before deployment
3. **Testing**: Test VK updates on non-production pools first
4. **Monitoring**: Monitor for CircuitIdMismatch and PublicInputCountMismatch errors
5. **Documentation**: Document each VK update with manifest hash and deployment date

## Integration Tests

The following integration tests cover VK metadata validation:

- `test_e2e_vk_circuit_id_mismatch_rejected`: Verifies circuit ID validation
- `test_e2e_vk_public_input_count_mismatch_rejected`: Verifies input count validation
- `test_e2e_vk_gamma_abc_length_mismatch_rejected`: Verifies structural validation
- `test_e2e_vk_metadata_allows_upgrade_auditability`: Demonstrates upgrade tracking

Run tests:

```bash
cd contracts/privacy_pool
cargo test test_e2e_vk
```

## SDK Integration

The SDK should validate VK metadata before submitting proofs:

```typescript
// Validate proof matches VK metadata
function validateProofMetadata(proof: Proof, vk: VerifyingKey): void {
  if (proof.circuitId !== vk.circuit_id) {
    throw new Error("Circuit ID mismatch");
  }

  if (proof.publicInputs.length !== vk.public_input_count) {
    throw new Error("Public input count mismatch");
  }
}
```

This allows client-side validation before expensive on-chain operations.
