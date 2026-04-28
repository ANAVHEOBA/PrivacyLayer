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
