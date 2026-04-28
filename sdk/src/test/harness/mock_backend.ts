/**
 * Mock Proving Backend
 * 
 * A fast, deterministic proving backend for testing that implements the ProvingBackend
 * interface without performing actual cryptographic operations.
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 * 
 * Key Features:
 * - Deterministic proof generation from witness hash
 * - Groth16-format proof bytes (256 bytes: a=64, b=128, c=64)
 * - Configurable proof validity for testing failure paths
 * - Fast execution (< 100ms) for CI/CD environments
 * - No external dependencies (Barretenberg WASM)
 * 
 * **Important**: The mock backend generates proofs that match the Groth16 format
 * but are NOT cryptographically valid. The contract's verifier will reject these
 * proofs unless the verifier is also mocked or bypassed in tests.
 */

import { createHash } from 'crypto';
import { ProvingBackend } from '../../proof';
import { PreparedWitness } from '../../proof';

/**
 * Configuration for the mock proving backend
 */
export interface MockBackendConfig {
  /**
   * Whether to generate valid-looking proofs or invalid proofs.
   * - true: Generate deterministic but valid-looking proof bytes
   * - false: Generate invalid proof (all zeros)
   */
  generateValidProofs: boolean;
  
  /**
   * Optional seed for deterministic proof generation.
   * If not provided, only the witness hash is used.
   */
  seed?: string;
  
  /**
   * Optional delay in milliseconds to simulate proof generation time.
   * Useful for testing timeout handling and performance characteristics.
   */
  simulateDelay?: number;
}

/**
 * Mock implementation of ProvingBackend for testing
 * 
 * This backend provides fast, deterministic proof generation without performing
 * actual cryptographic operations. It's designed for:
 * 
 * 1. **Fast Feedback**: No cryptographic operations, completes in < 100ms
 * 2. **Deterministic Testing**: Same witness always produces same proof
 * 3. **Failure Injection**: Can generate invalid proofs to test error paths
 * 4. **CI/CD Friendly**: No external dependencies, works in any environment
 * 5. **Contract Compatibility**: Produces proofs in correct Groth16 format (256 bytes)
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3**
 */
export class MockProvingBackend implements ProvingBackend {
  private config: MockBackendConfig;
  
  constructor(config: MockBackendConfig) {
    this.config = config;
  }
  
  /**
   * Generates a deterministic proof from the witness
   * 
   * **Validates: Requirement 6.1** - Implements ProvingBackend interface
   * **Validates: Requirement 6.2** - Generates deterministic proof from witness hash
   * **Validates: Requirement 6.3** - Returns Groth16-format proof bytes (256 bytes)
   * 
   * @param witness The prepared witness for the withdrawal circuit
   * @returns A deterministic Groth16-format proof (256 bytes)
   */
  async generateProof(witness: PreparedWitness): Promise<Uint8Array> {
    // 1. Hash witness to create deterministic seed
    const witnessSeed = this.hashWitness(witness);
    
    // 2. Generate deterministic proof bytes
    const proofBytes = this.generateDeterministicProof(witnessSeed);
    
    // 3. Optionally simulate delay
    if (this.config.simulateDelay && this.config.simulateDelay > 0) {
      await this.delay(this.config.simulateDelay);
    }
    
    // 4. Return proof in Groth16 format (256 bytes)
    return proofBytes;
  }
  
