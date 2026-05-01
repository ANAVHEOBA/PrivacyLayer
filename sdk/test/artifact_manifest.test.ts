import fs from 'fs';
import path from 'path';
import {
  ArtifactManifestError,
  NoirBackend,
  NoirArtifacts,
  ZkArtifactManifest,
} from '../src/backends/noir';

const artifactsDir = path.resolve(__dirname, '../../artifacts/zk');
const manifest = JSON.parse(
  fs.readFileSync(path.join(artifactsDir, 'manifest.json'), 'utf8')
) as ZkArtifactManifest;
const withdrawArtifact = JSON.parse(
  fs.readFileSync(path.join(artifactsDir, 'withdraw.json'), 'utf8')
);

function buildArtifacts(overrides: Partial<NoirArtifacts> = {}): NoirArtifacts {
  return {
    acir: Buffer.from(withdrawArtifact.bytecode, 'utf8'),
    bytecode: withdrawArtifact.bytecode,
    abi: withdrawArtifact.abi,
    name: withdrawArtifact.name,
    ...overrides,
  };
}

describe('Artifact manifest validation', () => {
  it('accepts a manifest-matched withdraw artifact bundle', () => {
    expect(() => new NoirBackend({
      artifacts: buildArtifacts(),
      manifest,
      circuitName: 'withdraw',
      artifactPath: 'withdraw.json',
      backend: {},
    })).not.toThrow();
  });

  it('rejects a missing circuit entry before proving starts', () => {
    const badManifest: ZkArtifactManifest = {
      ...manifest,
      circuits: { commitment: manifest.circuits.commitment },
    };

    expect(() => new NoirBackend({
      artifacts: buildArtifacts(),
      manifest: badManifest,
      circuitName: 'withdraw',
      artifactPath: 'withdraw.json',
      backend: {},
    })).toThrow(ArtifactManifestError);
  });

  it('rejects a bytecode hash mismatch', () => {
    expect(() => new NoirBackend({
      artifacts: buildArtifacts({ bytecode: withdrawArtifact.bytecode + '\n' }),
      manifest,
      circuitName: 'withdraw',
      artifactPath: 'withdraw.json',
      backend: {},
    })).toThrow(/Bytecode hash mismatch/);
  });

  it('rejects an artifact path mismatch', () => {
    expect(() => new NoirBackend({
      artifacts: buildArtifacts(),
      manifest,
      circuitName: 'withdraw',
      artifactPath: 'unexpected.json',
      backend: {},
    })).toThrow(/Artifact path mismatch/);
  });
});
