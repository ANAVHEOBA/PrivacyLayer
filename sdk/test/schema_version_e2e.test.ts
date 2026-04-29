/**
 * End-to-end integration tests for schema versioning
 * Task 9.1: Create end-to-end schema validation test
 * Task 9.2: Create migration test for backward compatibility
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  NoirBackend,
  NoirArtifacts,
  ZkArtifactManifest,
} from '../src/backends/noir';

const artifactsDir = path.resolve(__dirname, '../../artifacts/zk');
const manifestPath = path.join(artifactsDir, 'manifest.json');
const manifestBackupPath = path.join(artifactsDir, 'manifest_backup.json');
const refreshManifestScript = path.resolve(__dirname, '../../scripts/refresh_manifest.mjs');

function loadManifest(): ZkArtifactManifest {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function loadArtifacts(circuitName: string): NoirArtifacts {
  const artifactPath = path.join(artifactsDir, `${circuitName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  return {
    acir: Buffer.from(artifact.bytecode, 'utf8'),
    bytecode: artifact.bytecode,
    abi: artifact.abi,
    name: artifact.name,
  };
}

describe('Schema Versioning End-to-End Tests', () => {
  describe('Task 9.1: End-to-end schema validation', () => {
    it('should generate manifest with schema versions', () => {
      // Requirement 1.1: Manifest includes schema_version field
      const manifest = loadManifest();
      
      expect(manifest.circuits.withdraw).toBeDefined();
      expect(manifest.circuits.withdraw.schema_version).toBeDefined();
      expect(manifest.circuits.withdraw.schema_version).toMatch(/^\d+\.\d+\.\d+$/);
      
      expect(manifest.circuits.commitment).toBeDefined();
      expect(manifest.circuits.commitment.schema_version).toBeDefined();
      expect(manifest.circuits.commitment.schema_version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should load circuit in SDK and verify schema version is stored', () => {
      // Requirements 2.1, 2.2: SDK validates and stores schema_version
      const manifest = loadManifest();
      const artifacts = loadArtifacts('withdraw');
      
      const backend = new NoirBackend({
        artifacts,
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });
      
      // Requirement 2.3: SDK returns validated schema_version
      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe(manifest.circuits.withdraw.schema_version);
      expect(schemaVersion).toBe('1.20680.19972');
    });

    it('should verify SDK compatibility checking works correctly', () => {
      // Requirements 3.1, 3.2, 3.3, 3.4, 3.5: Compatibility checking
      const manifest = loadManifest();
      const withdrawVersion = manifest.circuits.withdraw.schema_version!;
      const commitmentVersion = manifest.circuits.commitment.schema_version!;
      
      // Same version should be compatible
      expect(NoirBackend.isSchemaVersionCompatible(withdrawVersion, withdrawVersion)).toBe(true);
      
      // Different major.minor should be incompatible
      expect(NoirBackend.isSchemaVersionCompatible(withdrawVersion, commitmentVersion)).toBe(false);
      
      // Same major.minor with different patch should be compatible
      const patchVariant = withdrawVersion.replace(/\.\d+$/, '.99999');
      expect(NoirBackend.isSchemaVersionCompatible(withdrawVersion, patchVariant)).toBe(true);
    });

    it('should load both circuits and verify their schema versions are different', () => {
      const manifest = loadManifest();
      
      const withdrawBackend = new NoirBackend({
        artifacts: loadArtifacts('withdraw'),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });
      
      const commitmentBackend = new NoirBackend({
        artifacts: loadArtifacts('commitment'),
        manifest,
        circuitName: 'commitment',
        artifactPath: 'commitment.json',
        backend: {},
      });
      
      const withdrawVersion = withdrawBackend.getSchemaVersion();
      const commitmentVersion = commitmentBackend.getSchemaVersion();
      
      expect(withdrawVersion).toBeDefined();
      expect(commitmentVersion).toBeDefined();
      expect(withdrawVersion).not.toBe(commitmentVersion);
      
      // Verify they are incompatible (different schemas)
      expect(NoirBackend.isSchemaVersionCompatible(withdrawVersion!, commitmentVersion!)).toBe(false);
    });

    it('should verify schema version is deterministic across multiple loads', () => {
      const manifest = loadManifest();
      
      // Load the same circuit multiple times
      const backend1 = new NoirBackend({
        artifacts: loadArtifacts('withdraw'),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });
      
      const backend2 = new NoirBackend({
        artifacts: loadArtifacts('withdraw'),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });
      
      expect(backend1.getSchemaVersion()).toBe(backend2.getSchemaVersion());
    });
  });

  describe('Task 9.2: Migration test for backward compatibility', () => {
    let originalManifest: string;
    
    beforeAll(() => {
      // Backup original manifest
      originalManifest = fs.readFileSync(manifestPath, 'utf8');
    });
    
    afterAll(() => {
      // Restore original manifest
      fs.writeFileSync(manifestPath, originalManifest);
    });

    it('should handle manifest without schema_version fields gracefully', () => {
      // Requirement 5.1, 5.2, 5.3: Backward compatibility
      const manifest = loadManifest();
      
      // Create manifest without schema_version
      const manifestWithoutSchema: ZkArtifactManifest = {
        ...manifest,
        circuits: {
          withdraw: {
            ...manifest.circuits.withdraw,
            schema_version: undefined,
          },
          commitment: {
            ...manifest.circuits.commitment,
            schema_version: undefined,
          },
        },
      };
      
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // SDK should load without throwing error
      const backend = new NoirBackend({
        artifacts: loadArtifacts('withdraw'),
        manifest: manifestWithoutSchema,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });
      
      // Requirement 5.3: Treat missing schema_version as "0.0.0"
      expect(backend.getSchemaVersion()).toBe('0.0.0');
      
      // Requirement 5.1: Log warning for missing schema_version
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('has public_input_schema but no schema_version')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Treating as version "0.0.0"')
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please regenerate manifest')
      );
      
      warnSpy.mockRestore();
    });

    it('should regenerate manifest and add schema_version fields', () => {
      // Requirements 8.1, 8.2, 8.3: Manifest generator adds schema_version
      
      // Create a manifest without schema_version
      const manifest = loadManifest();
      const manifestWithoutSchema = {
        ...manifest,
        circuits: {
          withdraw: {
            ...manifest.circuits.withdraw,
            schema_version: undefined,
          },
          commitment: {
            ...manifest.circuits.commitment,
            schema_version: undefined,
          },
        },
      };
      
      // Write manifest without schema_version
      fs.writeFileSync(manifestPath, JSON.stringify(manifestWithoutSchema, null, 2) + '\n');
      
      // Run refresh_manifest.mjs to add schema versions
      const result = spawnSync('node', [refreshManifestScript, '2'], {
        encoding: 'utf8',
        cwd: path.dirname(refreshManifestScript),
      });
      
      // Requirement 8.4: Output summary of schema versions added
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Schema versions computed:');
      expect(result.stdout).toContain('withdraw:');
      expect(result.stdout).toContain('commitment:');
      expect(result.stdout).toContain('Migration summary:');
      expect(result.stdout).toContain('Added schema_version to 2 existing circuit(s)');
      
      // Load updated manifest
      const updatedManifest = loadManifest();
      
      // Verify schema_version fields were added
      expect(updatedManifest.circuits.withdraw.schema_version).toBeDefined();
      expect(updatedManifest.circuits.withdraw.schema_version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(updatedManifest.circuits.commitment.schema_version).toBeDefined();
      expect(updatedManifest.circuits.commitment.schema_version).toMatch(/^\d+\.\d+\.\d+$/);
      
      // Requirement 8.3: Preserve all existing manifest fields
      expect(updatedManifest.circuits.withdraw.circuit_id).toBe(manifest.circuits.withdraw.circuit_id);
      expect(updatedManifest.circuits.withdraw.path).toBe(manifest.circuits.withdraw.path);
      expect(updatedManifest.circuits.withdraw.public_input_schema).toEqual(
        manifest.circuits.withdraw.public_input_schema
      );
    });

    it('should verify SDK loads updated manifest successfully', () => {
      // Requirement 5.4: SDK handles migrated manifests
      const manifest = loadManifest();
      
      // Verify manifest has schema_version (after migration)
      expect(manifest.circuits.withdraw.schema_version).toBeDefined();
      
      // SDK should load successfully
      const backend = new NoirBackend({
        artifacts: loadArtifacts('withdraw'),
        manifest,
        circuitName: 'withdraw',
        artifactPath: 'withdraw.json',
        backend: {},
      });
      
      const schemaVersion = backend.getSchemaVersion();
      expect(schemaVersion).toBe(manifest.circuits.withdraw.schema_version);
      expect(schemaVersion).not.toBe('0.0.0');
    });

    it('should verify manifest generation is idempotent', () => {
      // Requirement 8.5: Idempotent manifest generation
      
      // Run refresh_manifest.mjs first time
      const result1 = spawnSync('node', [refreshManifestScript, '2'], {
        encoding: 'utf8',
        cwd: path.dirname(refreshManifestScript),
      });
      expect(result1.status).toBe(0);
      
      const manifest1 = loadManifest();
      const withdrawVersion1 = manifest1.circuits.withdraw.schema_version;
      const commitmentVersion1 = manifest1.circuits.commitment.schema_version;
      
      // Run refresh_manifest.mjs second time
      const result2 = spawnSync('node', [refreshManifestScript, '2'], {
        encoding: 'utf8',
        cwd: path.dirname(refreshManifestScript),
      });
      expect(result2.status).toBe(0);
      
      const manifest2 = loadManifest();
      const withdrawVersion2 = manifest2.circuits.withdraw.schema_version;
      const commitmentVersion2 = manifest2.circuits.commitment.schema_version;
      
      // Versions should be identical
      expect(withdrawVersion1).toBe(withdrawVersion2);
      expect(commitmentVersion1).toBe(commitmentVersion2);
      
      // Second run should not show migration summary (no circuits migrated)
      expect(result2.stdout).not.toContain('Migration summary:');
    });

    it('should handle circuits without public_input_schema', () => {
      const manifest = loadManifest();
      
      // Use the commitment circuit but remove its public_input_schema
      const manifestWithoutPublicSchema: ZkArtifactManifest = {
        ...manifest,
        circuits: {
          ...manifest.circuits,
          commitment: {
            ...manifest.circuits.commitment,
            public_input_schema: undefined,
            schema_version: undefined,
          },
        },
      };
      
      // SDK should load without error and not set schema_version
      const backend = new NoirBackend({
        artifacts: loadArtifacts('commitment'),
        manifest: manifestWithoutPublicSchema,
        circuitName: 'commitment',
        artifactPath: 'commitment.json',
        backend: {},
      });
      
      expect(backend.getSchemaVersion()).toBeUndefined();
    });
  });

  describe('Cross-circuit schema validation', () => {
    it('should verify different circuits have different schema versions', () => {
      const manifest = loadManifest();
      
      const withdrawVersion = manifest.circuits.withdraw.schema_version!;
      const commitmentVersion = manifest.circuits.commitment.schema_version!;
      
      // Different schemas should produce different versions
      expect(withdrawVersion).not.toBe(commitmentVersion);
      
      // They should be incompatible
      expect(NoirBackend.isSchemaVersionCompatible(withdrawVersion, commitmentVersion)).toBe(false);
    });

    it('should verify schema versions match their public_input_schema', () => {
      const manifest = loadManifest();
      
      // Withdraw has 7 fields
      expect(manifest.circuits.withdraw.public_input_schema).toHaveLength(7);
      expect(manifest.circuits.withdraw.schema_version).toBe('1.20680.19972');
      
      // Commitment has 2 fields
      expect(manifest.circuits.commitment.public_input_schema).toHaveLength(2);
      expect(manifest.circuits.commitment.schema_version).toBe('1.63027.29691');
    });
  });
});
