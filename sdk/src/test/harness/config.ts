/**
 * Environment-Based Configuration Utilities
 * 
 * This module provides utilities for configuring the harness based on
 * environment variables, enabling CI/CD integration and flexible backend selection.
 * 
 * **Validates: Requirements 9.4, 8.1, 8.2**
 * 
 * Key Responsibilities:
 * - Load backend configuration from environment variables
 * - Support "mock" (default) and "real" backend types
 * - Load circuit artifacts from CIRCUIT_ARTIFACTS_PATH
 * - Configure timeout from TIMEOUT_MS
 * - Provide sensible defaults for all configuration options
 * 
 * Environment Variables:
 * - BACKEND_TYPE: "mock" or "real" (default: "mock")
 * - CIRCUIT_ARTIFACTS_PATH: path to circuit artifacts directory (default: "./artifacts/zk")
 * - MANIFEST_PATH: path to artifact manifest (default: "{CIRCUIT_ARTIFACTS_PATH}/manifest.json")
 * - TIMEOUT_MS: timeout for proof generation in milliseconds (default: 5000 for mock, 60000 for real)
 * - HARNESS_VERBOSE: enable verbose logging (default: "false")
 * 
 * @module config
 */

import { ProvingBackend } from '../../backends';
import { NoirBackend } from '../../backends/noir';
import { MockProvingBackend } from './mock_backend';
import { loadArtifactsFromManifest } from './artifacts';
import type { HarnessConfig, CircuitArtifacts, PoolConfig, TestConfig } from './types';
import { ConfigurationError } from './types';

/**
 * Backend type options
 */
export type BackendType = 'mock' | 'real';

/**
 * Environment-based configuration options
 */
export interface EnvironmentConfigOptions {
  /** Backend type (overrides BACKEND_TYPE env var) */
  backendType?: BackendType;
  /** Circuit artifacts path (overrides CIRCUIT_ARTIFACTS_PATH env var) */
  circuitArtifactsPath?: string;
  /** Manifest path (overrides MANIFEST_PATH env var) */
  manifestPath?: string;
  /** Timeout in milliseconds (overrides TIMEOUT_MS env var) */
  timeoutMs?: number;
  /** Verbose logging (overrides HARNESS_VERBOSE env var) */
  verbose?: boolean;
  /** Circuit name to load (default: "withdraw") */
  circuitName?: string;
  /** Contract client (required) */
  contractClient: any;
  /** Pool configuration (required) */
  poolConfig: PoolConfig;
  /** Skip cleanup after tests (default: false) */
  skipCleanup?: boolean;
}

/**
 * Result of environment-based configuration
 */
export interface EnvironmentConfigResult {
  /** Configured harness config */
  config: HarnessConfig;
  /** Backend type used */
  backendType: BackendType;
  /** Whether artifacts were loaded from manifest */
  artifactsLoaded: boolean;
}

/**
 * Creates a harness configuration from environment variables
 * 
 * **Validates: Requirement 9.4** - Environment-based backend selection
 * **Validates: Requirement 8.1** - Load circuit artifacts from CIRCUIT_ARTIFACTS_PATH
 * **Validates: Requirement 8.2** - Configure timeout from TIMEOUT_MS
 * 
 * This function:
 * 1. Reads backend type from BACKEND_TYPE env var (default: "mock")
 * 2. Reads circuit artifacts path from CIRCUIT_ARTIFACTS_PATH env var (default: "./artifacts/zk")
 * 3. Reads manifest path from MANIFEST_PATH env var (default: "{CIRCUIT_ARTIFACTS_PATH}/manifest.json")
 * 4. Reads timeout from TIMEOUT_MS env var (default: 5000 for mock, 60000 for real)
 * 5. Creates appropriate backend (MockProvingBackend or NoirBackend)
 * 6. Loads circuit artifacts (if using real backend)
 * 7. Returns complete HarnessConfig
 * 
 * Usage:
 * ```typescript
 * // Use environment variables
 * const { config } = await createConfigFromEnvironment({
 *   contractClient: myClient,
 *   poolConfig: myPoolConfig,
 * });
 * 
 * // Override specific options
 * const { config } = await createConfigFromEnvironment({
 *   backendType: 'real',
 *   timeoutMs: 30000,
 *   contractClient: myClient,
 *   poolConfig: myPoolConfig,
 * });
 * ```
 * 
 * @param options Configuration options (overrides for environment variables)
 * @returns Configuration result with harness config and metadata
 * @throws {ConfigurationError} If configuration fails
 */
