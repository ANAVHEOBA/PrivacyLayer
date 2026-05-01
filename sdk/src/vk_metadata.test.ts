/**
 * VK Metadata Utilities Tests (ZK-074)
 */

import { describe, it, expect } from 'vitest';
import {
  computeManifestHash,
  createVkMetadata,
  validateProofMetadata,
  extractVkMetadata,
  vkMetadataEquals,
  VkMetadata,
} from './vk_metadata';
import { ZkArtifactManifest, ZkArtifactManifestCircuit } from './types';

describe('VK Metadata Utilities', () => {
  const mockManifest: ZkArtifactManifest = {
    version: 2,
    backend: 'nargo/noir',
    circuits: {
      withdraw: {
        circuit_id: 'withdraw',
        path: 'withdraw.json',
        artifact_sha256: '0xabc123',
        bytecode_sha256: '0xdef456',
        abi_sha256: '0x789ghi',
        name: 'withdraw',
        backend: 'nargo/noir',
        public_input_count: 8,
        public_input_schema: [
          'pool_id',
          'root',
          'nullifier_hash',
          'recipient',
          'amount',
          'relayer',
          'fee',
          'denomination',
        ],
      },
    },
  };

  describe('computeManifestHash', () => {
    it('should compute consistent hash for same manifest', async () => {
      const hash1 = await computeManifestHash(mockManifest);
      const hash2 = await computeManifestHash(mockManifest);
      expect(hash1).toBe(hash2);
    });

    it('should return hex string with 0x prefix', async () => {
      const hash = await computeManifestHash(mockManifest);
      expect(hash).toMatch(/^0x[0-9a-f]+$/);
    });

    it('should produce different hashes for different manifests', async () => {
      const manifest2 = {
        ...mockManifest,
        version: 3,
      };
      const hash1 = await computeManifestHash(mockManifest);
      const hash2 = await computeManifestHash(manifest2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('createVkMetadata', () => {
    it('should create metadata from circuit entry', async () => {
      const manifestHash = await computeManifestHash(mockManifest);
      const circuitEntry = mockManifest.circuits.withdraw;
      
      const metadata = createVkMetadata(circuitEntry, manifestHash);
      
      expect(metadata.circuit_id).toBe('withdraw');
      expect(metadata.public_input_count).toBe(8);
      expect(metadata.manifest_hash).toBe(manifestHash);
    });

    it('should derive public_input_count from schema if not provided', async () => {
      const manifestHash = await computeManifestHash(mockManifest);
      const circuitEntry: ZkArtifactManifestCircuit = {
        circuit_id: 'test',
        path: 'test.json',
        artifact_sha256: '0x123',
        bytecode_sha256: '0x456',
        abi_sha256: '0x789',
        name: 'test',
        backend: 'nargo/noir',
        public_input_schema: ['input1', 'input2', 'input3'],
      };
      
      const metadata = createVkMetadata(circuitEntry, manifestHash);
      
      expect(metadata.public_input_count).toBe(3);
    });
  });

  describe('validateProofMetadata', () => {
    const vkMetadata: VkMetadata = {
      circuit_id: 'withdraw',
      public_input_count: 8,
      manifest_hash: '0xabc123',
    };

    it('should pass validation for matching metadata', () => {
      expect(() => {
        validateProofMetadata('withdraw', 8, vkMetadata);
      }).not.toThrow();
    });

    it('should throw on circuit ID mismatch', () => {
      expect(() => {
        validateProofMetadata('commitment', 8, vkMetadata);
      }).toThrow(/Circuit ID mismatch/);
    });

    it('should throw on public input count mismatch', () => {
      expect(() => {
        validateProofMetadata('withdraw', 7, vkMetadata);
      }).toThrow(/Public input count mismatch/);
    });
  });

  describe('extractVkMetadata', () => {
    it('should extract metadata for existing circuit', async () => {
      const metadata = await extractVkMetadata(mockManifest, 'withdraw');
      
      expect(metadata.circuit_id).toBe('withdraw');
      expect(metadata.public_input_count).toBe(8);
      expect(metadata.manifest_hash).toMatch(/^0x[0-9a-f]+$/);
    });

    it('should throw for non-existent circuit', async () => {
      await expect(
        extractVkMetadata(mockManifest, 'nonexistent')
      ).rejects.toThrow(/not found in manifest/);
    });
  });

  describe('vkMetadataEquals', () => {
    const metadata1: VkMetadata = {
      circuit_id: 'withdraw',
      public_input_count: 8,
      manifest_hash: '0xabc123',
    };

    it('should return true for identical metadata', () => {
      const metadata2 = { ...metadata1 };
      expect(vkMetadataEquals(metadata1, metadata2)).toBe(true);
    });

    it('should return false for different circuit_id', () => {
      const metadata2 = { ...metadata1, circuit_id: 'commitment' };
      expect(vkMetadataEquals(metadata1, metadata2)).toBe(false);
    });

    it('should return false for different public_input_count', () => {
      const metadata2 = { ...metadata1, public_input_count: 7 };
      expect(vkMetadataEquals(metadata1, metadata2)).toBe(false);
    });

    it('should return false for different manifest_hash', () => {
      const metadata2 = { ...metadata1, manifest_hash: '0xdef456' };
      expect(vkMetadataEquals(metadata1, metadata2)).toBe(false);
    });
  });

  describe('VK Upgrade Scenarios', () => {
    it('should track VK version changes via manifest hash', async () => {
      const manifestV1 = mockManifest;
      const manifestV2 = {
        ...mockManifest,
        circuits: {
          withdraw: {
            ...mockManifest.circuits.withdraw,
            bytecode_sha256: '0xnewbytecode',
          },
        },
      };

      const hashV1 = await computeManifestHash(manifestV1);
      const hashV2 = await computeManifestHash(manifestV2);

      expect(hashV1).not.toBe(hashV2);
    });

    it('should allow rollback detection via manifest hash comparison', async () => {
      const currentMetadata: VkMetadata = {
        circuit_id: 'withdraw',
        public_input_count: 8,
        manifest_hash: '0xcurrent',
      };

      const rollbackMetadata: VkMetadata = {
        circuit_id: 'withdraw',
        public_input_count: 8,
        manifest_hash: '0xprevious',
      };

      expect(vkMetadataEquals(currentMetadata, rollbackMetadata)).toBe(false);
      expect(currentMetadata.manifest_hash).not.toBe(rollbackMetadata.manifest_hash);
    });
  });
});
