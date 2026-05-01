/**
 * Tests for Environment-Based Configuration Utilities
 * 
 * **Validates: Requirements 9.4, 8.1, 8.2**
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createConfigFromEnvironment,
  getBackendTypeFromEnvironment,
  getCircuitArtifactsPathFromEnvironment,
  getManifestPathFromEnvironment,
  getTimeoutFromEnvironment,
  getVerboseFromEnvironment,
  type BackendType,
} from './config';
import { MockProvingBackend } from './mock_backend';
import { NoirBackend } from '../../backends/noir';
import { ConfigurationError } from './types';

describe('Environment-Based Configuration', () => {
  // Store original environment variables
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.BACKEND_TYPE;
    delete process.env.CIRCUIT_ARTIFACTS_PATH;
    delete process.env.MANIFEST_PATH;
    delete process.env.TIMEOUT_MS;
    delete process.env.HARNESS_VERBOSE;
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });

  describe('getBackendTypeFromEnvironment', () => {
    it('should return "mock" by default', () => {
      const backendType = getBackendTypeFromEnvironment();
      expect(backendType).toBe('mock');
    });

    it('should return "mock" when BACKEND_TYPE is "mock"', () => {
      process.env.BACKEND_TYPE = 'mock';
      const backendType = getBackendTypeFromEnvironment();
      expect(backendType).toBe('mock');
    });

    it('should return "real" when BACKEND_TYPE is "real"', () => {
      process.env.BACKEND_TYPE = 'real';
      const backendType = getBackendTypeFromEnvironment();
      expect(backendType).toBe('real');
    });

    it('should throw ConfigurationError for invalid BACKEND_TYPE', () => {
      process.env.BACKEND_TYPE = 'invalid';
      expect(() => getBackendTypeFromEnvironment()).toThrow(ConfigurationError);
      expect(() => getBackendTypeFromEnvironment()).toThrow('Invalid BACKEND_TYPE');
    });
  });

  describe('getCircuitArtifactsPathFromEnvironment', () => {
    it('should return default path "./artifacts/zk"', () => {
      const path = getCircuitArtifactsPathFromEnvironment();
      expect(path).toBe('./artifacts/zk');
    });

    it('should return custom path from CIRCUIT_ARTIFACTS_PATH', () => {
      process.env.CIRCUIT_ARTIFACTS_PATH = '/custom/path/to/artifacts';
      const path = getCircuitArtifactsPathFromEnvironment();
      expect(path).toBe('/custom/path/to/artifacts');
    });
  });

  describe('getManifestPathFromEnvironment', () => {
    it('should return default path "{CIRCUIT_ARTIFACTS_PATH}/manifest.json"', () => {
      const path = getManifestPathFromEnvironment();
      expect(path).toBe('./artifacts/zk/manifest.json');
    });

    it('should use CIRCUIT_ARTIFACTS_PATH for default manifest path', () => {
      process.env.CIRCUIT_ARTIFACTS_PATH = '/custom/artifacts';
      const path = getManifestPathFromEnvironment();
      expect(path).toBe('/custom/artifacts/manifest.json');
    });

    it('should return custom path from MANIFEST_PATH', () => {
      process.env.MANIFEST_PATH = '/custom/manifest.json';
      const path = getManifestPathFromEnvironment();
      expect(path).toBe('/custom/manifest.json');
    });

    it('should prioritize MANIFEST_PATH over CIRCUIT_ARTIFACTS_PATH', () => {
      process.env.CIRCUIT_ARTIFACTS_PATH = '/custom/artifacts';
      process.env.MANIFEST_PATH = '/override/manifest.json';
      const path = getManifestPathFromEnvironment();
      expect(path).toBe('/override/manifest.json');
    });
  });

  describe('getTimeoutFromEnvironment', () => {
    it('should return 5000ms for mock backend by default', () => {
      const timeout = getTimeoutFromEnvironment('mock');
      expect(timeout).toBe(5000);
    });

    it('should return 60000ms for real backend by default', () => {
      const timeout = getTimeoutFromEnvironment('real');
      expect(timeout).toBe(60000);
    });

    it('should return custom timeout from TIMEOUT_MS', () => {
      process.env.TIMEOUT_MS = '30000';
      const timeout = getTimeoutFromEnvironment('mock');
      expect(timeout).toBe(30000);
    });

    it('should throw ConfigurationError for invalid TIMEOUT_MS', () => {
      process.env.TIMEOUT_MS = 'invalid';
      expect(() => getTimeoutFromEnvironment('mock')).toThrow(ConfigurationError);
      expect(() => getTimeoutFromEnvironment('mock')).toThrow('Invalid TIMEOUT_MS');
    });

    it('should throw ConfigurationError for negative TIMEOUT_MS', () => {
      process.env.TIMEOUT_MS = '-1000';
      expect(() => getTimeoutFromEnvironment('mock')).toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for zero TIMEOUT_MS', () => {
      process.env.TIMEOUT_MS = '0';
      expect(() => getTimeoutFromEnvironment('mock')).toThrow(ConfigurationError);
    });
  });

  describe('getVerboseFromEnvironment', () => {
    it('should return false by default', () => {
      const verbose = getVerboseFromEnvironment();
      expect(verbose).toBe(false);
    });

    it('should return true when HARNESS_VERBOSE is "true"', () => {
      process.env.HARNESS_VERBOSE = 'true';
      const verbose = getVerboseFromEnvironment();
      expect(verbose).toBe(true);
    });

    it('should return false when HARNESS_VERBOSE is "false"', () => {
      process.env.HARNESS_VERBOSE = 'false';
      const verbose = getVerboseFromEnvironment();
      expect(verbose).toBe(false);
    });

    it('should return false for any other value', () => {
      process.env.HARNESS_VERBOSE = 'yes';
      const verbose = getVerboseFromEnvironment();
      expect(verbose).toBe(false);
    });
  });

  describe('createConfigFromEnvironment', () => {
    const mockContractClient = {};
    const mockPoolConfig = {
      poolId: 'test-pool',
      denomination: 100_000_000n,
      token: 'test-token',
      treeDepth: 20,
    };

    it('should create config with mock backend by default', async () => {
      const result = await createConfigFromEnvironment({
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.backendType).toBe('mock');
      expect(result.artifactsLoaded).toBe(false);
      expect(result.config.provingBackend).toBeInstanceOf(MockProvingBackend);
      expect(result.config.testConfig.timeout).toBe(5000);
      expect(result.config.testConfig.verbose).toBe(false);
    });

    it('should create config with mock backend when BACKEND_TYPE is "mock"', async () => {
      process.env.BACKEND_TYPE = 'mock';

      const result = await createConfigFromEnvironment({
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.backendType).toBe('mock');
      expect(result.config.provingBackend).toBeInstanceOf(MockProvingBackend);
    });

    it('should use custom timeout from TIMEOUT_MS', async () => {
      process.env.TIMEOUT_MS = '15000';

      const result = await createConfigFromEnvironment({
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.config.testConfig.timeout).toBe(15000);
    });

    it('should enable verbose logging from HARNESS_VERBOSE', async () => {
      process.env.HARNESS_VERBOSE = 'true';

      const result = await createConfigFromEnvironment({
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.config.testConfig.verbose).toBe(true);
    });

    it('should override environment variables with explicit options', async () => {
      process.env.BACKEND_TYPE = 'real';
      process.env.TIMEOUT_MS = '30000';
      process.env.HARNESS_VERBOSE = 'true';

      const result = await createConfigFromEnvironment({
        backendType: 'mock',
        timeoutMs: 10000,
        verbose: false,
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.backendType).toBe('mock');
      expect(result.config.testConfig.timeout).toBe(10000);
      expect(result.config.testConfig.verbose).toBe(false);
    });

    it('should set skipCleanup from options', async () => {
      const result = await createConfigFromEnvironment({
        skipCleanup: true,
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.config.testConfig.skipCleanup).toBe(true);
    });

    it('should throw ConfigurationError for invalid backend type', async () => {
      await expect(
        createConfigFromEnvironment({
          backendType: 'invalid' as BackendType,
          contractClient: mockContractClient,
          poolConfig: mockPoolConfig,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should throw ConfigurationError for invalid timeout', async () => {
      process.env.TIMEOUT_MS = 'invalid';

      await expect(
        createConfigFromEnvironment({
          contractClient: mockContractClient,
          poolConfig: mockPoolConfig,
        })
      ).rejects.toThrow(ConfigurationError);
    });

    it('should include pool config in result', async () => {
      const result = await createConfigFromEnvironment({
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.config.poolConfig).toEqual(mockPoolConfig);
    });

    it('should include contract client in result', async () => {
      const result = await createConfigFromEnvironment({
        contractClient: mockContractClient,
        poolConfig: mockPoolConfig,
      });

      expect(result.config.contractClient).toBe(mockContractClient);
    });

    // Note: Testing real backend requires actual artifact files,
    // which may not be available in the test environment.
    // These tests would be integration tests rather than unit tests.
  });
});
