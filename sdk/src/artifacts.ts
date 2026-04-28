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

import { posix as pathPosix } from 'path';
import { Buffer } from 'buffer';
import { NoirArtifacts, ZkArtifactManifest, ArtifactManifestError } from './types';
import { sha256Hex } from './hash';

/**
 * Join URL parts ensuring single slashes.
 */
function joinUrl(base: string, ...parts: string[]): string {
  const normalizedBase = base.endsWith('/') ? base : base + '/';
  const normalizedParts = parts.map((p) => (p.startsWith('/') ? p.slice(1) : p));
  return normalizedBase + normalizedParts.join('/');
}

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
  return pathPosix.join(ZK_ARTIFACTS_BASE_DIR, `v${version}`);
}

/**
 * Get the circuits directory for a specific version.
 */
export function getCircuitsDir(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getVersionedArtifactsDir(version), 'circuits');
}

/**
 * Get the circuit directory for a specific circuit and version.
 */
export function getCircuitDir(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getCircuitsDir(version), circuitName);
}

/**
 * Get the compiled circuit JSON path for a specific circuit.
 */
export function getCircuitPath(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getCircuitDir(circuitName, version), `${circuitName}.json`);
}

/**
 * Get the manifests directory for a specific version.
 */
export function getManifestsDir(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getVersionedArtifactsDir(version), 'manifests');
}

/**
 * Get the manifest file path for a specific version.
 */
export function getManifestPath(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getManifestsDir(version), 'manifest.json');
}

/**
 * Get the fixtures directory for a specific version.
 */
export function getFixturesDir(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getVersionedArtifactsDir(version), 'fixtures');
}

/**
 * Get the fixtures directory for a specific circuit.
 */
export function getCircuitFixturesDir(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getFixturesDir(version), circuitName);
}

/**
 * Get the proving keys directory for a specific version.
 */
export function getProvingKeysDir(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getVersionedArtifactsDir(version), 'proving_keys');
}

/**
 * Get the proving keys directory for a specific circuit.
 */
export function getCircuitProvingKeysDir(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getProvingKeysDir(version), circuitName);
}

/**
 * Get the verification key path for a specific circuit.
 */
export function getVerificationKeyPath(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getCircuitProvingKeysDir(circuitName, version), 'vk');
}

/**
 * Get the proving key path for a specific circuit.
 */
export function getProvingKeyPath(circuitName: string, version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getCircuitProvingKeysDir(circuitName, version), 'pk');
}

/**
 * Get the release bundle directory for a specific version.
 */
export function getReleaseBundleDir(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getVersionedArtifactsDir(version), 'bundles');
}

/**
 * Get the release bundle file path for a specific version.
 */
export function getReleaseBundlePath(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getReleaseBundleDir(version), 'release-bundle.json');
}

/**
 * Get the benchmark baselines file path for a specific version.
 */
export function getBenchmarkBaselinesPath(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getReleaseBundleDir(version), 'benchmark-baselines.json');
}

/**
 * Get the root directory for VK rotation evidence for a specific version.
 */
export function getRotationEvidenceDir(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getReleaseBundleDir(version), 'rotation-evidence');
}

/**
 * Get the VK rotation evidence bundle path for a specific pool and version.
 */
export function getRotationEvidenceBundlePath(
  poolId: string,
  version: string = ZK_ARTIFACT_VERSION
): string {
  return pathPosix.join(getRotationEvidenceDir(version), poolId, 'rotation-bundle.json');
}

/**
 * Get the human-readable VK rotation log path for a specific pool and version.
 */
export function getRotationEvidenceLogPath(
  poolId: string,
  version: string = ZK_ARTIFACT_VERSION
): string {
  return pathPosix.join(getRotationEvidenceDir(version), poolId, 'rotation-log.md');
}

/**
 * Filename for the verifier schema artifact.
 */
export const VERIFIER_SCHEMA_FILENAME = 'verifier_schema.json';

/**
 * Get the verifier schema path for a specific version.
 */
export function getVerifierSchemaPath(version: string = ZK_ARTIFACT_VERSION): string {
  return pathPosix.join(getVersionedArtifactsDir(version), VERIFIER_SCHEMA_FILENAME);
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
  getReleaseBundleDir,
  getReleaseBundlePath,
  getBenchmarkBaselinesPath,
  getRotationEvidenceDir,
  getRotationEvidenceBundlePath,
  getRotationEvidenceLogPath,
  CIRCUIT_NAMES,
  getKnownCircuitPath,
  VERIFIER_SCHEMA_FILENAME,
  getVerifierSchemaPath,
} as const;
/**
 * Browser-compatible artifact loader that fetches versioned artifacts from URLs
 * and validates their integrity against a manifest.
 */
export class BrowserArtifactLoader {
  constructor(private readonly baseUrl: string) {}

  /**
   * Fetches the manifest for a specific version.
   */
  async fetchManifest(
    version: string = ZK_ARTIFACT_VERSION
  ): Promise<ZkArtifactManifest> {
    const manifestPath = `manifests/manifest.json`;
    const url = joinUrl(
      this.baseUrl,
      ZK_ARTIFACTS_BASE_DIR,
      `v${version}`,
      manifestPath
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new ArtifactManifestError(
        `Failed to fetch manifest from ${url}: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Loads and validates artifacts for a specific circuit and version.
   */
  async loadArtifacts(
    circuitName: string,
    version: string = ZK_ARTIFACT_VERSION
  ): Promise<NoirArtifacts> {
    const manifest = await this.fetchManifest(version);
    const entry = manifest.circuits[circuitName];

    if (!entry) {
      throw new ArtifactManifestError(
        `Circuit "${circuitName}" not found in manifest for version "${version}"`
      );
    }

    const artifactUrl = joinUrl(
      this.baseUrl,
      ZK_ARTIFACTS_BASE_DIR,
      `v${version}`,
      entry.path
    );

    const response = await fetch(artifactUrl);
    if (!response.ok) {
      throw new ArtifactManifestError(
        `Failed to fetch artifact for "${circuitName}" from ${artifactUrl}: ${response.statusText}`
      );
    }

    const raw = await response.arrayBuffer();
    const bytes = new Uint8Array(raw);
    
    // Integrity check (ZK-085)
    // Check 'artifact_sha256' first, then 'checksum' for compatibility
    const expectedHash = entry.artifact_sha256 ?? entry.checksum;
    if (expectedHash) {
      const actualHash = await sha256Hex(bytes);
      if (actualHash !== expectedHash) {
        throw new ArtifactManifestError(
          `Integrity check failed for "${circuitName}": expected ${expectedHash}, got ${actualHash}`
        );
      }
    }

    const artifact = JSON.parse(new TextDecoder().decode(bytes));

    return {
      acir: typeof artifact.bytecode === 'string' 
        ? new Uint8Array(Buffer.from(artifact.bytecode, 'base64')) // If it's base64 encoded
        : new Uint8Array(artifact.acir || []), // Fallback to raw acir array if present
      abi: artifact.abi,
      name: artifact.name || circuitName,
      bytecode: artifact.bytecode,
    };
  }
}
