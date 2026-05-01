# VK Metadata Quick Reference (ZK-074)

## What Changed?

Verifying keys now include metadata to track circuit versions and enable auditable upgrades.

## New VK Fields

```rust
pub struct VerifyingKey {
    // ... existing elliptic curve points ...

    // NEW: Metadata fields (ZK-074)
    pub circuit_id: String,           // e.g., "withdraw"
    pub public_input_count: u32,      // e.g., 8
    pub manifest_hash: BytesN<32>,    // SHA-256 of manifest
}
```

## Creating a VK with Metadata

### Rust (Contract)

```rust
use soroban_sdk::{String, BytesN};

let vk = VerifyingKey {
    alpha_g1: /* ... */,
    beta_g2: /* ... */,
    gamma_g2: /* ... */,
    delta_g2: /* ... */,
    gamma_abc_g1: /* ... */,

    // Metadata
    circuit_id: String::from_str(&env, "withdraw"),
    public_input_count: 8,
    manifest_hash: BytesN::from_array(&env, &manifest_hash_bytes),
};
```

### TypeScript (SDK)

```typescript
import { extractVkMetadata } from "./sdk/vk_metadata";

// Load manifest
const manifest = await loadManifest();

// Extract metadata for circuit
const metadata = await extractVkMetadata(manifest, "withdraw");

// Use metadata when creating VK
const vk = {
  // ... elliptic curve points ...
  circuit_id: metadata.circuit_id,
  public_input_count: metadata.public_input_count,
  manifest_hash: metadata.manifest_hash,
};
```

## Validation Errors

### CircuitIdMismatch (Error 52)

**Cause**: VK circuit_id doesn't match expected circuit  
**Fix**: Deploy correct VK for this circuit

### PublicInputCountMismatch (Error 53)

**Cause**: Proof has different number of inputs than VK expects  
**Fix**: Regenerate proof with matching circuit version

### MalformedVerifyingKey (Error 51)

**Cause**: gamma_abc_g1 length doesn't match public_input_count + 1  
**Fix**: Regenerate VK from circuit artifacts

## Client-Side Validation

```typescript
import { validateProofMetadata } from "./sdk/vk_metadata";

// Before submitting proof
try {
  validateProofMetadata(proof.circuitId, proof.publicInputs.length, vkMetadata);
  // Safe to submit
} catch (error) {
  // Fix proof or VK mismatch
  console.error("Metadata validation failed:", error);
}
```

## Upgrading a VK

```rust
// 1. Generate new VK with updated metadata
let new_vk = generate_vk_with_metadata(new_manifest_hash);

// 2. Update VK for pool (admin only)
client.update_verifying_key(&pool_id, &new_vk);

// 3. Verify update
let stored_vk = client.get_verifying_key(&pool_id);
assert_eq!(stored_vk.manifest_hash, new_manifest_hash);
```

## Testing VK Metadata

```bash
# Run VK metadata tests
cd contracts/privacy_pool
cargo test test_e2e_vk

# Run SDK tests
cd sdk
npm test vk_metadata
```

## Common Patterns

### Check VK Version

```rust
let vk = client.get_verifying_key(&pool_id);
println!("Circuit: {}", vk.circuit_id);
println!("Inputs: {}", vk.public_input_count);
println!("Manifest: {:?}", vk.manifest_hash);
```

### Verify Upgrade

```rust
let old_hash = old_vk.manifest_hash;
let new_hash = new_vk.manifest_hash;
assert_ne!(old_hash, new_hash, "VK should be updated");
```

### Rollback Detection

```rust
let current_vk = client.get_verifying_key(&pool_id);
let backup_vk = load_backup_vk();

if current_vk.manifest_hash != backup_vk.manifest_hash {
    println!("VK has been updated since backup");
}
```

## See Also

- [VK_UPGRADE_GUIDE.md](./VK_UPGRADE_GUIDE.md) - Detailed upgrade procedures
- [ZK-074_IMPLEMENTATION_SUMMARY.md](../../ZK-074_IMPLEMENTATION_SUMMARY.md) - Full implementation details
