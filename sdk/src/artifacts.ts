/**
 * ZK Artifact Path Configuration (ZK-041)
 *
 * Centralized configuration for locating compiled circuit artifacts, manifests,
 * fixtures, and proving assets. This ensures the SDK can locate artifacts without
 * hard-coded ad hoc paths and makes layout changes testable.
 *
 * Directory Structure:
 * artifacts/
 *   zk/
 *     v{version}/
 *       circuits/
 *         {circuit_name}/
 *           circuit.json          # Compiled circuit (ACIR + ABI)
 *       manifests/
 *         manifest.json           # Circuit metadata and checksums
 *       fixtures/
 *         {circuit_name}/
 *           test_vectors.json     # Test vectors and golden inputs
 *       proving_keys/
 *         {circuit_name}/
 *           vk                    # Verification key
 *           pk                    # Proving key
 */

import { join } from 'path';

/**
 * Current ZK artifact version.
 * Increment this when circuit definitions change incompatibly.
 */
export const ZK_ARTIFACT_VERSION = '1';

/**
 * Base directory for all ZK artifacts relative to repository root.
 */
export const ZK_ARTIFACTS_BASE_DIR = 'artifacts/zk';

/**
 * Get the versioned artifacts directory.
 */
export function getVersionedArtifactsDir(version: string = ZK_ARTIFACT_VERSION): string {
  return join(ZK_ARTIFACTS_BASE_DIR, `v${version}`);
}

/**
 * Get the circuits directory for a specific version.
 */
export function getCircuitsDir(version: string = ZK_ARTIFACT_VERSION): string {
  return join(getVersionedArtifactsDir(version), 'circuits');
}

/**
 * Get the circuit directory for a specific circuit and version.
 */
export function getCircuitDir(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return join(getCircuitsDir(version), circuitName);
}

/**
 * Get the compiled circuit JSON path for a specific circuit.
 */
export function getCircuitPath(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return join(getCircuitDir(circuitName, version), `${circuitName}.json`);
}

/**
 * Get the manifests directory for a specific version.
 */
export function getManifestsDir(version: string = ZK_ARTIFACT_VERSION): string {
  return join(getVersionedArtifactsDir(version), 'manifests');
}

/**
 * Get the manifest file path for a specific version.
 */
export function getManifestPath(version: string = ZK_ARTIFACT_VERSION): string {
  return join(getManifestsDir(version), 'manifest.json');
}

/**
 * Get the fixtures directory for a specific version.
 */
export function getFixturesDir(version: string = ZK_ARTIFACT_VERSION): string {
  return join(getVersionedArtifactsDir(version), 'fixtures');
}

/**
 * Get the fixtures directory for a specific circuit.
 */
export function getCircuitFixturesDir(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return join(getFixturesDir(version), circuitName);
}

/**
 * Get the proving keys directory for a specific version.
 */
export function getProvingKeysDir(version: string = ZK_ARTIFACT_VERSION): string {
  return join(getVersionedArtifactsDir(version), 'proving_keys');
}

/**
 * Get the proving keys directory for a specific circuit.
 */
export function getCircuitProvingKeysDir(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return join(getProvingKeysDir(version), circuitName);
}

/**
 * Get the verification key path for a specific circuit.
 */
export function getVerificationKeyPath(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return join(getCircuitProvingKeysDir(circuitName, version), 'vk');
}

/**
 * Get the proving key path for a specific circuit.
 */
export function getProvingKeyPath(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return join(getCircuitProvingKeysDir(circuitName, version), 'pk');
}

/**
 * Known circuit names in the PrivacyLayer system.
 */
export const CIRCUIT_NAMES = {
  COMMITMENT: 'commitment',
  WITHDRAW: 'withdraw',
  MERKLE: 'merkle',
} as const;

export type CircuitName = typeof CIRCUIT_NAMES[keyof typeof CIRCUIT_NAMES];

/**
 * Get the circuit path for a known circuit.
 */
export function getKnownCircuitPath(circuit: CircuitName, version?: string): string {
  return getCircuitPath(circuit, version);
}

/**
 * Artifact layout configuration object.
 * Exported for testing and validation.
 */
export const ARTIFACT_LAYOUT = {
  version: ZK_ARTIFACT_VERSION,
  baseDir: ZK_ARTIFACTS_BASE_DIR,
  getCircuitsDir,
  getCircuitDir,
  getCircuitPath,
  getManifestsDir,
  getManifestPath,
  getFixturesDir,
  getCircuitFixturesDir,
  getProvingKeysDir,
  getCircuitProvingKeysDir,
  getVerificationKeyPath,
  getProvingKeyPath,
  CIRCUIT_NAMES,
  getKnownCircuitPath,
} as const;
