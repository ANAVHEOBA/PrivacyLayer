### Summary

Wave Issue Key: ZK-127

This PR repairs the ZK artifact rebuild pipeline to strictly enforce the versioned layout contract and remove legacy unversioned artifacts. It ensures that compiled circuits, manifests, and commitment vectors all land in the `artifacts/zk/v{version}/` directory structure.

### Key Changes
- **`scripts/rebuild-zk.sh`**:
    - Updated to copy compiled circuit JSONs into versioned subdirectories (`artifacts/zk/v{version}/circuits/{pkg}/{pkg}.json`).
    - Implemented cleanup of stale unversioned JSONs (`artifacts/zk/*.json`) to prevent path drift.
    - Added a validation step to verify the existence of artifacts in the versioned tree after rebuild.
- **`scripts/generate_commitment_vectors.mjs`**:
    - Updated to accept a version parameter and write output to the versioned path (`artifacts/zk/v{version}/commitment_vectors.json`).
- **`scripts/refresh_manifest.mjs`**:
    - Aligned circuit path lookups with the new nested directory structure and removed unused helper code.
- **SDK & Documentation**:
    - Updated `sdk/test/commitment_corpus.test.ts` to point to the versioned `v1` path.
    - Updated `README.md`, `circuits/TEST_VECTORS.md`, and code comments to reflect the new layout.

### Verification Plan
- [x] Script logic reviewed for path consistency.
- [x] SDK tests updated to pass with versioned paths.
- [ ] Full rebuild verification (requires `nargo >= 0.36.0` in environment).

Closes #362
