/**
 * Verifying Key Metadata Utilities (ZK-074)
 *
 * Helpers for creating and validating VK metadata that tracks circuit identity,
 * public input arity, and manifest provenance for auditable upgrades.
 */

import { sha256Hex } from './hash';
import { ZkArtifactManifest, ZkArtifactManifestCircuit } from './types';

/**
 * VK metadata structure matching the on-chain VerifyingKey type.
 */
export interface VkMetadata {
  circuit_id: string;
  public_input_count: number;
  manifest_hash: string; // 32-byte hex string
}

/**
 * Computes the SHA-256 hash of a manifest for VK metadata.
 * This hash is stored on-chain to track which artifact set a VK corresponds to.
 *
 * @param manifest The ZK artifact manifest
 * @returns Hex-encoded SHA-256 hash (with 0x prefix)
 */
export async function computeManifestHash(manifest: ZkArtifactManifest): Promise<string> {
  const manifestJson = JSON.stringify(manifest);
  const hash = await sha256Hex(manifestJson);
  return hash.startsWith('0x') ? hash : `0x${hash}`;
}

/**
 * Creates VK metadata from a manifest circuit entry.
 *
 * @param circuitEntry The circuit entry from the manifest
 * @param manifestHash The hash of the full manifest
 * @returns VK metadata ready for on-chain storage
 */
export function createVkMetadata(
  circuitEntry: ZkArtifactManifestCircuit,
  manifestHash: string
): VkMetadata {
  // Derive public input count from schema if not explicitly provided
  const publicInputCount = circuitEntry.public_input_count ?? 
    (circuitEntry.public_input_schema?.length ?? 0);

  return {
    circuit_id: circuitEntry.circuit_id,
    public_input_count: publicInputCount,
    manifest_hash: manifestHash,
  };
}

/**
 * Validates that proof metadata matches VK metadata before submission.
 * This allows client-side validation before expensive on-chain operations.
 *
 * @param proofCircuitId The circuit ID used to generate the proof
 * @param publicInputCount The number of public inputs in the proof
 * @param vkMetadata The VK metadata from the contract
 * @throws Error if metadata doesn't match
 */
export function validateProofMetadata(
  proofCircuitId: string,
  publicInputCount: number,
  vkMetadata: VkMetadata
): void {
  if (proofCircuitId !== vkMetadata.circuit_id) {
    throw new Error(
      `Circuit ID mismatch: proof uses "${proofCircuitId}" but VK expects "${vkMetadata.circuit_id}"`
    );
  }

  if (publicInputCount !== vkMetadata.public_input_count) {
    throw new Error(
      `Public input count mismatch: proof has ${publicInputCount} inputs but VK expects ${vkMetadata.public_input_count}`
    );
  }
}

/**
 * Extracts VK metadata from a manifest for a specific circuit.
 *
 * @param manifest The ZK artifact manifest
 * @param circuitName The circuit name (e.g., "withdraw")
 * @returns VK metadata for the circuit
 * @throws Error if circuit not found in manifest
 */
export async function extractVkMetadata(
  manifest: ZkArtifactManifest,
  circuitName: string
): Promise<VkMetadata> {
  const circuitEntry = manifest.circuits[circuitName];
  if (!circuitEntry) {
    throw new Error(`Circuit "${circuitName}" not found in manifest`);
  }

  const manifestHash = await computeManifestHash(manifest);
  return createVkMetadata(circuitEntry, manifestHash);
}

/**
 * Compares two VK metadata objects for equality.
 * Useful for verifying VK updates and rollbacks.
 */
export function vkMetadataEquals(a: VkMetadata, b: VkMetadata): boolean {
  return (
    a.circuit_id === b.circuit_id &&
    a.public_input_count === b.public_input_count &&
    a.manifest_hash === b.manifest_hash
  );
}
