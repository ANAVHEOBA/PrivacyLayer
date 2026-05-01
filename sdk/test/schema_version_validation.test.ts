/**
 * Tests for schema version validation methods in NoirBackend
 * Tasks 4.2, 4.3, 4.4: Schema version validation and compatibility checking
 */

import fs from 'fs';
import path from 'path';
import {
  NoirBackend,
  NoirArtifacts,
  ZkArtifactManifest,
  ZkArtifactManifestCircuit,
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

describe('NoirBackend schema version validation', () => {
  describe('validateAndStoreSchemaVersion', () => {
    it('should store schema_version when present in manifest', () => {
      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBeDefined();
      expect(schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should treat missing schema_version as "0.0.0" for backward compatibility', () => {
      const manifestWithoutSchema: ZkArtifactManifest = {
        ...manifest,
        circuits: {
          withdraw: {
            ...manifest.circuits.withdraw,
            schema_version: undefined,
          },
        },
      };

      // Spy on console.warn to verify warning is logged
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest: manifestWithoutSchema,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe('0.0.0');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('has public_input_schema but no schema_version')
      );

      warnSpy.mockRestore();
    });

    it('should not set schema_version for circuits without public_input_schema', () => {
      const manifestWithoutPublicSchema: ZkArtifactManifest = {
        ...manifest,
        circuits: {
          withdraw: {
            ...manifest.circuits.withdraw,
            public_input_schema: undefined,
            schema_version: undefined,
          },
        },
      };

      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest: manifestWithoutPublicSchema,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBeUndefined();
    });

    it('should not set schema_version for circuits with empty public_input_schema', () => {
      const manifestWithEmptySchema: ZkArtifactManifest = {
        ...manifest,
        circuits: {
          withdraw: {
            ...manifest.circuits.withdraw,
            public_input_schema: [],
            schema_version: undefined,
          },
        },
      };

      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest: manifestWithEmptySchema,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBeUndefined();
    });
  });

  describe('getSchemaVersion', () => {
    it('should return the stored schema version', () => {
      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe(manifest.circuits.withdraw.schema_version);
    });

    it('should return undefined when no manifest is provided', () => {
      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBeUndefined();
    });

    it('should return "0.0.0" for circuits with missing schema_version', () => {
      const manifestWithoutSchema: ZkArtifactManifest = {
        ...manifest,
        circuits: {
          withdraw: {
            ...manifest.circuits.withdraw,
            schema_version: undefined,
          },
        },
      };

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest: manifestWithoutSchema,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe('0.0.0');

      warnSpy.mockRestore();
    });
  });

  describe('isSchemaVersionCompatible', () => {
    it('should return true for identical versions', () => {
      expect(NoirBackend.isSchemaVersionCompatible('1.2.3', '1.2.3')).toBe(true);
    });

    it('should return true for same major.minor with different patch', () => {
      expect(NoirBackend.isSchemaVersionCompatible('1.2.3', '1.2.4')).toBe(true);
      expect(NoirBackend.isSchemaVersionCompatible('1.2.10', '1.2.1')).toBe(true);
    });

    it('should return false for different major versions', () => {
      expect(NoirBackend.isSchemaVersionCompatible('1.2.3', '2.2.3')).toBe(false);
      expect(NoirBackend.isSchemaVersionCompatible('2.0.0', '1.0.0')).toBe(false);
    });

    it('should return false for different minor versions', () => {
      expect(NoirBackend.isSchemaVersionCompatible('1.2.3', '1.3.3')).toBe(false);
      expect(NoirBackend.isSchemaVersionCompatible('1.5.0', '1.4.0')).toBe(false);
    });

    it('should handle version "0.0.0" correctly', () => {
      expect(NoirBackend.isSchemaVersionCompatible('0.0.0', '0.0.0')).toBe(true);
      expect(NoirBackend.isSchemaVersionCompatible('0.0.0', '0.0.1')).toBe(true);
      expect(NoirBackend.isSchemaVersionCompatible('0.0.0', '1.0.0')).toBe(false);
    });

    it('should handle large version numbers', () => {
      expect(NoirBackend.isSchemaVersionCompatible('1.12345.67890', '1.12345.99999')).toBe(true);
      expect(NoirBackend.isSchemaVersionCompatible('1.12345.67890', '1.12346.67890')).toBe(false);
    });

    it('should throw error for invalid version format', () => {
      expect(() => NoirBackend.isSchemaVersionCompatible('1.2', '1.2.3')).toThrow(
        'Invalid semantic version format'
      );
      expect(() => NoirBackend.isSchemaVersionCompatible('1.2.3', 'invalid')).toThrow(
        'Invalid semantic version format'
      );
      expect(() => NoirBackend.isSchemaVersionCompatible('v1.2.3', '1.2.3')).toThrow(
        'Invalid semantic version format'
      );
    });
  });

  describe('integration with real manifest', () => {
    it('should correctly load and validate withdraw circuit schema version', () => {
      const backend = new NoirBackend({
        artifacts: buildArtifacts(),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe('1.20680.19972');
    });

    it('should correctly load and validate commitment circuit schema version', () => {
      const commitmentArtifact = JSON.parse(
        fs.readFileSync(path.join(artifactsDir, 'commitment.json'), 'utf8')
      );

      const commitmentArtifacts: NoirArtifacts = {
        acir: Buffer.from(commitmentArtifact.bytecode, 'utf8'),
        bytecode: commitmentArtifact.bytecode,
        abi: commitmentArtifact.abi,
        name: commitmentArtifact.name,
      };

      const backend = new NoirBackend({
        artifacts: commitmentArtifacts,
        manifest,
        circuitName: 'commitment',
        artifactPath: 'commitment.json',
        backend: {},
      });

      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe('1.63027.29691');
    });

    it('should detect incompatibility between withdraw and commitment schemas', () => {
      const withdrawVersion = manifest.circuits.withdraw.schema_version!;
      const commitmentVersion = manifest.circuits.commitment.schema_version!;

      expect(NoirBackend.isSchemaVersionCompatible(withdrawVersion, commitmentVersion)).toBe(false);
    });
  });
});