  /**
   * Creates a stable hash of the witness for deterministic proof generation
   * 
   * This method creates a canonical representation of the witness by:
   * 1. Extracting all witness fields in a stable order
   * 2. Creating a JSON string with sorted keys
   * 3. Hashing the canonical string with SHA-256
   * 
   * The hash is combined with the optional seed to ensure different backend
   * instances can produce different proofs for the same witness.
   * 
   * **Validates: Requirement 6.2** - Deterministic proof generation from witness hash
   * 
   * @param witness The prepared witness
   * @returns A 32-byte hash of the witness
   */
  private hashWitness(witness: PreparedWitness): Buffer {
    // Create stable representation of witness (excluding hashMode metadata)
    const canonical = this.stableStringify({
      nullifier: witness.nullifier,
      secret: witness.secret,
      leaf_index: witness.leaf_index,
      hash_path: witness.hash_path,
      pool_id: witness.pool_id,
      root: witness.root,
      nullifier_hash: witness.nullifier_hash,
      recipient: witness.recipient,
      amount: witness.amount,
      relayer: witness.relayer,
      fee: witness.fee,
      denomination: witness.denomination,
    });
    
    // Combine with optional seed for additional entropy
    const input = this.config.seed
      ? canonical + this.config.seed
      : canonical;
    
    return createHash('sha256').update(input, 'utf8').digest();
  }
  
  /**
   * Generates a deterministic proof in Groth16 format
   * 
   * Groth16 proof structure (256 bytes total):
   * - a: G1 point (64 bytes) - offset 0
   * - b: G2 point (128 bytes) - offset 64
   * - c: G1 point (64 bytes) - offset 192
   * 
   * **Validates: Requirement 6.3** - Groth16-format proof bytes (256 bytes)
   * 
   * @param seed The deterministic seed derived from witness hash
   * @returns A 256-byte proof in Groth16 format
   */
  private generateDeterministicProof(seed: Buffer): Uint8Array {
    // Allocate 256 bytes for Groth16 proof (a: 64, b: 128, c: 64)
    const proof = Buffer.alloc(256);
    
    if (this.config.generateValidProofs) {
      // Generate deterministic but valid-looking proof bytes
      // Use seed to derive proof components
      const a = this.deriveProofComponent(seed, 'a', 64);
      const b = this.deriveProofComponent(seed, 'b', 128);
      const c = this.deriveProofComponent(seed, 'c', 64);
      
      // Copy components into proof buffer
      a.copy(proof, 0);
      b.copy(proof, 64);
      c.copy(proof, 192);
    } else {
      // Generate invalid proof (all zeros)
      proof.fill(0);
    }
    
    return new Uint8Array(proof);
  }
  
  /**
   * Derives a deterministic proof component from the seed
   * 
   * This method uses iterative hashing to generate a deterministic byte sequence
   * of the required length. Each iteration hashes the seed, label, and previous
   * output to create a chain of deterministic bytes.
   * 
   * @param seed The deterministic seed
   * @param label The component label ('a', 'b', or 'c')
   * @param length The required length in bytes
   * @returns A deterministic byte sequence of the specified length
   */
  private deriveProofComponent(seed: Buffer, label: string, length: number): Buffer {
    // Derive deterministic proof component from seed
    const labelBuffer = Buffer.from(label, 'utf8');
    let output = Buffer.alloc(0);
    
    // Generate bytes iteratively until we have enough
    while (output.length < length) {
      const input = Buffer.concat([seed, labelBuffer, output]);
      const hash = createHash('sha256').update(input).digest();
      output = Buffer.concat([output, hash]);
    }
    
    // Return exactly the required length
    return output.slice(0, length);
  }
  
  /**
   * Creates a stable JSON string representation with sorted keys
   * 
   * This ensures that the same witness data always produces the same string,
   * regardless of property insertion order.
   * 
   * @param obj The object to stringify
   * @returns A stable JSON string with sorted keys
   */
  private stableStringify(obj: any): string {
    // Sort keys recursively for stable stringification
    const sortKeys = (o: any): any => {
      if (Array.isArray(o)) {
        return o.map(sortKeys);
      } else if (o !== null && typeof o === 'object') {
        return Object.keys(o)
          .sort()
          .reduce((result: any, key: string) => {
            result[key] = sortKeys(o[key]);
            return result;
          }, {});
      }
      return o;
    };
    
    return JSON.stringify(sortKeys(obj));
  }
  
  /**
   * Delays execution for the specified number of milliseconds
   * 
   * @param ms The delay in milliseconds
   * @returns A promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
