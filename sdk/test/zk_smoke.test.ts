/**
 * ZK-107: Dependency-Resolution Smoke Tests
 * 
 * Lightweight smoke checks that prove key ZK modules load before full test execution.
 * These tests catch missing runtime or type dependencies early, preventing cascading
 * failures across the broader Jest test matrix.
 * 
 * Coverage:
 * - Main SDK entrypoint (sdk/src/index.ts)
 * - Poseidon hashing module (sdk/src/poseidon.ts)
 * - Noir backend entrypoint (sdk/src/backends/noir.ts)
 * - Core ZK modules (encoding, public_inputs, proof)
 */

describe('ZK SDK Dependency Resolution', () => {
  describe('Main SDK Entrypoint', () => {
    it('should load the main SDK index without errors', () => {
      expect(() => require('../src/index')).not.toThrow();
    });

    it('should export core ZK modules from the main entrypoint', () => {
      const sdk = require('../src/index');
      
      // Verify key exports exist
      expect(sdk).toHaveProperty('ProofGenerator');
      expect(sdk).toHaveProperty('WITHDRAWAL_PUBLIC_INPUT_SCHEMA');
      expect(sdk).toHaveProperty('Note');
      expect(sdk).toHaveProperty('MerkleTree');
    });
  });

  describe('Poseidon Module', () => {
    it('should load poseidon module without errors', () => {
      expect(() => require('../src/poseidon')).not.toThrow();
    });

    it('should export poseidon hashing functions', () => {
      const poseidon = require('../src/poseidon');
      
      expect(poseidon).toHaveProperty('poseidonHash');
      expect(poseidon).toHaveProperty('poseidonFieldHex');
      expect(poseidon).toHaveProperty('poseidonFieldBuffer');
      expect(poseidon).toHaveProperty('computeNoteCommitmentField');
      expect(poseidon).toHaveProperty('computeNoteCommitmentBytes');
    });

    it('should execute a basic poseidon hash operation', () => {
      const { poseidonHash } = require('../src/poseidon');
      
      // Simple smoke test with known inputs
      const inputs = [1n, 2n, 3n];
      const result = poseidonHash(inputs);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('bigint');
      expect(result > 0n).toBe(true);
    });
  });

  describe('Noir Backend Module', () => {
    it('should load noir backend module without errors', () => {
      expect(() => require('../src/backends/noir')).not.toThrow();
    });

    it('should export Noir backend classes and interfaces', () => {
      const noir = require('../src/backends/noir');
      
      expect(noir).toHaveProperty('NoirBackend');
      expect(noir).toHaveProperty('assertManifestMatchesNoirArtifacts');
      expect(noir).toHaveProperty('ArtifactManifestError');
    });

    it('should export type definitions for Noir artifacts', () => {
      const noir = require('../src/backends/noir');
      
      // Verify the module structure (types are compile-time only in TS)
      expect(typeof noir.NoirBackend).toBe('function');
      expect(typeof noir.assertManifestMatchesNoirArtifacts).toBe('function');
    });
  });

  describe('Encoding Module', () => {
    it('should load encoding module without errors', () => {
      expect(() => require('../src/encoding')).not.toThrow();
    });

    it('should export withdrawal public input schema', () => {
      const encoding = require('../src/encoding');
      
      expect(encoding).toHaveProperty('WITHDRAWAL_PUBLIC_INPUT_SCHEMA');
      expect(Array.isArray(encoding.WITHDRAWAL_PUBLIC_INPUT_SCHEMA)).toBe(true);
      expect(encoding.WITHDRAWAL_PUBLIC_INPUT_SCHEMA.length).toBeGreaterThan(0);
    });

    it('should export field encoding utilities', () => {
      const encoding = require('../src/encoding');
      
      expect(encoding).toHaveProperty('fieldToHex');
      expect(encoding).toHaveProperty('hexToField');
      expect(encoding).toHaveProperty('fieldToBuffer');
      expect(encoding).toHaveProperty('bufferToField');
    });
  });

  describe('Public Inputs Module', () => {
    it('should load public_inputs module without errors', () => {
      expect(() => require('../src/public_inputs')).not.toThrow();
    });

    it('should export schema constants', () => {
      const publicInputs = require('../src/public_inputs');
      
      expect(publicInputs).toHaveProperty('WITHDRAWAL_PUBLIC_INPUT_SCHEMA');
      expect(publicInputs).toHaveProperty('CONTRACT_VERIFIER_INPUT_SCHEMA');
    });
  });

  describe('Proof Module', () => {
    it('should load proof module without errors', () => {
      expect(() => require('../src/proof')).not.toThrow();
    });

    it('should export ProofGenerator class', () => {
      const proof = require('../src/proof');
      
      expect(proof).toHaveProperty('ProofGenerator');
      expect(typeof proof.ProofGenerator).toBe('function');
    });
  });

  describe('Backends Index', () => {
    it('should load backends index without errors', () => {
      expect(() => require('../src/backends')).not.toThrow();
    });

    it('should re-export Noir backend', () => {
      const backends = require('../src/backends');
      
      expect(backends).toHaveProperty('NoirBackend');
    });
  });
});
