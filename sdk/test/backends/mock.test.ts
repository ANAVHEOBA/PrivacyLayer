/**
 * Unit tests for MockProvingBackend
 * 
 * These tests verify that the mock backend:
 * 1. Generates deterministic proofs from witness data
 * 2. Produces proofs in correct Groth16 format (256 bytes)
 * 3. Supports configurable proof validity
 * 4. Implements the ProvingBackend interface correctly
 */

import { MockProvingBackend, MockBackendConfig } from '../src/backends/mock';
import type { PreparedWitness } from '../src/proof';
import { ZERO_FIELD_HEX } from '../src/zk_constants';

describe('MockProvingBackend', () => {
  let validConfig: MockBackendConfig;
  let invalidConfig: MockBackendConfig;
  
  // Sample witness for testing
  const sampleWitness: PreparedWitness = {
    nullifier: '0000000000000000000000000000000000000000000000000000000000000001',
    secret: '0000000000000000000000000000000000000000000000000000000000000002',
    leaf_index: '0000000000000000000000000000000000000000000000000000000000000000',
    hash_path: Array(20).fill(ZERO_FIELD_HEX),
    pool_id: '0000000000000000000000000000000000000000000000000000000000000003',
    root: '0000000000000000000000000000000000000000000000000000000000000004',
    nullifier_hash: '0000000000000000000000000000000000000000000000000000000000000005',
    recipient: '0000000000000000000000000000000000000000000000000000000000000006',
    amount: '0000000000000000000000000000000000000000000000000000000000000064',
    relayer: ZERO_FIELD_HEX,
    fee: ZERO_FIELD_HEX,
    denomination: '0000000000000000000000000000000000000000000000000000000000000064',
    hashMode: 'mock' as const,
  };
  
  beforeEach(() => {
    validConfig = {
      generateValidProofs: true,
    };
    
    invalidConfig = {
      generateValidProofs: false,
    };
  });
  
  describe('constructor', () => {
    it('should accept MockBackendConfig', () => {
      const backend = new MockProvingBackend(validConfig);
      expect(backend).toBeInstanceOf(MockProvingBackend);
    });
    
    it('should accept config with optional seed', () => {
      const config: MockBackendConfig = {
        generateValidProofs: true,
        seed: 'test-seed',
      };
      const backend = new MockProvingBackend(config);
      expect(backend).toBeInstanceOf(MockProvingBackend);
    });
    
    it('should accept config with optional simulateDelay', () => {
      const config: MockBackendConfig = {
        generateValidProofs: true,
        simulateDelay: 100,
      };
      const backend = new MockProvingBackend(config);
      expect(backend).toBeInstanceOf(MockProvingBackend);
    });
  });
  
  describe('generateProof', () => {
    it('should generate a 256-byte proof', async () => {
      const backend = new MockProvingBackend(validConfig);
      const proof = await backend.generateProof(sampleWitness);
      
      expect(proof).toBeInstanceOf(Uint8Array);
      expect(proof.length).toBe(256);
    });
    
    it('should generate deterministic proofs for same witness', async () => {
      const backend = new MockProvingBackend(validConfig);
      
      const proof1 = await backend.generateProof(sampleWitness);
      const proof2 = await backend.generateProof(sampleWitness);
      
      expect(Buffer.from(proof1).toString('hex')).toBe(
        Buffer.from(proof2).toString('hex')
      );
    });
    
    it('should generate different proofs for different witnesses', async () => {
      const backend = new MockProvingBackend(validConfig);
      
      const witness2: PreparedWitness = {
        ...sampleWitness,
        nullifier: '0000000000000000000000000000000000000000000000000000000000000099',
      };
      
      const proof1 = await backend.generateProof(sampleWitness);
      const proof2 = await backend.generateProof(witness2);
      
      expect(Buffer.from(proof1).toString('hex')).not.toBe(
        Buffer.from(proof2).toString('hex')
      );
    });
    
    it('should generate different proofs with different seeds', async () => {
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
      
      expect(Buffer.from(proof1).toString('hex')).not.toBe(
        Buffer.from(proof2).toString('hex')
      );
    });
    
    it('should generate all-zero proof when generateValidProofs is false', async () => {
      const backend = new MockProvingBackend(invalidConfig);
      const proof = await backend.generateProof(sampleWitness);
      
      expect(proof.length).toBe(256);
      expect(proof.every((byte: number) => byte === 0)).toBe(true);
    });
    
    it('should generate non-zero proof when generateValidProofs is true', async () => {
      const backend = new MockProvingBackend(validConfig);
      const proof = await backend.generateProof(sampleWitness);
      
      expect(proof.length).toBe(256);
      expect(proof.some((byte: number) => byte !== 0)).toBe(true);
    });
    
    it('should respect simulateDelay option', async () => {
      const delayMs = 50;
      const backend = new MockProvingBackend({
        generateValidProofs: true,
        simulateDelay: delayMs,
      });
      
      const startTime = Date.now();
      await backend.generateProof(sampleWitness);
      const endTime = Date.now();
      
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(delayMs);
    });
  });
  
  describe('Groth16 format', () => {
    it('should generate proof with correct component sizes', async () => {
      const backend = new MockProvingBackend(validConfig);
      const proof = await backend.generateProof(sampleWitness);
      
      // Groth16 format: a (64 bytes) || b (128 bytes) || c (64 bytes)
      expect(proof.length).toBe(256);
      
      // Extract components
      const a = proof.slice(0, 64);
      const b = proof.slice(64, 192);
      const c = proof.slice(192, 256);
      
      expect(a.length).toBe(64);
      expect(b.length).toBe(128);
      expect(c.length).toBe(64);
    });
    
    it('should generate different values for each component', async () => {
      const backend = new MockProvingBackend(validConfig);
      const proof = await backend.generateProof(sampleWitness);
      
      const a = Buffer.from(proof.slice(0, 64)).toString('hex');
      const b = Buffer.from(proof.slice(64, 192)).toString('hex');
      const c = Buffer.from(proof.slice(192, 256)).toString('hex');
      
      // Components should be different (not all the same)
      expect(a).not.toBe(b.slice(0, 128));
      expect(a).not.toBe(c);
      expect(b.slice(0, 128)).not.toBe(c);
    });
  });
  
  describe('ProvingBackend interface', () => {
    it('should implement generateProof method', () => {
      const backend = new MockProvingBackend(validConfig);
      expect(typeof backend.generateProof).toBe('function');
    });
    
    it('should return Promise<Uint8Array>', async () => {
      const backend = new MockProvingBackend(validConfig);
      const result = backend.generateProof(sampleWitness);
      
      expect(result).toBeInstanceOf(Promise);
      const proof = await result;
      expect(proof).toBeInstanceOf(Uint8Array);
    });
  });
});
