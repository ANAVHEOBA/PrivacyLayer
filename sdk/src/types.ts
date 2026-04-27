/**
 * ZK Artifact and Manifest Types (ZK-085)
 *
 * Shared type definitions for circuit artifacts and manifests used across
 * different environments (Node.js, Browser) and backends.
 */

export interface NoirArtifacts {
  /**
   * Compiled ACIR bytecode (Application-Constraint-Intermediate-Representation).
   * This is the compiled circuit constraints.
   */
  acir: Uint8Array;
  bytecode?: string;
  name?: string;

  /**
   * Verification key for Groth16 proofs.
   * Used for on-chain verification of the proof.
   */
  vkey?: Uint8Array;

  /**
   * ABI specification for the circuit.
   * Maps field names to their types and positions.
   */
  abi?: Record<string, any>;
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
  checksum?: string; // Legacy field for compatibility
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
  version: number | string;
  backend: string | ZkArtifactManifestBackend;
  circuits: Record<string, ZkArtifactManifestCircuit>;
  files?: Record<string, ZkArtifactManifestFile>;
}

export class ArtifactManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactManifestError';
  }
}
