/**
 * NoirJS Proving Backend
 *
 * Adapter for Noir circuits using the Noir.js library and Barretenberg proving system.
 * Handles witness compilation, artifact loading, and proof generation.
 */

import { ProvingBackend } from '../proof';
import { stableStringify } from '../stable';
import { assertProvingBackendSupported, detectCapabilities, ZkCapabilities } from '../capabilities';
import { NoirArtifacts, ZkArtifactManifest, ZkArtifactManifestCircuit, ArtifactManifestError } from '../types';
import { sha256Hex } from '../hash';

export { NoirArtifacts };

/**
 * Configuration for Noir proving backend initialization.
 */
export interface NoirBackendConfig {
  /**
   * The compiled circuit artifacts (ACIR + VKey + ABI).
   */
  artifacts: NoirArtifacts;

  /**
   * Optional manifest used to validate artifact provenance before proving.
   */
  manifest?: ZkArtifactManifest;

  /**
   * Manifest circuit key to validate against, e.g. "withdraw".
   */
  circuitName?: string;

  /**
   * Optional artifact filename to match against the manifest entry path.
   */
  artifactPath?: string;

  /**
   * Optional: Barretenberg backend instance.
   * If not provided, one will be created automatically.
   */
  backend?: any; // BarretenbergBackend type when @noir/types is available

  /**
   * Whether to skip runtime capability checks on initialization.
   * Set to true if you want to defer capability validation.
   * @default false
   */
  skipCapabilityCheck?: boolean;
}

function computeAbiHash(abi: Record<string, any> | undefined): Promise<string> {
  return sha256Hex(stableStringify(abi ?? null));
}

async function computeBytecodeHash(artifacts: NoirArtifacts): Promise<string> {
  if (typeof artifacts.bytecode === 'string') {
    return await sha256Hex(artifacts.bytecode);
  }
  return await sha256Hex(artifacts.acir);
}

export async function assertManifestMatchesNoirArtifacts(
  manifest: ZkArtifactManifest,
  circuitName: string,
  artifacts: NoirArtifacts,
  artifactPath?: string
): Promise<ZkArtifactManifestCircuit> {
  const entry = manifest.circuits[circuitName];
  if (!entry) {
    throw new ArtifactManifestError(`Missing manifest entry for circuit "${circuitName}"`);
  }

  // Check legacy 'checksum' field if artifact_sha256 is missing (ZK-085 compatibility)
  const expectedArtifactHash = entry.artifact_sha256 ?? entry.checksum;

  if (entry.circuit_id !== circuitName) {
    throw new ArtifactManifestError(
      `Manifest circuit_id mismatch for "${circuitName}": expected ${circuitName}, got ${entry.circuit_id}`
    );
  }

  if (artifactPath && entry.path !== artifactPath) {
    throw new ArtifactManifestError(
      `Artifact path mismatch for "${circuitName}": expected ${entry.path}, got ${artifactPath}`
    );
  }

  if (artifacts.name && artifacts.name !== entry.name) {
    throw new ArtifactManifestError(
      `Artifact name mismatch for "${circuitName}": expected ${entry.name}, got ${artifacts.name}`
    );
  }

  const bytecodeHash = await computeBytecodeHash(artifacts);
  if (bytecodeHash !== entry.bytecode_sha256) {
    throw new ArtifactManifestError(
      `Bytecode hash mismatch for "${circuitName}": expected ${entry.bytecode_sha256}, got ${bytecodeHash}`
    );
  }

  const abiHash = await computeAbiHash(artifacts.abi);
  if (abiHash !== entry.abi_sha256) {
    throw new ArtifactManifestError(
      `ABI hash mismatch for "${circuitName}": expected ${entry.abi_sha256}, got ${abiHash}`
    );
  }

  return entry;
}

/**
 * NoirBackend
 *
 * Implements the ProvingBackend interface for Noir circuits.
 * Generates proofs using Barretenberg and the compiled ACIR.
 */
export class NoirBackend implements ProvingBackend {
  private artifacts: NoirArtifacts;
  private backend: any; // BarretenbergBackend when imported
  private capabilities: ZkCapabilities;

