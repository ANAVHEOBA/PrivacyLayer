/**
 * Unit tests for artifact loading and validation
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

import { describe, it, expect } from '@jest/globals';
import * as path from 'path';
import * as fs from 'fs';
import {
  loadArtifactsFromManifest,
  validateArtifactIntegrity,
  validateArtifactsComplete,
  loadManifest,
  getCircuitEntry,
} from './artifacts';
import { ConfigurationError } from './types';
import type { ZkArtifactManifest } from '../../backends/noir';

const artifactsDir = path.resolve(__dirname, '../../../../artifacts/zk');
const manifestPath = path.join(artifactsDir, 'manifest.json');

describe('Artifact Loading and Validation', () => {
  describe('loadManifest', () => {
    it('should load manifest from file', async () => {
      const manifest = await loadManifest(manifestPath);
      
      expect(manifest).toBeDefined();
      expect(manifest.version).toBe(2);
      expect(manifest.circuits).toBeDefined();
      expect(manifest.circuits.withdraw).toBeDefined();
    });

    it('should throw ConfigurationError for non-existent manifest', async () => {
      await expect(
        loadManifest('/non/existent/manifest.json')
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('getCircuitEntry', () => {
    let manifest: ZkArtifactManifest;

    beforeAll(async () => {
      manifest = await loadManifest(manifestPath);
    });

    it('should get circuit entry from manifest', () => {
      const entry = getCircuitEntry(manifest, 'withdraw');
      
      expect(entry).toBeDefined();
      expect(entry.circuit_id).toBe('withdraw');
      expect(entry.name).toBe('withdraw');
      expect(entry.path).toBe('withdraw.json');
    });

    it('should throw ConfigurationError for non-existent circuit', () => {
      expect(() => {
        getCircuitEntry(manifest, 'non_existent_circuit');
      }).toThrow(ConfigurationError);
    });

    it('should include available circuits in error message', () => {
      try {
        getCircuitEntry(manifest, 'non_existent_circuit');
        fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.context?.availableCircuits).toContain('withdraw');
        expect(configError.context?.availableCircuits).toContain('commitment');
      }
    });
  });

  describe('loadArtifactsFromManifest', () => {
    it('should load withdraw circuit artifacts', async () => {
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName: 'withdraw',
        validateIntegrity: true,
      });

      expect(result.artifacts).toBeDefined();
      expect(result.manifest).toBeDefined();
      expect(result.manifestEntry).toBeDefined();

      // Check ACIR is loaded
      expect(result.artifacts.acir).toBeDefined();
      expect(result.artifacts.acir.length).toBeGreaterThan(0);

      // Check ABI is loaded
      expect(result.artifacts.abi).toBeDefined();
      expect(result.artifacts.abi.parameters).toBeDefined();

      // Check bytecode is loaded
      expect(result.artifacts.bytecode).toBeDefined();
      expect(result.artifacts.bytecode).toBeTruthy();

      // Check name is set
      expect(result.artifacts.name).toBe('withdraw');

      // Check vkey is placeholder (empty buffer)
      expect(result.artifacts.vkey).toBeDefined();
      expect(result.artifacts.vkey.length).toBe(0);
    });

    it('should load commitment circuit artifacts', async () => {
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName: 'commitment',
        validateIntegrity: true,
      });

      expect(result.artifacts).toBeDefined();
      expect(result.artifacts.name).toBe('commitment');
      expect(result.artifacts.acir.length).toBeGreaterThan(0);
    });

    it('should validate artifact integrity by default', async () => {
      // This should not throw because the artifacts match the manifest
      await expect(
        loadArtifactsFromManifest({
          manifestPath,
          circuitName: 'withdraw',
        })
      ).resolves.toBeDefined();
    });

    it('should throw ConfigurationError for non-existent circuit', async () => {
      await expect(
        loadArtifactsFromManifest({
          manifestPath,
          circuitName: 'non_existent_circuit',
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for non-existent manifest', async () => {
      await expect(
        loadArtifactsFromManifest({
          manifestPath: '/non/existent/manifest.json',
          circuitName: 'withdraw',
        })
      ).rejects.toThrow(ConfigurationError);
    });
  });

  describe('validateArtifactIntegrity', () => {
    let manifest: ZkArtifactManifest;

    beforeAll(async () => {
      manifest = await loadManifest(manifestPath);
    });

    it('should validate correct artifacts', async () => {
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName: 'withdraw',
        validateIntegrity: false, // Skip validation during load
      });

      // This should not throw
      expect(() => {
        validateArtifactIntegrity(manifest, 'withdraw', result.artifacts);
      }).not.toThrow();
    });

    it('should throw ConfigurationError for corrupted artifacts', async () => {
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName: 'withdraw',
        validateIntegrity: false,
      });

      // Corrupt the bytecode
      const corruptedArtifacts = {
        ...result.artifacts,
        bytecode: 'corrupted_bytecode',
      };

      expect(() => {
        validateArtifactIntegrity(manifest, 'withdraw', corruptedArtifacts);
      }).toThrow(ConfigurationError);
    });
  });

  describe('validateArtifactsComplete', () => {
    it('should validate complete artifacts', async () => {
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName: 'withdraw',
      });

      // This should not throw
      expect(() => {
        validateArtifactsComplete(result.artifacts, 'withdraw');
      }).not.toThrow();
    });

    it('should throw ConfigurationError for missing ACIR', () => {
      const artifacts = {
        acir: Buffer.alloc(0), // Empty ACIR
        vkey: Buffer.alloc(0),
        abi: { parameters: [] },
        bytecode: 'test',
        name: 'test',
      };

      expect(() => {
        validateArtifactsComplete(artifacts, 'test');
      }).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for missing ABI', () => {
      const artifacts = {
        acir: Buffer.from('test'),
        vkey: Buffer.alloc(0),
        abi: {}, // Empty ABI
        bytecode: 'test',
        name: 'test',
      };

      expect(() => {
        validateArtifactsComplete(artifacts, 'test');
      }).toThrow(ConfigurationError);
    });

    it('should include actionable error message', () => {
      const artifacts = {
        acir: Buffer.alloc(0),
        vkey: Buffer.alloc(0),
        abi: {},
        bytecode: 'test',
        name: 'test',
      };

      try {
        validateArtifactsComplete(artifacts, 'test');
        fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.context?.actionable).toBeDefined();
        expect(configError.context?.actionable).toContain('regenerating');
      }
    });

    it('should not require vkey for validation', () => {
      const artifacts = {
        acir: Buffer.from('test'),
        vkey: Buffer.alloc(0), // Empty vkey is OK
        abi: { parameters: [] },
        bytecode: 'test',
        name: 'test',
      };

      // This should not throw - vkey is optional
      expect(() => {
        validateArtifactsComplete(artifacts, 'test');
      }).not.toThrow();
    });
  });

  describe('Error Messages', () => {
    it('should provide actionable error messages for missing artifacts', async () => {
      try {
        await loadArtifactsFromManifest({
          manifestPath,
          circuitName: 'non_existent',
        });
        fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.message).toContain('not found');
        expect(configError.context?.availableCircuits).toBeDefined();
      }
    });

    it('should provide actionable error messages for integrity failures', async () => {
      const manifest = await loadManifest(manifestPath);
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName: 'withdraw',
        validateIntegrity: false,
      });

      const corruptedArtifacts = {
        ...result.artifacts,
        abi: { corrupted: true },
      };

      try {
        validateArtifactIntegrity(manifest, 'withdraw', corruptedArtifacts);
        fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        const configError = error as ConfigurationError;
        expect(configError.message).toContain('integrity validation failed');
      }
    });
  });
});
