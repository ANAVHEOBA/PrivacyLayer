/**
 * Contract-Facing Withdraw Proof Harness
 * 
 * A comprehensive test framework that validates the complete integration path
 * from ZK witness generation through proof creation to Soroban contract execution.
 * 
 * This harness bridges the SDK's proof generation layer with the contract's
 * verification layer, ensuring that serialized public inputs and proofs produced
 * by the SDK can be successfully consumed and verified by the contract.
 * 
 * @module harness
 */

// Export all types
export * from './types';

// Export harness implementation
export { WithdrawHarness } from './harness';

// Export mock backend
export { MockProvingBackend, MockBackendConfig } from './mock_backend';

// Export error utilities
export {
  classifyContractError,
  generateErrorReport,
  ErrorCategory,
  ContractErrorCode,
  type ClassifiedError,
  type ErrorReport,
  type ErrorContext,
} from './errors';

// Export artifact loading utilities
export {
  loadArtifactsFromManifest,
  validateArtifactIntegrity,
  validateArtifactsComplete,
  loadManifest,
  getCircuitEntry,
  type LoadArtifactsOptions,
  type LoadArtifactsResult,
} from './artifacts';

// Export performance utilities
export {
  calculatePerformanceStats,
  getBackendType,
  generateBackendPerformanceComparison,
  formatPerformanceStats,
  generatePerformanceReport,
  compareBackendPerformance,
} from './performance';

// Export environment-based configuration utilities
export {
  createConfigFromEnvironment,
  getBackendTypeFromEnvironment,
  getCircuitArtifactsPathFromEnvironment,
  getManifestPathFromEnvironment,
  getTimeoutFromEnvironment,
  getVerboseFromEnvironment,
  printEnvironmentConfig,
  type BackendType,
  type EnvironmentConfigOptions,
  type EnvironmentConfigResult,
} from './config';
