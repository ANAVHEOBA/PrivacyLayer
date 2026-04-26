/// <reference types="jest" />
import {
  getVersionedArtifactsDir,
  getCircuitsDir,
  getCircuitDir,
  getCircuitPath,
  getManifestsDir,
  getManifestPath,
  getFixturesDir,
  getCircuitFixturesDir,
  getProvingKeysDir,
  getCircuitProvingKeysDir,
  getVerificationKeyPath,
  getProvingKeyPath,
  CIRCUIT_NAMES,
  getKnownCircuitPath,
  ZK_ARTIFACT_VERSION,
  ARTIFACT_LAYOUT,
} from '../src/artifacts';

describe('Artifact Path Configuration (ZK-041)', () => {
  describe('Versioned directory structure', () => {
    it('returns correct base directory for default version', () => {
      const dir = getVersionedArtifactsDir();
      expect(dir).toBe('artifacts/zk/v1');
    });

    it('returns correct base directory for custom version', () => {
      const dir = getVersionedArtifactsDir('2');
      expect(dir).toBe('artifacts/zk/v2');
    });

    it('uses ZK_ARTIFACT_VERSION as default', () => {
      const dir = getVersionedArtifactsDir();
      expect(dir).toContain(`v${ZK_ARTIFACT_VERSION}`);
    });
  });

  describe('Circuit paths', () => {
    it('returns correct circuits directory', () => {
      const dir = getCircuitsDir();
      expect(dir).toBe('artifacts/zk/v1/circuits');
    });

    it('returns correct circuit directory for a specific circuit', () => {
      const dir = getCircuitDir('withdraw');
      expect(dir).toBe('artifacts/zk/v1/circuits/withdraw');
    });

    it('returns correct circuit JSON path', () => {
      const path = getCircuitPath('withdraw');
      expect(path).toBe('artifacts/zk/v1/circuits/withdraw/withdraw.json');
    });

    it('supports custom version for circuit paths', () => {
      const path = getCircuitPath('withdraw', '2');
      expect(path).toBe('artifacts/zk/v2/circuits/withdraw/withdraw.json');
    });
  });

  describe('Manifest paths', () => {
    it('returns correct manifests directory', () => {
      const dir = getManifestsDir();
      expect(dir).toBe('artifacts/zk/v1/manifests');
    });

    it('returns correct manifest file path', () => {
      const path = getManifestPath();
      expect(path).toBe('artifacts/zk/v1/manifests/manifest.json');
    });

    it('supports custom version for manifest paths', () => {
      const path = getManifestPath('2');
      expect(path).toBe('artifacts/zk/v2/manifests/manifest.json');
    });
  });

  describe('Fixture paths', () => {
    it('returns correct fixtures directory', () => {
      const dir = getFixturesDir();
      expect(dir).toBe('artifacts/zk/v1/fixtures');
    });

    it('returns correct circuit fixtures directory', () => {
      const dir = getCircuitFixturesDir('withdraw');
      expect(dir).toBe('artifacts/zk/v1/fixtures/withdraw');
    });

    it('supports custom version for fixture paths', () => {
      const dir = getCircuitFixturesDir('withdraw', '2');
      expect(dir).toBe('artifacts/zk/v2/fixtures/withdraw');
    });
  });

  describe('Proving key paths', () => {
    it('returns correct proving keys directory', () => {
      const dir = getProvingKeysDir();
      expect(dir).toBe('artifacts/zk/v1/proving_keys');
    });

    it('returns correct circuit proving keys directory', () => {
      const dir = getCircuitProvingKeysDir('withdraw');
      expect(dir).toBe('artifacts/zk/v1/proving_keys/withdraw');
    });

    it('returns correct verification key path', () => {
      const path = getVerificationKeyPath('withdraw');
      expect(path).toBe('artifacts/zk/v1/proving_keys/withdraw/vk');
    });

    it('returns correct proving key path', () => {
      const path = getProvingKeyPath('withdraw');
      expect(path).toBe('artifacts/zk/v1/proving_keys/withdraw/pk');
    });

    it('supports custom version for proving key paths', () => {
      const vkPath = getVerificationKeyPath('withdraw', '2');
      const pkPath = getProvingKeyPath('withdraw', '2');
      expect(vkPath).toBe('artifacts/zk/v2/proving_keys/withdraw/vk');
      expect(pkPath).toBe('artifacts/zk/v2/proving_keys/withdraw/pk');
    });
  });

  describe('Known circuit names', () => {
    it('defines all known circuit names', () => {
      expect(CIRCUIT_NAMES.COMMITMENT).toBe('commitment');
      expect(CIRCUIT_NAMES.WITHDRAW).toBe('withdraw');
      expect(CIRCUIT_NAMES.MERKLE).toBe('merkle');
    });

    it('returns correct path for known circuits', () => {
      const withdrawPath = getKnownCircuitPath(CIRCUIT_NAMES.WITHDRAW);
      expect(withdrawPath).toBe('artifacts/zk/v1/circuits/withdraw/withdraw.json');

      const commitmentPath = getKnownCircuitPath(CIRCUIT_NAMES.COMMITMENT);
      expect(commitmentPath).toBe('artifacts/zk/v1/circuits/commitment/commitment.json');

      const merklePath = getKnownCircuitPath(CIRCUIT_NAMES.MERKLE);
      expect(merklePath).toBe('artifacts/zk/v1/circuits/merkle/merkle.json');
    });

    it('supports custom version for known circuits', () => {
      const withdrawPath = getKnownCircuitPath(CIRCUIT_NAMES.WITHDRAW, '2');
      expect(withdrawPath).toBe('artifacts/zk/v2/circuits/withdraw/withdraw.json');
    });
  });

  describe('ARTIFACT_LAYOUT export', () => {
    it('exports all path functions', () => {
      expect(ARTIFACT_LAYOUT.getCircuitsDir).toBe(getCircuitsDir);
      expect(ARTIFACT_LAYOUT.getCircuitDir).toBe(getCircuitDir);
      expect(ARTIFACT_LAYOUT.getCircuitPath).toBe(getCircuitPath);
      expect(ARTIFACT_LAYOUT.getManifestsDir).toBe(getManifestsDir);
      expect(ARTIFACT_LAYOUT.getManifestPath).toBe(getManifestPath);
      expect(ARTIFACT_LAYOUT.getFixturesDir).toBe(getFixturesDir);
      expect(ARTIFACT_LAYOUT.getCircuitFixturesDir).toBe(getCircuitFixturesDir);
      expect(ARTIFACT_LAYOUT.getProvingKeysDir).toBe(getProvingKeysDir);
      expect(ARTIFACT_LAYOUT.getCircuitProvingKeysDir).toBe(getCircuitProvingKeysDir);
      expect(ARTIFACT_LAYOUT.getVerificationKeyPath).toBe(getVerificationKeyPath);
      expect(ARTIFACT_LAYOUT.getProvingKeyPath).toBe(getProvingKeyPath);
      expect(ARTIFACT_LAYOUT.getKnownCircuitPath).toBe(getKnownCircuitPath);
    });

    it('exports version and base directory', () => {
      expect(ARTIFACT_LAYOUT.version).toBe(ZK_ARTIFACT_VERSION);
      expect(ARTIFACT_LAYOUT.baseDir).toBe('artifacts/zk');
    });

    it('exports circuit names', () => {
      expect(ARTIFACT_LAYOUT.CIRCUIT_NAMES).toEqual(CIRCUIT_NAMES);
    });
  });

  describe('Path consistency', () => {
    it('all paths follow consistent structure', () => {
      const version = '1';
      const circuit = 'withdraw';

      const circuitPath = getCircuitPath(circuit, version);
      const manifestPath = getManifestPath(version);
      const fixturesPath = getCircuitFixturesDir(circuit, version);
      const provingKeysPath = getCircuitProvingKeysDir(circuit, version);

      expect(circuitPath).toMatch(/^artifacts\/zk\/v\d+\/circuits\/\w+\/\w+\.json$/);
      expect(manifestPath).toMatch(/^artifacts\/zk\/v\d+\/manifests\/manifest\.json$/);
      expect(fixturesPath).toMatch(/^artifacts\/zk\/v\d+\/fixtures\/\w+$/);
      expect(provingKeysPath).toMatch(/^artifacts\/zk\/v\d+\/proving_keys\/\w+$/);
    });

    it('different circuits produce different paths', () => {
      const withdrawPath = getCircuitPath('withdraw');
      const commitmentPath = getCircuitPath('commitment');
      const merklePath = getCircuitPath('merkle');

      expect(withdrawPath).not.toBe(commitmentPath);
      expect(withdrawPath).not.toBe(merklePath);
      expect(commitmentPath).not.toBe(merklePath);
    });

    it('different versions produce different paths', () => {
      const v1Path = getCircuitPath('withdraw', '1');
      const v2Path = getCircuitPath('withdraw', '2');

      expect(v1Path).not.toBe(v2Path);
      expect(v1Path).toContain('v1');
      expect(v2Path).toContain('v2');
    });
  });
});
