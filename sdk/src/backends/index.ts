/**
 * Proving Backends
 *
 * Implementations of the ProvingBackend interface for different environments
 * and proving systems.
 */

export {
  ArtifactManifestError,
  NoirBackend,
  NoirBackendConfig,
  NoirArtifacts,
  ZkArtifactManifest,
  ZkArtifactManifestBackend,
  ZkArtifactManifestCircuit,
  ZkArtifactManifestFile,
  assertManifestMatchesNoirArtifacts,
  createBarretenbergBackend,
} from './noir';
