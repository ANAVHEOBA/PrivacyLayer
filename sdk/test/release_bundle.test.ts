import fs from 'fs';
import path from 'path';

import {
  compareReleaseBundleTargetMetadata,
  createReleaseBundle,
  loadManifestForBundle,
} from '../src/release_bundle';

const manifestPath = path.resolve(__dirname, '../../artifacts/zk/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

describe('Release bundle helpers', () => {
  it('builds a deterministic release bundle from the manifest', () => {
    const bundle = createReleaseBundle(manifest, '1');

    expect(bundle.version).toBe(1);
    expect(bundle.artifact_version).toBe('1');
    expect(bundle.manifest_sha256).toMatch(/^0x[0-9a-f]{64}$/);
    expect(bundle.verifier_schema.circuit_id).toBe('withdraw');
    expect(bundle.verifier_schema.public_input_arity).toBe(7);
    expect(bundle.verifier_schema.contract_public_input_arity).toBe(6);
    expect(bundle.contract_metadata.target_circuit_id).toBe('withdraw');
    expect(bundle.operational_artifacts.benchmark_baselines_path).toBe(
      'artifacts/zk/v1/bundles/benchmark-baselines.json',
    );
    expect(bundle.operational_artifacts.rotation_evidence_dir).toBe(
      'artifacts/zk/v1/bundles/rotation-evidence',
    );
  });

  it('detects mismatched release metadata', () => {
    const bundle = createReleaseBundle(manifest, '1');
    const mismatches = compareReleaseBundleTargetMetadata(bundle, {
      circuit_id: 'commitment',
      manifest_sha256: '0x' + '00'.repeat(32),
      public_input_arity: 7,
      schema_version: 1,
    });

    expect(mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'circuit_id' }),
        expect.objectContaining({ field: 'manifest_sha256' }),
      ]),
    );
  });

  it('loads the legacy manifest when the versioned file is absent', () => {
    const loaded = loadManifestForBundle('1');
    expect(loaded.circuits.withdraw.circuit_id).toBe('withdraw');
  });
});
