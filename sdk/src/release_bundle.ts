import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  ZK_ARTIFACT_VERSION,
  getBenchmarkBaselinesPath,
  getManifestPath,
  getReleaseBundleDir as getReleaseBundleDirPath,
  getReleaseBundlePath,
  getRotationEvidenceDir,
} from './artifacts';
import {
  ArtifactManifestError,
  ZkArtifactManifest,
  ZkArtifactManifestBackend,
  ZkArtifactManifestCircuit,
  ZkArtifactManifestFile,
} from './types';
import { stableStringify } from './stable';

export const ZK_RELEASE_BUNDLE_VERSION = 1;
export const ZK_RELEASE_BUNDLE_SCHEMA_VERSION = 1;
export const ZK_RELEASE_BUNDLE_TARGET_CIRCUIT = 'withdraw';
export const ZK_RELEASE_BUNDLE_CONTRACT_NAME = 'privacy_pool';

export interface ZkReleaseBundleVerifierSchema {
  circuit_id: string;
  public_input_schema: readonly string[];
  public_input_arity: number;
  contract_public_input_schema: readonly string[];
  contract_public_input_arity: number;
  schema_version: number;
}

export interface ZkReleaseBundleContractMetadata {
  contract_name: string;
  target_circuit_id: string;
  manifest_sha256: string;
  public_input_arity: number;
  schema_version: number;
  verifier_key_storage: string;
}

export interface ZkReleaseBundleOperationalArtifacts {
  benchmark_baselines_path: string;
  rotation_evidence_dir: string;
}

export interface ZkReleaseBundle {
  version: number;
  artifact_version: string;
  manifest_sha256: string;
  manifest: ZkArtifactManifest;
  verifier_schema: ZkReleaseBundleVerifierSchema;
  contract_metadata: ZkReleaseBundleContractMetadata;
  operational_artifacts: ZkReleaseBundleOperationalArtifacts;
}

export interface ZkReleaseBundleTargetMetadata {
  circuit_id: string;
  manifest_sha256: string;
  public_input_arity: number;
  schema_version?: number;
}

export interface ZkReleaseBundleMismatch {
  field: 'circuit_id' | 'manifest_sha256' | 'public_input_arity' | 'schema_version';
  expected: string | number;
  actual: string | number;
}

function sha256Hex(value: string): string {
  return '0x' + createHash('sha256').update(value).digest('hex');
}