export async function createConfigFromEnvironment(
  options: EnvironmentConfigOptions
): Promise<EnvironmentConfigResult> {
  // Step 1: Determine backend type
  const backendType = (options.backendType || 
                       process.env.BACKEND_TYPE || 
                       'mock') as BackendType;
  
  if (backendType !== 'mock' && backendType !== 'real') {
    throw new ConfigurationError(
      `Invalid backend type: "${backendType}". Must be "mock" or "real".`,
      {
        backendType,
        envVar: 'BACKEND_TYPE',
        validValues: ['mock', 'real'],
      }
    );
  }

  // Step 2: Determine circuit artifacts path
  const circuitArtifactsPath = options.circuitArtifactsPath || 
                                process.env.CIRCUIT_ARTIFACTS_PATH || 
                                './artifacts/zk';

  // Step 3: Determine manifest path
  const manifestPath = options.manifestPath || 
                       process.env.MANIFEST_PATH || 
                       `${circuitArtifactsPath}/manifest.json`;

  // Step 4: Determine timeout
  const defaultTimeout = backendType === 'mock' ? 5000 : 60000;
  const timeoutMs = options.timeoutMs || 
                    (process.env.TIMEOUT_MS ? parseInt(process.env.TIMEOUT_MS, 10) : defaultTimeout);

  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigurationError(
      `Invalid timeout: "${timeoutMs}". Must be a positive number.`,
      {
        timeoutMs,
        envVar: 'TIMEOUT_MS',
      }
    );
  }

  // Step 5: Determine verbose logging
  const verbose = options.verbose !== undefined 
                  ? options.verbose 
                  : (process.env.HARNESS_VERBOSE === 'true');

  // Step 6: Determine circuit name
  const circuitName = options.circuitName || 'withdraw';

  // Step 7: Create backend and load artifacts
  let backend: ProvingBackend;
  let artifacts: CircuitArtifacts;
  let manifest: any;
  let artifactsLoaded = false;

  if (backendType === 'real') {
    // Load artifacts from manifest for real backend
    try {
      const result = await loadArtifactsFromManifest({
        manifestPath,
        circuitName,
        artifactsBasePath: circuitArtifactsPath,
        validateIntegrity: true,
      });

      artifacts = result.artifacts;
      manifest = result.manifest;
      artifactsLoaded = true;

      // Create NoirBackend with loaded artifacts
      backend = new NoirBackend({
        artifacts: {
          acir: artifacts.acir,
          bytecode: artifacts.bytecode,
          vkey: artifacts.vkey,
          abi: artifacts.abi,
          name: artifacts.name,
        },
        manifest,
        circuitName,
      });

      if (verbose) {
        console.log('[Config] Using NoirBackend (real proofs)');
        console.log(`[Config] Circuit: ${circuitName}`);
        console.log(`[Config] Artifacts path: ${circuitArtifactsPath}`);
        console.log(`[Config] Manifest path: ${manifestPath}`);
      }
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load artifacts for real backend: ${(error as Error).message}`,
        {
          backendType,
          circuitArtifactsPath,
          manifestPath,
          circuitName,
        },
        error as Error
      );
    }
  } else {
    // Use mock backend for fast testing
    backend = new MockProvingBackend({
      generateValidProofs: true,
    });

    // Create placeholder artifacts for mock backend
    artifacts = {
      acir: Buffer.alloc(0),
      vkey: Buffer.alloc(0),
      abi: {},
    };

    if (verbose) {
      console.log('[Config] Using MockProvingBackend (fast testing)');
    }
  }

  // Step 8: Create test configuration
  const testConfig: TestConfig = {
    timeout: timeoutMs,
    verbose,
    skipCleanup: options.skipCleanup || false,
  };

  // Step 9: Create harness configuration
  const config: HarnessConfig = {
    provingBackend: backend,
    circuitArtifacts: artifacts,
    contractClient: options.contractClient,
    poolConfig: options.poolConfig,
    testConfig,
    ...(manifest && { manifest }),
    ...(backendType === 'real' && { circuitName }),
  };

  if (verbose) {
    console.log('[Config] Configuration created successfully');
    console.log(`[Config] Backend type: ${backendType}`);
    console.log(`[Config] Timeout: ${timeoutMs}ms`);
    console.log(`[Config] Pool ID: ${options.poolConfig.poolId}`);
    console.log(`[Config] Denomination: ${options.poolConfig.denomination}`);
  }

  return {
    config,
    backendType,
    artifactsLoaded,
  };
}

/**
 * Gets the backend type from environment
 * 
 * @returns Backend type ("mock" or "real")
 */
export function getBackendTypeFromEnvironment(): BackendType {
  const backendType = process.env.BACKEND_TYPE || 'mock';
  if (backendType !== 'mock' && backendType !== 'real') {
    throw new ConfigurationError(
      `Invalid BACKEND_TYPE: "${backendType}". Must be "mock" or "real".`,
      {
        backendType,
        envVar: 'BACKEND_TYPE',
        validValues: ['mock', 'real'],
      }
    );
  }
  return backendType as BackendType;
}

/**
 * Gets the circuit artifacts path from environment
 * 
 * @returns Circuit artifacts path
 */
export function getCircuitArtifactsPathFromEnvironment(): string {
  return process.env.CIRCUIT_ARTIFACTS_PATH || './artifacts/zk';
}

/**
 * Gets the manifest path from environment
 * 
 * @returns Manifest path
 */
export function getManifestPathFromEnvironment(): string {
  const circuitArtifactsPath = getCircuitArtifactsPathFromEnvironment();
  return process.env.MANIFEST_PATH || `${circuitArtifactsPath}/manifest.json`;
}

/**
 * Gets the timeout from environment
 * 
 * @param backendType Backend type (determines default timeout)
 * @returns Timeout in milliseconds
 */
export function getTimeoutFromEnvironment(backendType: BackendType): number {
  const defaultTimeout = backendType === 'mock' ? 5000 : 60000;
  
  if (!process.env.TIMEOUT_MS) {
    return defaultTimeout;
  }

  const timeoutMs = parseInt(process.env.TIMEOUT_MS, 10);
  
  if (isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigurationError(
      `Invalid TIMEOUT_MS: "${process.env.TIMEOUT_MS}". Must be a positive number.`,
      {
        timeoutMs: process.env.TIMEOUT_MS,
        envVar: 'TIMEOUT_MS',
      }
    );
  }

  return timeoutMs;
}

/**
 * Gets the verbose flag from environment
 * 
 * @returns Whether verbose logging is enabled
 */
export function getVerboseFromEnvironment(): boolean {
  return process.env.HARNESS_VERBOSE === 'true';
}

/**
 * Prints the current environment configuration
 * 
 * Useful for debugging and CI/CD logs.
 */
export function printEnvironmentConfig(): void {
  const backendType = getBackendTypeFromEnvironment();
  const circuitArtifactsPath = getCircuitArtifactsPathFromEnvironment();
  const manifestPath = getManifestPathFromEnvironment();
  const timeoutMs = getTimeoutFromEnvironment(backendType);
  const verbose = getVerboseFromEnvironment();

  console.log('=== Harness Environment Configuration ===');
  console.log(`Backend Type: ${backendType}`);
  console.log(`Circuit Artifacts Path: ${circuitArtifactsPath}`);
  console.log(`Manifest Path: ${manifestPath}`);
  console.log(`Timeout: ${timeoutMs}ms`);
  console.log(`Verbose: ${verbose}`);
  console.log('=========================================');
}
