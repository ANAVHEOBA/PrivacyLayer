export interface CircuitArtifactManifestEntry {
  circuitId: string;
  artifact: string;
  /** Backward-compatible alias for artifact used by existing harnesses. */
  path?: string;
  artifactHash: string;
  /** Backward-compatible alias for artifactHash used by existing manifests. */
  checksum?: string;
  backend: string;
  backendVersion: string;
  compiler: string;
  compilerVersion: string;
  generatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ArtifactManifest {
  schemaVersion: string;
  circuits: Record<string, CircuitArtifactManifestEntry>;
}

export interface ValidateArtifactManifestOptions {
  circuitId: string;
  artifactFile?: string;
  artifactBytes?: Uint8Array | string;
  sha256?: (data: Uint8Array | string) => string;
  backend?: string;
  backendVersion?: string;
  compiler?: string;
  compilerVersion?: string;
}

export class ArtifactManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactManifestError';
  }
}

function normalizeHash(hash: string): string {
  return hash.toLowerCase().replace(/^0x/, '');
}

function assertHexSha256(hash: string, field: string): void {
  if (!/^(0x)?[0-9a-fA-F]{64}$/.test(hash)) {
    throw new ArtifactManifestError(`${field} must be a sha256 hex digest`);
  }
}

export function getCircuitManifestEntry(
  manifest: ArtifactManifest,
  circuitId: string
): CircuitArtifactManifestEntry {
  if (!manifest || typeof manifest !== 'object') {
    throw new ArtifactManifestError('Artifact manifest is missing or invalid');
  }
  if (manifest.schemaVersion !== '1.0') {
    throw new ArtifactManifestError(`Unsupported artifact manifest schemaVersion: ${manifest.schemaVersion}`);
  }
  const entry = manifest.circuits?.[circuitId];
  if (!entry) {
    throw new ArtifactManifestError(`Artifact manifest does not contain circuit: ${circuitId}`);
  }
  if (entry.circuitId !== circuitId) {
    throw new ArtifactManifestError(
      `Manifest circuit id mismatch: expected ${circuitId}, got ${entry.circuitId}`
    );
  }
  const artifact = entry.artifact || entry.path;
  const artifactHash = entry.artifactHash || entry.checksum;
  if (!artifact) {
    throw new ArtifactManifestError(`Manifest entry for ${circuitId} is missing artifact filename`);
  }
  if (!artifactHash) {
    throw new ArtifactManifestError(`Manifest entry for ${circuitId} is missing artifact hash`);
  }
  assertHexSha256(artifactHash, `${circuitId}.artifactHash`);
  return { ...entry, artifact, path: entry.path || artifact, artifactHash, checksum: entry.checksum || artifactHash };
}

export function validateArtifactManifest(
  manifest: ArtifactManifest,
  options: ValidateArtifactManifestOptions
): CircuitArtifactManifestEntry {
  const entry = getCircuitManifestEntry(manifest, options.circuitId);

  if (options.artifactFile && entry.artifact !== options.artifactFile) {
    throw new ArtifactManifestError(
      `Artifact filename mismatch for ${options.circuitId}: expected ${entry.artifact}, got ${options.artifactFile}`
    );
  }

  if (options.backend && entry.backend !== options.backend) {
    throw new ArtifactManifestError(
      `Backend mismatch for ${options.circuitId}: expected ${entry.backend}, got ${options.backend}`
    );
  }

  if (options.backendVersion && entry.backendVersion !== options.backendVersion) {
    throw new ArtifactManifestError(
      `Backend version mismatch for ${options.circuitId}: expected ${entry.backendVersion}, got ${options.backendVersion}`
    );
  }

  if (options.compiler && entry.compiler !== options.compiler) {
    throw new ArtifactManifestError(
      `Compiler mismatch for ${options.circuitId}: expected ${entry.compiler}, got ${options.compiler}`
    );
  }

  if (options.compilerVersion && entry.compilerVersion !== options.compilerVersion) {
    throw new ArtifactManifestError(
      `Compiler version mismatch for ${options.circuitId}: expected ${entry.compilerVersion}, got ${options.compilerVersion}`
    );
  }

  if (options.artifactBytes) {
    if (!options.sha256) {
      throw new ArtifactManifestError('sha256 function is required when artifactBytes are provided');
    }
    const actualHash = options.sha256(options.artifactBytes);
    if (normalizeHash(actualHash) !== normalizeHash(entry.artifactHash)) {
      throw new ArtifactManifestError(
        `Artifact hash mismatch for ${options.circuitId}: expected ${entry.artifactHash}, got ${actualHash}`
      );
    }
  }

  return entry;
}
