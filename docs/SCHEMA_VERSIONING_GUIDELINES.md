# Schema Versioning Guidelines

## Overview

This document provides guidelines for managing schema versions in the ZK artifact system. Schema versioning enables the SDK and contracts to distinguish between schema-only changes (public input field order/names) and full circuit rebuilds (constraint changes).

## Table of Contents

1. [When to Bump Schema Versions vs Artifact Versions](#when-to-bump-schema-versions-vs-artifact-versions)
2. [Schema-Only Changes](#schema-only-changes)
3. [Full Artifact Changes](#full-artifact-changes)
4. [Semantic Versioning Rules](#semantic-versioning-rules)
5. [Migration Process](#migration-process)
6. [Best Practices](#best-practices)

## When to Bump Schema Versions vs Artifact Versions

### Schema Version (Automatic)

**Schema versions are computed automatically** from the `public_input_schema` array using a deterministic hashing algorithm. You don't manually bump schema versions.

**When schema version changes:**
- Any modification to the `public_input_schema` array
- Field reordering (e.g., moving `amount` before `recipient`)
- Field renaming (e.g., `nullifier_hash` → `nullifier`)
- Adding or removing public input fields
- Changing field types (though this also requires circuit changes)

**What triggers recomputation:**
- Running `node scripts/refresh_manifest.mjs` after modifying the schema constants in the script

### Artifact Version (Manual)

**Artifact versions are manually set** and track the overall artifact directory layout and versioning scheme.

**When to bump artifact version:**
- Major restructuring of artifact directory layout
- Changes to manifest format or structure
- Breaking changes to how artifacts are organized
- Migration to new versioning system

**Current artifact version:** 2 (set via `ZK_ARTIFACT_VERSION` or command line argument)

## Schema-Only Changes

Schema-only changes modify the public input structure without changing the underlying circuit constraints.

### Examples

#### 1. Field Reordering

**Before:**
```javascript
const PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
];
```

**After:**
```javascript
const PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'amount',      // Moved before recipient
  'recipient',   // Moved after amount
  'relayer',
  'fee',
];
```

**Impact:**
- Schema version changes automatically (different hash)
- Circuit bytecode remains the same
- Proofs generated with old schema are incompatible
- SDK detects incompatibility at load time

**Action Required:**
1. Update schema constant in `refresh_manifest.mjs`
2. Run `node scripts/refresh_manifest.mjs 2`
3. Update SDK code that formats public inputs
4. Update contract code that validates public inputs
5. Regenerate all proofs with new schema

#### 2. Field Renaming

**Before:**
```javascript
const PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',  // Old name
  'recipient',
];
```

**After:**
```javascript
const PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier',       // New name
  'recipient',
];
```

**Impact:**
- Schema version changes automatically
- Circuit bytecode remains the same
- Field semantics unchanged (just a name change)
- SDK and contract code must be updated to use new name

**Action Required:**
1. Update schema constant in `refresh_manifest.mjs`
2. Run `node scripts/refresh_manifest.mjs 2`
3. Update all references to the old field name in SDK
4. Update all references to the old field name in contracts
5. Update documentation and tests

#### 3. Adding a Public Input Field

**Before:**
```javascript
const PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'commitment',
];
```

**After:**
```javascript
const PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'commitment',
  'timestamp',  // New field
];
```

**Impact:**
- Schema version changes automatically
- **Circuit must be modified** to include new field (not schema-only!)
- This is actually a full artifact change (see next section)

**Note:** Adding fields is NOT a schema-only change because it requires circuit modifications.

## Full Artifact Changes

Full artifact changes modify the circuit constraints, requiring a complete rebuild and new proofs.

### Examples

#### 1. Constraint Logic Changes

**Before:**
```noir
// Verify nullifier is correctly computed
assert(nullifier_hash == poseidon_hash([secret, leaf_index]));
```

**After:**
```noir
// Add domain separation to nullifier computation
assert(nullifier_hash == poseidon_hash([NULLIFIER_DOMAIN, secret, leaf_index]));
```

**Impact:**
- Circuit bytecode changes (different constraints)
- Schema version may or may not change (depends on public inputs)
- All proofs must be regenerated
- Verification keys change

**Action Required:**
1. Modify circuit code in `circuits/` directory
2. Recompile circuits: `cd circuits && nargo compile`
3. Run `node scripts/refresh_manifest.mjs 2`
4. Update SDK if proof generation logic changes
5. Update contracts if verification logic changes
6. Regenerate all proofs

#### 2. Adding Private Inputs

**Before:**
```noir
fn main(
  secret: Field,
  leaf_index: Field,
  pub root: Field,
  pub nullifier_hash: Field,
) {
  // Circuit logic
}
```

**After:**
```noir
fn main(
  secret: Field,
  leaf_index: Field,
  salt: Field,  // New private input
  pub root: Field,
  pub nullifier_hash: Field,
) {
  // Circuit logic using salt
}
```

**Impact:**
- Circuit bytecode changes (new constraints)
- Schema version unchanged (public inputs same)
- Witness generation logic must be updated
- All proofs must be regenerated

**Action Required:**
1. Modify circuit code
2. Recompile circuits
3. Run `node scripts/refresh_manifest.mjs 2`
4. Update SDK witness generation logic
5. Regenerate all proofs

#### 3. Merkle Tree Depth Changes

**Before:**
```javascript
const PRODUCTION_MERKLE_ROOT_DEPTH = 20;
```

**After:**
```javascript
const PRODUCTION_MERKLE_ROOT_DEPTH = 24;  // Increased depth
```

**Impact:**
- Circuit bytecode changes (more constraints)
- Schema version unchanged (public inputs same)
- Proof size may increase
- Verification gas cost may increase

**Action Required:**
1. Update depth constant in circuit code
2. Recompile circuits
3. Update depth constant in `refresh_manifest.mjs`
4. Run `node scripts/refresh_manifest.mjs 2`
5. Update SDK and contracts if needed
6. Regenerate all proofs

## Semantic Versioning Rules

Schema versions follow semantic versioning format: `MAJOR.MINOR.PATCH`

### Version Components

#### MAJOR (Currently: 1)
- Fixed at 1 for initial release
- Increment for breaking changes to the versioning system itself
- Example: Changing hash algorithm from SHA-256 to SHA-3

#### MINOR (Range: 0-65535)
- Derived from first 4 hex digits of schema hash
- Changes when schema structure changes
- Automatically computed, not manually set

#### PATCH (Range: 0-65535)
- Derived from next 4 hex digits of schema hash
- Changes when schema structure changes
- Automatically computed, not manually set

### Compatibility Rules

Two schema versions are **compatible** if:
- Major version matches exactly
- Minor version matches exactly
- Patch version can differ

Two schema versions are **incompatible** if:
- Major version differs
- Minor version differs

### Examples

| Version 1 | Version 2 | Compatible? | Reason |
|-----------|-----------|-------------|--------|
| 1.20680.19972 | 1.20680.19972 | ✅ Yes | Identical versions |
| 1.20680.19972 | 1.20680.99999 | ✅ Yes | Same major.minor, different patch |
| 1.20680.19972 | 1.20681.19972 | ❌ No | Different minor version |
| 1.20680.19972 | 2.20680.19972 | ❌ No | Different major version |
| 1.63027.29691 | 1.20680.19972 | ❌ No | Different minor version |

**Note:** In practice, since schema versions are derived from hashes, any schema change results in a completely different version. The patch-level compatibility is theoretical and would only occur if two different schemas happened to produce hashes with the same first 4 hex digits (extremely unlikely).

## Migration Process

### For Existing Deployments

#### Step 1: Backup Current Manifest

```bash
cp artifacts/zk/manifest.json artifacts/zk/manifest_backup.json
```

#### Step 2: Regenerate Manifest with Schema Versions

```bash
node scripts/refresh_manifest.mjs 2
```

**Expected Output:**
```
Refreshing ZK manifest for version 2...
Manifest updated at artifacts/zk/manifest.json

Schema versions computed:
  withdraw: 1.20680.19972
  commitment: 1.63027.29691

Migration summary:
Added schema_version to 2 existing circuit(s):
  withdraw: 1.20680.19972 (migrated from no schema_version)
  commitment: 1.63027.29691 (migrated from no schema_version)
```

#### Step 3: Update SDK

The SDK automatically handles manifests with and without schema versions:

```typescript
// Old manifest (no schema_version) - logs warning, treats as "0.0.0"
const backend = new NoirBackend({
  artifacts,
  manifest: oldManifest,
  circuitName: 'withdraw',
});

// New manifest (with schema_version) - validates and stores version
const backend = new NoirBackend({
  artifacts,
  manifest: newManifest,
  circuitName: 'withdraw',
});

console.log(backend.getSchemaVersion()); // "1.20680.19972"
```

#### Step 4: Update Contracts (If Applicable)

If contracts validate schema versions, update the expected version constant:

```rust
// contracts/privacy_pool/src/crypto/verifier.rs
pub const EXPECTED_WITHDRAW_SCHEMA_VERSION: &str = "1.20680.19972";
```

#### Step 5: Verify and Deploy

1. Run all tests: `npm test` (in SDK directory)
2. Verify manifest checksums match artifacts
3. Deploy updated SDK and contracts
4. Monitor logs for schema version warnings

### Rollback Plan

If issues arise during migration:

1. **Restore old manifest:**
   ```bash
   cp artifacts/zk/manifest_backup.json artifacts/zk/manifest.json
   ```

2. **SDK continues to work** (backward compatible with old manifests)

3. **Contracts can be updated** to accept version "0.0.0" temporarily:
   ```rust
   pub const EXPECTED_WITHDRAW_SCHEMA_VERSION: &str = "0.0.0";
   ```

4. **No data loss or corruption** (versioning is metadata only)

## Best Practices

### 1. Always Regenerate Manifest After Schema Changes

```bash
# After modifying schema constants in refresh_manifest.mjs
node scripts/refresh_manifest.mjs 2
```

### 2. Verify Schema Versions in Tests

```typescript
it('should have expected schema version', () => {
  const manifest = loadManifest();
  expect(manifest.circuits.withdraw.schema_version).toBe('1.20680.19972');
});
```

### 3. Document Schema Changes in Commit Messages

```
feat: reorder public inputs for withdraw circuit

- Move amount field before recipient field
- Schema version changes from 1.20680.19972 to 1.12345.67890
- Updated SDK and contract code to match new order
- Regenerated all test proofs

Breaking change: Proofs generated with old schema are incompatible
```

### 4. Use Schema Version Compatibility Checks

```typescript
// Check if proof schema matches expected version
const proofVersion = proof.schemaVersion;
const expectedVersion = backend.getSchemaVersion();

if (!NoirBackend.isSchemaVersionCompatible(proofVersion, expectedVersion)) {
  throw new Error(
    `Schema version mismatch: expected ${expectedVersion}, got ${proofVersion}`
  );
}
```

### 5. Monitor Schema Version Warnings

Set up logging to alert when old manifests are loaded:

```typescript
// SDK logs this warning for old manifests
console.warn(
  `Circuit "withdraw" has public_input_schema but no schema_version. ` +
  `Treating as version "0.0.0". Please regenerate manifest.`
);
```

### 6. Keep Schema Constants in Sync

Ensure schema constants in `refresh_manifest.mjs` match circuit definitions:

```javascript
// refresh_manifest.mjs
const WITHDRAW_PUBLIC_INPUT_SCHEMA = [
  'pool_id',
  'root',
  'nullifier_hash',
  'recipient',
  'amount',
  'relayer',
  'fee',
];
```

```noir
// circuits/withdraw/src/main.nr
fn main(
  // ... private inputs ...
  pub pool_id: Field,
  pub root: Field,
  pub nullifier_hash: Field,
  pub recipient: Field,
  pub amount: Field,
  pub relayer: Field,
  pub fee: Field,
) {
  // Circuit logic
}
```

### 7. Test Schema Compatibility

Write tests to verify schema compatibility logic:

```typescript
describe('Schema compatibility', () => {
  it('should accept proofs with compatible schema versions', () => {
    const backend = new NoirBackend({ /* ... */ });
    const backendVersion = backend.getSchemaVersion()!;
    
    // Same version should be compatible
    expect(NoirBackend.isSchemaVersionCompatible(
      backendVersion,
      backendVersion
    )).toBe(true);
    
    // Different version should be incompatible
    expect(NoirBackend.isSchemaVersionCompatible(
      backendVersion,
      '1.99999.99999'
    )).toBe(false);
  });
});
```

### 8. Version Control Manifest Changes

Always commit manifest changes with schema updates:

```bash
git add artifacts/zk/manifest.json
git commit -m "chore: update manifest with new schema versions"
```

### 9. Document Breaking Changes

When schema changes break compatibility, document it clearly:

```markdown
## Breaking Changes

### Schema Version Update (v2.1.0)

The withdraw circuit public input schema has been updated:
- Old schema version: 1.20680.19972
- New schema version: 1.12345.67890

**Impact:**
- All existing proofs are incompatible and must be regenerated
- SDK and contracts updated to use new schema
- Migration guide: [link to migration docs]

**Action Required:**
- Update to SDK v2.1.0 or later
- Regenerate all proofs using new SDK
- Deploy updated contracts
```

### 10. Automate Schema Validation

Add pre-commit hooks to validate schema consistency:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if manifest is up to date
node scripts/refresh_manifest.mjs 2 --dry-run

if [ $? -ne 0 ]; then
  echo "Error: Manifest is out of date. Run 'node scripts/refresh_manifest.mjs 2'"
  exit 1
fi
```

## Troubleshooting

### Issue: Schema version mismatch error

**Symptom:**
```
ArtifactManifestError: Schema version mismatch: expected 1.20680.19972, got 1.12345.67890
```

**Solution:**
1. Verify you're using the correct manifest version
2. Regenerate manifest: `node scripts/refresh_manifest.mjs 2`
3. Ensure SDK and artifacts are in sync
4. Regenerate proofs if schema changed

### Issue: Missing schema_version warning

**Symptom:**
```
Warning: Circuit "withdraw" has public_input_schema but no schema_version.
Treating as version "0.0.0". Please regenerate manifest.
```

**Solution:**
1. Run `node scripts/refresh_manifest.mjs 2`
2. Commit updated manifest
3. Redeploy SDK with new manifest

### Issue: Schema version doesn't change after schema modification

**Symptom:**
Schema version remains the same after modifying public input schema.

**Solution:**
1. Verify you updated the schema constant in `refresh_manifest.mjs`
2. Ensure you ran `node scripts/refresh_manifest.mjs 2`
3. Check that the manifest file was actually updated
4. Verify the schema array is correctly formatted (no typos)

### Issue: Incompatible schema versions between circuits

**Symptom:**
```
Error: Cannot use withdraw proof with commitment circuit
```

**Solution:**
This is expected behavior. Each circuit has its own schema version:
- Withdraw: 1.20680.19972 (7 public inputs)
- Commitment: 1.63027.29691 (2 public inputs)

Proofs are circuit-specific and cannot be used interchangeably.

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Design Document](../.kiro/specs/schema-versioning/design.md)
- [Requirements Document](../.kiro/specs/schema-versioning/requirements.md)
- [Implementation Tasks](../.kiro/specs/schema-versioning/tasks.md)

## Changelog

### Version 1.0.0 (Initial Release)
- Introduced schema versioning system
- Automatic schema version computation from public input schemas
- SDK validation and compatibility checking
- Migration support for existing manifests
- Comprehensive documentation and guidelines