function normalizeManifest(manifest: ZkArtifactManifest): ZkArtifactManifest {
  return JSON.parse(stableStringify(manifest)) as ZkArtifactManifest;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function resolveRepoPath(relativePath: string): string {
  return path.resolve(__dirname, '..', '..', relativePath);
}

function schemaForCircuit(circuit: ZkArtifactManifestCircuit): ZkReleaseBundleVerifierSchema {
  const publicInputSchema = circuit.public_input_schema ?? [];
  const contractPublicInputSchema = publicInputSchema.length > 0 ? publicInputSchema.slice(1) : [];

  return {
    circuit_id: circuit.circuit_id,
    public_input_schema: publicInputSchema,
    public_input_arity: publicInputSchema.length,
    contract_public_input_schema: contractPublicInputSchema,
    contract_public_input_arity: contractPublicInputSchema.length,
    schema_version: ZK_RELEASE_BUNDLE_SCHEMA_VERSION,
  };
}

export function getReleaseBundleDirectory(version: string = ZK_ARTIFACT_VERSION): string {
  return getReleaseBundleDirPath(version);
}

export function computeManifestSha256(manifest: ZkArtifactManifest): string {
  return sha256Hex(stableStringify(manifest));
}

export function createReleaseBundle(manifest: ZkArtifactManifest, artifactVersion: string = ZK_ARTIFACT_VERSION): ZkReleaseBundle {
  const normalizedManifest = normalizeManifest(manifest);
  const manifestSha256 = computeManifestSha256(normalizedManifest);
  const targetCircuit = normalizedManifest.circuits[ZK_RELEASE_BUNDLE_TARGET_CIRCUIT];

  if (!targetCircuit) {
    throw new ArtifactManifestError(`Missing release-bundle target circuit "${ZK_RELEASE_BUNDLE_TARGET_CIRCUIT}"`);
  }

  const verifierSchema = schemaForCircuit(targetCircuit);

  return {
    version: ZK_RELEASE_BUNDLE_VERSION,
    artifact_version: artifactVersion,
    manifest_sha256: manifestSha256,
    manifest: normalizedManifest,
    verifier_schema: verifierSchema,
    contract_metadata: {
      contract_name: ZK_RELEASE_BUNDLE_CONTRACT_NAME,
      target_circuit_id: targetCircuit.circuit_id,
      manifest_sha256: manifestSha256,
      public_input_arity: verifierSchema.contract_public_input_arity,
      schema_version: verifierSchema.schema_version,
      verifier_key_storage: 'DataKey::VerifyingKey',
    },
    operational_artifacts: {
      benchmark_baselines_path: getBenchmarkBaselinesPath(artifactVersion),
      rotation_evidence_dir: getRotationEvidenceDir(artifactVersion),
    },
  };
}

export function assertReleaseBundleCompatibleWithManifest(bundle: ZkReleaseBundle): ZkReleaseBundleTargetMetadata {
  const computedManifestSha256 = computeManifestSha256(bundle.manifest);
  if (bundle.manifest_sha256 !== computedManifestSha256) {
    throw new ArtifactManifestError(
      `Release bundle manifest hash mismatch: expected ${bundle.manifest_sha256}, got ${computedManifestSha256}`
    );
  }

  const circuit = bundle.manifest.circuits[bundle.verifier_schema.circuit_id];
  if (!circuit) {
    throw new ArtifactManifestError(
      `Release bundle references missing circuit "${bundle.verifier_schema.circuit_id}"`
    );
  }

  const schema = bundle.verifier_schema;
  if (schema.public_input_arity !== schema.public_input_schema.length) {
    throw new ArtifactManifestError(
      `Release bundle public-input arity mismatch for "${schema.circuit_id}"`
    );
  }

  if (schema.contract_public_input_arity !== schema.contract_public_input_schema.length) {
    throw new ArtifactManifestError(
      `Release bundle contract public-input arity mismatch for "${schema.circuit_id}"`
    );
  }

  const expectedContractSchema = schema.public_input_schema.slice(1);
  const contractSchemaMatches =
    expectedContractSchema.length === schema.contract_public_input_schema.length &&
    expectedContractSchema.every((field: string, index: number) => field === schema.contract_public_input_schema[index]);

  if (!contractSchemaMatches) {
    throw new ArtifactManifestError(
      `Release bundle contract schema mismatch for "${schema.circuit_id}"`
    );
  }

  const manifestSchema = circuit.public_input_schema ?? [];
  const manifestSchemaMatches =
    manifestSchema.length === schema.public_input_schema.length &&
    manifestSchema.every((field, index) => field === schema.public_input_schema[index]);

  if (!manifestSchemaMatches) {
    throw new ArtifactManifestError(
      `Release bundle schema mismatch for "${schema.circuit_id}"`
    );
  }

  return {
    circuit_id: schema.circuit_id,
    manifest_sha256: bundle.manifest_sha256,
    public_input_arity: schema.contract_public_input_arity,
    schema_version: schema.schema_version,
  };
}

export function compareReleaseBundleTargetMetadata(
  bundle: ZkReleaseBundle,
  target: ZkReleaseBundleTargetMetadata,
): ZkReleaseBundleMismatch[] {
  const mismatches: ZkReleaseBundleMismatch[] = [];
  const expected = assertReleaseBundleCompatibleWithManifest(bundle);

  if (target.circuit_id !== expected.circuit_id) {
    mismatches.push({ field: 'circuit_id', expected: expected.circuit_id, actual: target.circuit_id });
  }

  if (target.manifest_sha256 !== expected.manifest_sha256) {
    mismatches.push({ field: 'manifest_sha256', expected: expected.manifest_sha256, actual: target.manifest_sha256 });
  }

  if (target.public_input_arity !== expected.public_input_arity) {
    mismatches.push({ field: 'public_input_arity', expected: expected.public_input_arity, actual: target.public_input_arity });
  }

  if (
    typeof target.schema_version === 'number' &&
    target.schema_version !== expected.schema_version
  ) {
    mismatches.push({ field: 'schema_version', expected: expected.schema_version ?? 0, actual: target.schema_version as number });
  }

  return mismatches;
}

export function loadReleaseBundle(version: string = ZK_ARTIFACT_VERSION): ZkReleaseBundle {
  const bundlePath = resolveRepoPath(getReleaseBundlePath(version));
  if (fs.existsSync(bundlePath)) {
    const bundle = readJson<ZkReleaseBundle>(bundlePath);
    assertReleaseBundleCompatibleWithManifest(bundle);
    return bundle;
  }

  const manifest = loadManifestForBundle(version);
  return createReleaseBundle(manifest, version);
}

export function loadManifestForBundle(version: string = ZK_ARTIFACT_VERSION): ZkArtifactManifest {
  const versionedManifestPath = resolveRepoPath(getManifestPath(version));
  if (fs.existsSync(versionedManifestPath)) {
    return readJson<ZkArtifactManifest>(versionedManifestPath);
  }

  const legacyManifestPath = resolveRepoPath(path.join('artifacts', 'zk', 'manifest.json'));
  if (fs.existsSync(legacyManifestPath)) {
    return readJson<ZkArtifactManifest>(legacyManifestPath);
  }

  throw new ArtifactManifestError(
    `Unable to load manifest for bundle version ${version}: no manifest found at ${versionedManifestPath} or ${legacyManifestPath}`
  );
}

export type {
  ZkArtifactManifest,
  ZkArtifactManifestBackend,
  ZkArtifactManifestCircuit,
  ZkArtifactManifestFile,
};
