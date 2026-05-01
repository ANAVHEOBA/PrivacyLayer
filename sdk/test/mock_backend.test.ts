/**
 * Unit tests for MockProvingBackend
 * 
 * These tests verify that the mock backend:
 * 1. Generates deterministic proofs from witness hash
 * 2. Produces Groth16-format proof bytes (256 bytes)
 * 3. Supports configurable proof validity
 * 4. Handles delay simulation correctly
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */

import { MockProvingBackend } from '../src/test/harness/mock_backend';
import { PreparedWitness } from '../src/proof';

describe('MockProvingBackend', () => {
  // Sample witness for testing
  const sampleWitness: PreparedWitness = {
    nullifier: '0000000000000000000000000000000000000000000000000000000000000001',
    secret: '0000000000000000000000000000000000000000000000000000000000000002',
    leaf_index: '0000000000000000000000000000000000000000000000000000000000000000',
    hash_path: [
      '0000000000000000000000000000000000000000000000000000000000000003',
      '0000000000000000000000000000000000000000000000000000000000000004',
    ],
    pool_id: '0000000000000000000000000000000000000000000000000000000000000005',
    root: '0000000000000000000000000000000000000000000000000000000000000006',
    nullifier_hash: '0000000000000000000000000000000000000000000000000000000000000007',
    recipient: '0000000000000000000000000000000000000000000000000000000000000008',
    amount: '0000000000000000000000000000000000000000000000000000000000000064',
    relayer: '0000000000000000000000000000000000000000000000000000000000000000',
    fee: '0000000000000000000000000000000000000000000000000000000000000000',
    denomination: '0000000000000000000000000000000000000000000000000000000000000064',
    hashMode: 'mock',
  };

  describe('Proof Format', () => {
    it('should generate 256-byte proofs (Groth16 format)', async () => {
      // **Validates: Requirement 6.3** - Groth16-format proof bytes (256 bytes)
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const proof = await backend.generateProof(sampleWitness);
      
      expect(proof).toBeInstanceOf(Uint8Array);
      expect(proof.length).toBe(256);
    });

    it('should generate proofs with correct component sizes', async () => {
      // **Validates: Requirement 6.3** - a=64, b=128, c=64
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const proof = await backend.generateProof(sampleWitness);
      
      // Groth16 format: a (64 bytes), b (128 bytes), c (64 bytes)
      const a = proof.slice(0, 64);
      const b = proof.slice(64, 192);
      const c = proof.slice(192, 256);
      
      expect(a.length).toBe(64);
      expect(b.length).toBe(128);
      expect(c.length).toBe(64);
    });
  });

  describe('Deterministic Proof Generation', () => {
    it('should generate identical proofs for the same witness', async () => {
      // **Validates: Requirement 6.2** - Deterministic proof generation
      const backend = new MockProvingBackend({ generateValidProofs: true });
      
      const proof1 = await backend.generateProof(sampleWitness);
      const proof2 = await backend.generateProof(sampleWitness);
      
      expect(Buffer.from(proof1).equals(Buffer.from(proof2))).toBe(true);
    });

    it('should generate different proofs for different witnesses', async () => {
      // **Validates: Requirement 6.2** - Proof depends on witness hash
      const backend = new MockProvingBackend({ generateValidProofs: true });
      
      const witness2: PreparedWitness = {
        ...sampleWitness,
        nullifier: '0000000000000000000000000000000000000000000000000000000000000099',
      };
      
      const proof1 = await backend.generateProof(sampleWitness);
      const proof2 = await backend.generateProof(witness2);
      
      expect(Buffer.from(proof1).equals(Buffer.from(proof2))).toBe(false);
    });

    it('should generate different proofs with different seeds', async () => {
      // **Validates: Requirement 6.2** - Seed affects proof generation
      const backend1 = new MockProvingBackend({ 
        generateValidProofs: true,
        seed: 'seed1',
      });
      const backend2 = new MockProvingBackend({ 
        generateValidProofs: true,
        seed: 'seed2',
      });
      
      const proof1 = await backend1.generateProof(sampleWitness);
      const proof2 = await backend2.generateProof(sampleWitness);
      
      expect(Buffer.from(proof1).equals(Buffer.from(proof2))).toBe(false);
    });

    it('should generate identical proofs with the same seed', async () => {
      // **Validates: Requirement 6.2** - Same seed produces same proof
      const backend1 = new MockProvingBackend({ 
        generateValidProofs: true,
        seed: 'test-seed',
      });
      const backend2 = new MockProvingBackend({ 
        generateValidProofs: true,
        seed: 'test-seed',
      });
      
      const proof1 = await backend1.generateProof(sampleWitness);
      const proof2 = await backend2.generateProof(sampleWitness);
      
      expect(Buffer.from(proof1).equals(Buffer.from(proof2))).toBe(true);
    });
  });

  describe('Proof Validity Control', () => {
    it('should generate non-zero proofs when generateValidProofs is true', async () => {
      // **Validates: Requirement 6.1** - Configurable proof validity
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const proof = await backend.generateProof(sampleWitness);
      
      // Check that proof is not all zeros
      const isAllZeros = Array.from(proof).every(byte => byte === 0);
      expect(isAllZeros).toBe(false);
    });

    it('should generate zero proofs when generateValidProofs is false', async () => {
      // **Validates: Requirement 6.1** - Invalid proof generation
      const backend = new MockProvingBackend({ generateValidProofs: false });
      const proof = await backend.generateProof(sampleWitness);
      
      // Check that proof is all zeros
      const isAllZeros = Array.from(proof).every(byte => byte === 0);
      expect(isAllZeros).toBe(true);
    });

    it('should generate different invalid proofs for different witnesses', async () => {
      // Invalid proofs should still be deterministic (all zeros)
      const backend = new MockProvingBackend({ generateValidProofs: false });
      
      const witness2: PreparedWitness = {
        ...sampleWitness,
        nullifier: '0000000000000000000000000000000000000000000000000000000000000099',
      };
      
      const proof1 = await backend.generateProof(sampleWitness);
      const proof2 = await backend.generateProof(witness2);
      
      // Both should be all zeros
      expect(Buffer.from(proof1).equals(Buffer.from(proof2))).toBe(true);
    });
  });

  describe('Delay Simulation', () => {
    it('should complete quickly without delay', async () => {
      // **Validates: Requirement 6.1** - Fast proof generation
      const backend = new MockProvingBackend({ generateValidProofs: true });
      
      const startTime = Date.now();
      await backend.generateProof(sampleWitness);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should respect simulateDelay configuration', async () => {
      // **Validates: Requirement 6.1** - Delay simulation
      const delayMs = 50;
      const backend = new MockProvingBackend({ 
        generateValidProofs: true,
        simulateDelay: delayMs,
      });
      
      const startTime = Date.now();
      await backend.generateProof(sampleWitness);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThanOrEqual(delayMs);
      expect(duration).toBeLessThan(delayMs + 50); // Allow 50ms tolerance
    });

    it('should not delay when simulateDelay is 0', async () => {
      const backend = new MockProvingBackend({ 
        generateValidProofs: true,
        simulateDelay: 0,
      });
      
      const startTime = Date.now();
      await backend.generateProof(sampleWitness);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100);
    });
  });

  describe('ProvingBackend Interface', () => {
    it('should implement the ProvingBackend interface', async () => {
      // **Validates: Requirement 6.1** - Implements ProvingBackend interface
      const backend = new MockProvingBackend({ generateValidProofs: true });
      
      // Check that generateProof method exists and returns a Promise
      expect(typeof backend.generateProof).toBe('function');
      
      const proof = await backend.generateProof(sampleWitness);
      expect(proof).toBeInstanceOf(Uint8Array);
    });

    it('should accept any witness shape', async () => {
      // Mock backend should not validate witness structure
      const backend = new MockProvingBackend({ generateValidProofs: true });
      
      const minimalWitness = {
        nullifier: '0000000000000000000000000000000000000000000000000000000000000001',
        secret: '0000000000000000000000000000000000000000000000000000000000000002',
      } as any;
      
      // Should not throw
      const proof = await backend.generateProof(minimalWitness);
      expect(proof).toBeInstanceOf(Uint8Array);
      expect(proof.length).toBe(256);
    });
  });

  describe('Proof Component Derivation', () => {
    it('should generate different components (a, b, c)', async () => {
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const proof = await backend.generateProof(sampleWitness);
      
      const a = proof.slice(0, 64);
      const b = proof.slice(64, 192);
      const c = proof.slice(192, 256);
      
      // Components should be different from each other
      expect(Buffer.from(a).equals(Buffer.from(b.slice(0, 64)))).toBe(false);
      expect(Buffer.from(a).equals(Buffer.from(c))).toBe(false);
      expect(Buffer.from(b.slice(0, 64)).equals(Buffer.from(c))).toBe(false);
    });

    it('should generate non-repeating bytes within components', async () => {
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const proof = await backend.generateProof(sampleWitness);
      
      // Check that components are not just repeated bytes
      const a = proof.slice(0, 64);
      const firstByte = a[0];
      const allSame = Array.from(a).every(byte => byte === firstByte);
      
      expect(allSame).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle witness with empty hash_path', async () => {
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const witness: PreparedWitness = {
        ...sampleWitness,
        hash_path: [],
      };
      
      const proof = await backend.generateProof(witness);
      expect(proof.length).toBe(256);
    });

    it('should handle witness with long hash_path', async () => {
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const witness: PreparedWitness = {
        ...sampleWitness,
        hash_path: Array(20).fill('0000000000000000000000000000000000000000000000000000000000000003'),
      };
      
      const proof = await backend.generateProof(witness);
      expect(proof.length).toBe(256);
    });

    it('should handle witness with maximum field values', async () => {
      const backend = new MockProvingBackend({ generateValidProofs: true });
      const maxField = 'f'.repeat(64);
      const witness: PreparedWitness = {
        ...sampleWitness,
        nullifier: maxField,
        secret: maxField,
        amount: maxField,
      };
      
      const proof = await backend.generateProof(witness);
      expect(proof.length).toBe(256);
    });
  });
});