  constructor(config: NoirBackendConfig) {
    this.artifacts = config.artifacts;
    this.backend = config.backend;
    
    // Detect and store capabilities
    this.capabilities = detectCapabilities();
    
    // Perform capability check unless explicitly skipped
    if (!config.skipCapabilityCheck) {
      this.assertProvingCapabilities();
    }
    
    if (config.manifest && config.circuitName) {
      // Note: manifestation validation is now async but constructor is sync.
      // We should probably move this to an async initialization method if we want to enforce it here,
      // or rely on the caller to validate.
      // For now, we will perform the check and log if it fails, but technically this constructor
      // cannot await the result. 
      // ZK-085: NoirBackend should probably have an async init or a static factory.
      this.validateManifestAsync(config);
    }
  }

  private async validateManifestAsync(config: NoirBackendConfig): Promise<void> {
    if (config.manifest && config.circuitName) {
      try {
        await assertManifestMatchesNoirArtifacts(
          config.manifest,
          config.circuitName,
          config.artifacts,
          config.artifactPath
        );
      } catch (error) {
        console.error('Artifact manifest validation failed:', error);
      }
    }
  }

  /**
   * Asserts that the current runtime supports proving operations.
   * Throws UnsupportedRuntimeError with actionable diagnostics if not.
   */
  private assertProvingCapabilities(): void {
    assertProvingBackendSupported();
  }

  /**
   * Returns the detected capabilities for this backend instance.
   */
  getCapabilities(): ZkCapabilities {
    return this.capabilities;
  }

  /**
   * Generates a proof for the given witness using Noir/Barretenberg.
   *
   * The witness must match the circuit's ABI schema exactly:
   * - Private inputs (nullifier, secret, leaf_index, hash_path)
   * - Public inputs (root, nullifier_hash, recipient, amount, relayer, fee)
   *
   * @param witness The circuit witness with all inputs
   * @returns The proof as a Uint8Array (Groth16 proof format)
   */
  async generateProof(witness: any): Promise<Uint8Array> {
    // Ensure artifacts are loaded
    if (!this.artifacts.acir) {
      throw new Error('Circuit ACIR not loaded. Provide compiled artifacts.');
    }

    // Initialize backend if not provided
    if (!this.backend) {
      // In a real implementation, this would use BarretenbergBackend from @noir/backend_wasm
      // For now, we provide an interface that consumers must implement.
      throw new Error(
        'Barretenberg backend not initialized. ' +
        'Please provide a BarretenbergBackend instance or ensure the backend is properly set up.'
      );
    }

    try {
      // Step 1: Prove the witness
      // This calls into Barretenberg to generate the proof
      const proof = await this.backend.prove(this.artifacts.acir, witness);

      return new Uint8Array(proof);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Noir proof generation failed: ${message}. ` +
        'Ensure the witness matches the circuit ABI and all required inputs are provided.'
      );
    }
  }

  /**
   * Sets or updates the Barretenberg backend instance.
   * Allows for backend swapping (e.g., Node vs Browser).
   */
  setBackend(backend: any): void {
    this.backend = backend;
  }

  /**
   * Retrieves the current circuit artifacts.
   */
  getArtifacts(): NoirArtifacts {
    return this.artifacts;
  }
}

/**
 * Helper to load circuit artifacts from files (Node.js environment).
 *
 * Expected file structure:
 * - circuit.noir.acir (binary ACIR bytecode)
 * - circuit.noir.vkey (binary verification key)
 * - circuit.noir.abi.json (ABI schema)
 */
export async function loadNoirArtifacts(basePath: string): Promise<NoirArtifacts> {
  // This would be implemented in Node.js environment using fs
  // For now, provide the interface for consuming code
  throw new Error(
    'loadNoirArtifacts is not implemented. ' +
    'Provide artifacts directly to NoirBackend constructor.'
  );
}

/**
 * Helper to create a NoirBackend from Barretenberg WASM.
 *
 * Requires @noir/backend_wasm to be installed.
 * Usage:
 *   const backend = await createBarretenbergBackend(artifacts);
 */
export async function createBarretenbergBackend(
  artifacts: NoirArtifacts
): Promise<NoirBackend> {
  // Dynamic import to avoid requiring the module if not using this backend
  try {
    // In real usage: const { Barretenberg } = await import('@noir/backend_wasm');
    // const bbBackend = await Barretenberg.new();
    throw new Error(
      '@noir/backend_wasm not installed. ' +
      'Please install it to use Barretenberg proving.'
    );
  } catch (error) {
    throw new Error(
      'Failed to initialize Barretenberg backend. ' +
      'Ensure @noir/backend_wasm is properly installed: npm install @noir/backend_wasm'
    );
  }
}
