/**
 * Proving Backends
 *
 * Implementations of the ProvingBackend interface for different environments
 * and proving systems.
 */

// Re-export the ProvingBackend interface from proof module
export type { ProvingBackend } from '../proof';

export {
  NoirBackend,
  NoirBackendConfig,
  assertManifestMatchesNoirArtifacts,
  createBarretenbergBackend,
} from './noir';

export {
  ArtifactManifestError,
  NoirArtifacts,
  ZkArtifactManifest,
  ZkArtifactManifestBackend,
  ZkArtifactManifestCircuit,
  ZkArtifactManifestFile,
} from '../types';

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
