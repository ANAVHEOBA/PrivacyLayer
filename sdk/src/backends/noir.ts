/**
 * NoirJS Proving Backend
 *
 * Adapter for Noir circuits using the Noir.js library and Barretenberg proving system.
 * Handles witness compilation, artifact loading, and proof generation.
 */

import { createHash } from 'crypto';
import { ProvingBackend } from '../proof';
import { stableStringify } from '../stable';

export interface NoirArtifacts {
  /**
   * Compiled ACIR bytecode (Application-Constraint-Intermediate-Representation).
   * This is the compiled circuit constraints.
   */
  acir: Buffer;
  bytecode?: string;
  name?: string;

  /**
   * Verification key for Groth16 proofs.
   * Used for on-chain verification of the proof.
   */
  vkey?: Buffer;

  /**
   * ABI specification for the circuit.
   * Maps field names to their types and positions.
   */
  abi?: Record<string, any>;
}

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
}

export interface ZkArtifactManifestFile {
  path: string;
  sha256: string;
  version?: number;
}

export interface ZkArtifactManifestCircuit {
  circuit_id: string;
  path: string;
  artifact_sha256: string;
  bytecode_sha256: string;
  abi_sha256: string;
  name: string;
  backend: string;
  root_depth?: number;
  public_input_schema?: string[];
}

export interface ZkArtifactManifestBackend {
  name: string;
  nargo_version: string;
  noirc_version: string;
}

export interface ZkArtifactManifest {
  version: number;
  backend: ZkArtifactManifestBackend;
  circuits: Record<string, ZkArtifactManifestCircuit>;
  files?: Record<string, ZkArtifactManifestFile>;
}

export class ArtifactManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactManifestError';
  }
}

function sha256Hex(data: Buffer | string): string {
  return '0x' + createHash('sha256').update(data).digest('hex');
}

function computeAbiHash(abi: Record<string, any> | undefined): string {
  return sha256Hex(stableStringify(abi ?? null));
}

function computeBytecodeHash(artifacts: NoirArtifacts): string {
  if (typeof artifacts.bytecode === 'string') {
    return sha256Hex(artifacts.bytecode);
  }
  return sha256Hex(Buffer.from(artifacts.acir));
}

export function assertManifestMatchesNoirArtifacts(
  manifest: ZkArtifactManifest,
  circuitName: string,
  artifacts: NoirArtifacts,
  artifactPath?: string
): ZkArtifactManifestCircuit {
  const entry = manifest.circuits[circuitName];
  if (!entry) {
    throw new ArtifactManifestError(`Missing manifest entry for circuit "${circuitName}"`);
  }

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

  const bytecodeHash = computeBytecodeHash(artifacts);
  if (bytecodeHash !== entry.bytecode_sha256) {
    throw new ArtifactManifestError(
      `Bytecode hash mismatch for "${circuitName}": expected ${entry.bytecode_sha256}, got ${bytecodeHash}`
    );
  }

  const abiHash = computeAbiHash(artifacts.abi);
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

  constructor(config: NoirBackendConfig) {
    this.artifacts = config.artifacts;
    this.backend = config.backend;
    if (config.manifest && config.circuitName) {
      assertManifestMatchesNoirArtifacts(
        config.manifest,
        config.circuitName,
        config.artifacts,
        config.artifactPath
      );
    }
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
