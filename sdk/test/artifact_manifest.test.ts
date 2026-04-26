import { createHash } from 'crypto';
import {
  ArtifactManifest,
  ArtifactManifestError,
  validateArtifactManifest,
} from '../src/artifact_manifest';

const encoder = new TextEncoder();
const sha256 = (data: Uint8Array | string) =>
  createHash('sha256')
    .update(typeof data === 'string' ? encoder.encode(data) : data)
    .digest('hex');

const manifest: ArtifactManifest = {
  schemaVersion: '1.0',
  circuits: {
    withdraw: {
      circuitId: 'withdraw',
      artifact: 'withdraw.json',
      artifactHash: sha256('artifact-v1'),
      backend: 'barretenberg',
      backendVersion: '0.87.0',
      compiler: 'nargo',
      compilerVersion: '1.0.0-beta.3',
      metadata: { rootDepth: 20 },
    },
  },
};

describe('artifact manifest validation', () => {
  it('accepts matching artifact provenance and hash data', () => {
    const entry = validateArtifactManifest(manifest, {
      circuitId: 'withdraw',
      artifactFile: 'withdraw.json',
      artifactBytes: 'artifact-v1',
      sha256,
      backend: 'barretenberg',
      backendVersion: '0.87.0',
      compiler: 'nargo',
      compilerVersion: '1.0.0-beta.3',
    });

    expect(entry.circuitId).toBe('withdraw');
    expect(entry.metadata?.rootDepth).toBe(20);
  });

  it('refuses missing circuits before proof generation uses an artifact', () => {
    expect(() =>
      validateArtifactManifest(manifest, {
        circuitId: 'deposit',
      })
    ).toThrow(ArtifactManifestError);
  });

  it('refuses artifact hash mismatches', () => {
    expect(() =>
      validateArtifactManifest(manifest, {
        circuitId: 'withdraw',
        artifactBytes: 'tampered',
        sha256,
      })
    ).toThrow(/Artifact hash mismatch/);
  });

  it('refuses backend and compiler version mismatches', () => {
    expect(() =>
      validateArtifactManifest(manifest, {
        circuitId: 'withdraw',
        backendVersion: '0.88.0',
      })
    ).toThrow(/Backend version mismatch/);

    expect(() =>
      validateArtifactManifest(manifest, {
        circuitId: 'withdraw',
        compilerVersion: '0.0.0',
      })
    ).toThrow(/Compiler version mismatch/);
  });
});
