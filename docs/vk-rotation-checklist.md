# Verifying-Key Rotation Checklist (ZK-117)

This document defines the operational steps for rotating a pool's verifying key (VK) in PrivacyLayer. VK rotation is a high-risk operation: a wrong key silently breaks all future withdrawals. Follow every step in order and do not skip the rollback checks.

---

## Pre-conditions

Before starting rotation, confirm all of the following:

- [ ] New circuit artifacts are built with a **pinned toolchain** (see `scripts/check-toolchain.sh --strict`).
- [ ] Artifact manifest (`artifacts/zk/v{VERSION}/manifests/manifest.json`) is regenerated and its SHA-256 matches the artifact files.
- [ ] The new VK bytes pass offline verification against a known-good proof (`scripts/rebuild-zk.sh` full run).
- [ ] The new VK is for the **same circuit version** as the currently deployed pool, or the pool's `public_input_schema` version is also being bumped.
- [ ] A rollback snapshot of the current on-chain VK is saved: run `stellar contract invoke ... -- get_verifying_key` and store the output.
- [ ] A staging / testnet dry-run has been executed and at least one full deposit→withdrawal cycle completed successfully with the new VK.

---

## Rotation Steps

### 1. Lock the pool

```bash
stellar contract invoke --id <CONTRACT_ID> -- set_paused --paused true
```

Confirm the pool is paused before proceeding. No withdrawals can be submitted while paused.

### 2. Verify manifest hash

```bash
node scripts/refresh_manifest.mjs <VERSION>
```

Compare the printed `sha256` for `withdraw.acir` and `withdraw.vk` against the values in the release bundle. They must match exactly.

### 3. Upload the new VK

```bash
stellar contract invoke --id <CONTRACT_ID> -- set_verifying_key \
  --pool_id <POOL_ID> \
  --vk "$(cat artifacts/zk/v<VERSION>/proving_keys/withdraw/vk | xxd -p | tr -d '\n')"
```

### 4. Verify the upload

```bash
stellar contract invoke --id <CONTRACT_ID> -- get_verifying_key \
  --pool_id <POOL_ID>
```

Confirm the returned bytes match the new VK file byte-for-byte.

### 5. Submit a test withdrawal (testnet only)

Generate a proof against the new VK using the SDK and submit a withdrawal. Confirm `success: true` in the response.

### 6. Unpause the pool

```bash
stellar contract invoke --id <CONTRACT_ID> -- set_paused --paused false
```

### 7. Record the rotation

Record the rotation through the preflight evidence bundle for the pool and local release bundle:

```bash
node scripts/zk_release_preflight.mjs \
  --bundle-path artifacts/zk/v<VERSION>/bundles/release-bundle.json \
  --target-metadata-json '{"circuit_id":"withdraw","manifest_sha256":"0x...","public_input_arity":6,"schema_version":1}' \
  --rotation-record-path rotation.json \
  --rotation-bundle-path artifacts/zk/v<VERSION>/bundles/rotation-evidence/<POOL_ID>/rotation-bundle.json \
  --rotation-log-path artifacts/zk/v<VERSION>/bundles/rotation-evidence/<POOL_ID>/rotation-log.md
```

The rotation record should include the operator identity, old and new VK SHA-256 hashes, manifest hash, circuit id, schema version, and rollback context. The log is append-only and must stay tied to one pool.

If you need a manual summary for an incident note, mirror the same fields in `docs/vk-rotation-log.md`:

```
| Date       | Pool ID | Old VK SHA-256 | New VK SHA-256 | Circuit Version | Operator |
|------------|---------|----------------|----------------|-----------------|----------|
| YYYY-MM-DD | ...     | 0x...          | 0x...          | v{N}            | @handle  |
```

---

## Rollback Conditions

Initiate rollback immediately if any of the following occurs after unpause:

- A valid legacy proof (generated before rotation) fails verification.
- The contract returns `InvalidProof` for a proof that was verified successfully offline.
- On-chain VK bytes do not match what was uploaded.
- The manifest SHA-256 does not match the artifact on disk.

### Rollback procedure

1. Pause the pool immediately.
2. Re-upload the **previous** VK bytes (from the pre-rotation snapshot).
3. Verify the upload.
4. Submit a test withdrawal with an older proof to confirm recovery.
5. Unpause.
6. File an incident report explaining what went wrong.

---

## Multi-Pool Deployments

When rotating VKs across multiple pools:

- Rotate **one pool at a time**. Never rotate two pools simultaneously.
- Each pool must complete its own full checklist including staging validation.
- If pools share a VK (same circuit, same version), still update each pool individually and verify each independently.
- Record each pool's rotation separately in `docs/vk-rotation-log.md`.

---

## Related

- `scripts/check-toolchain.sh` — verify the toolchain before building artifacts.
- `scripts/rebuild-zk.sh` — full deterministic rebuild.
- `scripts/refresh_manifest.mjs` — recompute manifest SHA-256 hashes.
- `sdk/src/artifacts.ts` — artifact path configuration.
- `contracts/privacy_pool/src/storage/config.rs` — VK storage functions.
