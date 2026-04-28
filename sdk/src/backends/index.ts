/**
 * Proving Backends
 *
 * Implementations of the ProvingBackend interface for different environments
 * and proving systems.
 */

// Re-export the ProvingBackend interface from proof module
export type { ProvingBackend } from '../proof';

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

export {
  MockProvingBackend,
  MockBackendConfig,
} from './mock';

export {
  ZkCapabilities,
  RuntimeType,
  CapabilityCheck,
  UnsupportedRuntimeError,
  detectRuntimeType,
  detectCapabilities,
  hasSecureRandomness,
  canLoadArtifactsFromFilesystem,
  canSupportWasmProving,
  assertCapability,
  isCapabilitySupported,
  assertProvingBackendSupported,
  assertWitnessFormattingSupported,
} from '../capabilities';
