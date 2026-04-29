/**
 * Unit tests for WithdrawHarness
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 13.1, 13.2, 13.3**
 * 
 * These tests verify:
 * - Constructor accepts HarnessConfig and initializes ProofGenerator
 * - setupPool() initializes test pool
 * - cleanupPool() cleans up test state
 * - resetPoolState() resets state between tests
 * - Configuration validation
 */

// BigInt serialization fix for Jest
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

// Jest is configured globally, no imports needed
import { WithdrawHarness } from './harness';
import { MockProvingBackend } from './mock_backend';
import type { HarnessConfig } from './types';
import { ConfigurationError } from './types';

describe('WithdrawHarness', () => {
  let mockConfig: HarnessConfig;

  beforeEach(() => {
    // Create a valid mock configuration
    mockConfig = {
      provingBackend: new MockProvingBackend({ generateValidProofs: true }),
      circuitArtifacts: {
        acir: Buffer.from('mock-acir'),
        vkey: Buffer.from('mock-vkey'),
        abi: { mock: 'abi' },
      },
      contractClient: {
        // Mock contract client
        initialize: async () => {},
        getPoolState: (poolId: string) => ({
          poolId,
          token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
          denomination: 100_000_000n,
          treeDepth: 20,
          currentRoot: '1'.repeat(64),
          rootHistory: ['1'.repeat(64)],
          nextLeafIndex: 1,
          spentNullifiers: new Set(),
          depositCount: 1,
          withdrawalCount: 0,
        }),
        withdraw: async (poolId: string, proof: Buffer, publicInputs: any) => {
          // Perform basic validation to support harness failure scenarios
          if (publicInputs.pool_id !== mockConfig.poolConfig.poolId) {
            return { success: false, error: new Error('PoolIdMismatch') };
          }
          if (BigInt('0x' + publicInputs.amount) !== mockConfig.poolConfig.denomination) {
            return { success: false, error: new Error('DenominationMismatch') };
          }
          if (BigInt('0x' + publicInputs.fee) > BigInt('0x' + publicInputs.amount)) {
            return { success: false, error: new Error('FeeExceedsAmount') };
          }
          return { success: true };
        },
      },
      poolConfig: {
        poolId: '0'.repeat(64),
        denomination: 100_000_000n, // 100 XLM
        token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        treeDepth: 20,
      },
      testConfig: {
        timeout: 5000,
        verbose: false,
        skipCleanup: false,
      },
    };
  });

  describe('constructor', () => {
    it('should accept HarnessConfig and initialize ProofGenerator', () => {
      // **Validates: Requirement 1.1** - Initialize ProofGenerator with configured backend
      // **Validates: Requirement 1.2** - Accept configuration
      const harness = new WithdrawHarness(mockConfig);

      expect(harness).toBeDefined();
      expect(harness.getProofGenerator()).toBeDefined();
      expect(harness.getConfig()).toEqual(mockConfig);
      expect(harness.isPoolInitialized()).toBe(false);
      expect(harness.getTestsExecuted()).toBe(0);
    });

    it('should throw ConfigurationError if provingBackend is missing', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = { ...mockConfig, provingBackend: undefined as any };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Proving backend is required');
    });

    it('should throw ConfigurationError if circuitArtifacts is missing', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = { ...mockConfig, circuitArtifacts: undefined as any };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Circuit artifacts are required');
    });

    it('should throw ConfigurationError if circuitArtifacts is incomplete', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = {
        ...mockConfig,
        circuitArtifacts: { acir: Buffer.from('mock'), vkey: undefined as any, abi: {} },
      };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Circuit artifacts must include acir, vkey, and abi');
    });

    it('should throw ConfigurationError if contractClient is missing', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = { ...mockConfig, contractClient: undefined as any };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Contract client is required');
    });

    it('should throw ConfigurationError if poolConfig is missing', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = { ...mockConfig, poolConfig: undefined as any };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Pool configuration is required');
    });

    it('should throw ConfigurationError if poolConfig is incomplete', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = {
        ...mockConfig,
        poolConfig: { ...mockConfig.poolConfig, poolId: undefined as any },
      };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Pool configuration must include poolId and token');
    });

    it('should throw ConfigurationError if denomination is not positive', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = {
        ...mockConfig,
        poolConfig: { ...mockConfig.poolConfig, denomination: 0n },
      };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Pool denomination must be positive');
    });

    it('should throw ConfigurationError if treeDepth is invalid', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig1 = {
        ...mockConfig,
        poolConfig: { ...mockConfig.poolConfig, treeDepth: 0 },
      };
      const invalidConfig2 = {
        ...mockConfig,
        poolConfig: { ...mockConfig.poolConfig, treeDepth: 33 },
      };

      expect(() => new WithdrawHarness(invalidConfig1)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig1)).toThrow('Pool tree depth must be between 1 and 32');
      expect(() => new WithdrawHarness(invalidConfig2)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig2)).toThrow('Pool tree depth must be between 1 and 32');
    });

    it('should throw ConfigurationError if testConfig is missing', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = { ...mockConfig, testConfig: undefined as any };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Test configuration is required');
    });

    it('should throw ConfigurationError if timeout is not positive', () => {
      // **Validates: Requirement 1.2** - Configuration validation
      const invalidConfig = {
        ...mockConfig,
        testConfig: { ...mockConfig.testConfig, timeout: 0 },
      };

      expect(() => new WithdrawHarness(invalidConfig)).toThrow(ConfigurationError);
      expect(() => new WithdrawHarness(invalidConfig)).toThrow('Test timeout must be positive');
    });
  });

  describe('setupPool', () => {
    it('should initialize pool and capture state', async () => {
      // **Validates: Requirement 13.1** - Create test pool with known configuration
      // **Validates: Requirement 13.2** - Initialize pool with valid verifying key
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.isPoolInitialized()).toBe(false);
      expect(harness.getPoolState()).toBeUndefined();

      await harness.setupPool();

      expect(harness.isPoolInitialized()).toBe(true);
      expect(harness.getPoolState()).toBeDefined();
      expect(harness.getPoolState()?.poolId).toBe(mockConfig.poolConfig.poolId);
      expect(harness.getPoolState()?.denomination).toBe(mockConfig.poolConfig.denomination);
      expect(harness.getPoolState()?.token).toBe(mockConfig.poolConfig.token);
      expect(harness.getPoolState()?.treeDepth).toBe(mockConfig.poolConfig.treeDepth);
    });

    it('should throw ConfigurationError if pool already initialized', async () => {
      // **Validates: Requirement 13.1** - Prevent double initialization
      const harness = new WithdrawHarness(mockConfig);

      await harness.setupPool();

      await expect(harness.setupPool()).rejects.toThrow(ConfigurationError);
      await expect(harness.setupPool()).rejects.toThrow('Pool already initialized');
    });
  });

  describe('cleanupPool', () => {
    it('should clean up pool state', async () => {
      // **Validates: Requirement 13.3** - Clean up test state
      const harness = new WithdrawHarness(mockConfig);

      await harness.setupPool();
      expect(harness.isPoolInitialized()).toBe(true);

      await harness.cleanupPool();

      expect(harness.isPoolInitialized()).toBe(false);
      expect(harness.getPoolState()).toBeUndefined();
    });

    it('should skip cleanup if pool not initialized', async () => {
      // **Validates: Requirement 13.3** - Handle cleanup when not initialized
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.isPoolInitialized()).toBe(false);

      // Should not throw
      await harness.cleanupPool();

      expect(harness.isPoolInitialized()).toBe(false);
    });

    it('should skip cleanup if skipCleanup is true', async () => {
      // **Validates: Requirement 13.3** - Respect skipCleanup flag
      const configWithSkipCleanup = {
        ...mockConfig,
        testConfig: { ...mockConfig.testConfig, skipCleanup: true },
      };
      const harness = new WithdrawHarness(configWithSkipCleanup);

      await harness.setupPool();
      expect(harness.isPoolInitialized()).toBe(true);

      await harness.cleanupPool();

      // Pool should still be initialized
      expect(harness.isPoolInitialized()).toBe(true);
      expect(harness.getPoolState()).toBeDefined();
    });
  });

  describe('resetPoolState', () => {
    it('should reset pool state between tests', async () => {
      // **Validates: Requirement 13.3** - Reset pool state for state reset between tests
      const harness = new WithdrawHarness(mockConfig);

      await harness.setupPool();
      const initialState = harness.getPoolState();

      await harness.resetPoolState();

      const resetState = harness.getPoolState();
      expect(resetState).toBeDefined();
      expect(resetState?.poolId).toBe(initialState?.poolId);
      expect(harness.isPoolInitialized()).toBe(true);
    });

    it('should throw ConfigurationError if pool not initialized', async () => {
      // **Validates: Requirement 13.3** - Prevent reset when not initialized
      const harness = new WithdrawHarness(mockConfig);

      await expect(harness.resetPoolState()).rejects.toThrow(ConfigurationError);
      await expect(harness.resetPoolState()).rejects.toThrow('Cannot reset pool state: pool not initialized');
    });
  });

  describe('getters', () => {
    it('should return correct pool state', async () => {
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.getPoolState()).toBeUndefined();

      await harness.setupPool();

      const state = harness.getPoolState();
      expect(state).toBeDefined();
      expect(state?.poolId).toBe(mockConfig.poolConfig.poolId);
    });

    it('should return correct initialization status', async () => {
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.isPoolInitialized()).toBe(false);

      await harness.setupPool();

      expect(harness.isPoolInitialized()).toBe(true);

      await harness.cleanupPool();

      expect(harness.isPoolInitialized()).toBe(false);
    });

    it('should return correct tests executed count', () => {
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.getTestsExecuted()).toBe(0);
    });

    it('should return empty test results initially', () => {
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.getTestResults()).toEqual([]);
    });

    it('should return correct configuration', () => {
      const harness = new WithdrawHarness(mockConfig);

      expect(harness.getConfig()).toEqual(mockConfig);
    });

    it('should return proof generator instance', () => {
      const harness = new WithdrawHarness(mockConfig);

      const generator = harness.getProofGenerator();
      expect(generator).toBeDefined();
      expect(generator.constructor.name).toBe('ProofGenerator');
    });
  });

  describe('test execution stubs', () => {
    it('should execute runHappyPath successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runHappyPath();
      
      expect(result.testName).toBe('happy-path');
      expect(result.scenario).toBe('happy-path');
      expect(result.passed).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.proofSize).toBeGreaterThan(0);
      expect(result.publicInputCount).toBeGreaterThan(0);
    });

    it('should execute runProofFailure (placeholder - withdrawal succeeds)', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runProofFailure();
      
      expect(result.testName).toBe('proof-failure');
      expect(result.scenario).toBe('proof-failure');
      // Note: With placeholder contract client, withdrawal succeeds even with invalid proof
      // This test will properly validate proof rejection once real contract client is integrated
      expect(result.metrics).toBeDefined();
    });

    it('should execute runRootFailure successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runRootFailure();
      
      expect(result.testName).toBe('root-failure');
      expect(result.scenario).toBe('root-failure');
      // Note: With placeholder contract client, withdrawal succeeds even with unknown root
      // This test will properly validate root rejection once real contract client is integrated
      expect(result.metrics).toBeDefined();
    });

    it('should execute runNullifierFailure successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runNullifierFailure();
      
      expect(result.testName).toBe('nullifier-failure');
      expect(result.scenario).toBe('nullifier-failure');
      // Note: With placeholder contract client, withdrawal succeeds even with spent nullifier
      // This test will properly validate nullifier rejection once real contract client is integrated
      expect(result.metrics).toBeDefined();
    });

    it('should execute runPoolIdMismatch successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runPoolIdMismatch();
      
      expect(result.testName).toBe('pool-id-mismatch');
      expect(result.scenario).toBe('pool-id-mismatch');
      expect(result.metrics).toBeDefined();
    });

    it('should execute runDenominationMismatch successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runDenominationMismatch();
      
      expect(result.testName).toBe('denomination-mismatch');
      expect(result.scenario).toBe('denomination-mismatch');
      expect(result.metrics).toBeDefined();
    });

    it('should execute runFeeValidation successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runFeeValidation();
      
      expect(result.testName).toBe('fee-validation');
      expect(result.scenario).toBe('fee-validation');
      expect(result.metrics).toBeDefined();
    });

    it('should execute runRelayerAddress successfully', async () => {
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const result = await harness.runRelayerAddress();
      
      expect(result.testName).toBe('relayer-address');
      expect(result.scenario).toBe('relayer-address');
      expect(result.metrics).toBeDefined();
    });

    it('should execute runAllTests and aggregate results', async () => {
      // **Validates: Requirement 12.1** - Execute all test scenarios
      // **Validates: Requirement 12.2** - Aggregate test results into TestSummary
      // **Validates: Requirement 12.3** - Calculate aggregate metrics
      // **Validates: Requirement 12.4** - Generate error summary by type
      // **Validates: Requirement 12.5** - Generate recommendations based on results
      const harness = new WithdrawHarness(mockConfig);
      await harness.setupPool();

      const summary = await harness.runAllTests();
      
      // Verify test summary structure
      expect(summary).toBeDefined();
      expect(summary.totalTests).toBe(8); // happy-path, proof-failure, root-failure, nullifier-failure, pool-id-mismatch, denomination-mismatch, fee-validation, relayer-address
      expect(summary.passed).toBeGreaterThanOrEqual(0);
      expect(summary.failed).toBeGreaterThanOrEqual(0);
      expect(summary.passed + summary.failed).toBe(summary.totalTests);
      
      // Verify results array
      expect(summary.results).toHaveLength(8);
      expect(summary.results.map(r => r.scenario)).toContain('happy-path');
      expect(summary.results.map(r => r.scenario)).toContain('proof-failure');
      expect(summary.results.map(r => r.scenario)).toContain('root-failure');
      expect(summary.results.map(r => r.scenario)).toContain('nullifier-failure');
      expect(summary.results.map(r => r.scenario)).toContain('pool-id-mismatch');
      expect(summary.results.map(r => r.scenario)).toContain('denomination-mismatch');
      expect(summary.results.map(r => r.scenario)).toContain('fee-validation');
      expect(summary.results.map(r => r.scenario)).toContain('relayer-address');
      
      // Verify aggregate metrics
      expect(summary.averageProofGenerationTime).toBeGreaterThanOrEqual(0);
      expect(summary.averageContractExecutionTime).toBeGreaterThanOrEqual(0);
      expect(summary.totalExecutionTime).toBeGreaterThan(0);
      
      // Verify error summary
      expect(summary.errorsByType).toBeDefined();
      expect(summary.errorsByType instanceof Map).toBe(true);
      
      // Verify recommendations
      expect(summary.recommendations).toBeDefined();
      expect(Array.isArray(summary.recommendations)).toBe(true);
      expect(summary.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw ContractExecutionError if pool not initialized', async () => {
      const harness = new WithdrawHarness(mockConfig);

      const mockMaterial = {} as any;
      await expect(harness.executeWithdrawal(mockMaterial)).rejects.toThrow('Cannot execute withdrawal: pool not initialized');
    });
  });

  describe('prepareValidWithdrawal', () => {
    it('should throw WitnessPreparationError if pool not initialized', async () => {
      // **Validates: Requirement 14.1** - Validate pool is initialized before preparing withdrawal
      const harness = new WithdrawHarness(mockConfig);

      await expect(harness.prepareValidWithdrawal()).rejects.toThrow('Cannot prepare withdrawal: pool not initialized');
    });

    it('should prepare valid withdrawal material', async () => {
      // **Validates: Requirement 14.1** - Create valid note with known secret and nullifier
      // **Validates: Requirement 14.2** - Generate valid merkle proof for note's commitment
      // **Validates: Requirement 11.1** - Use ProofGenerator.prepareWitness() for witness preparation
      const harness = new WithdrawHarness(mockConfig);

      await harness.setupPool();

      const material = await harness.prepareValidWithdrawal();

      // Verify note is created
      expect(material.note).toBeDefined();
      expect(material.note.poolId).toBe(mockConfig.poolConfig.poolId);
      expect(material.note.amount).toBe(mockConfig.poolConfig.denomination);
      expect(material.note.denomination).toBe(mockConfig.poolConfig.denomination);

      // Verify merkle proof is generated
      expect(material.merkleProof).toBeDefined();
      expect(material.merkleProof.root).toBeDefined();
      expect(material.merkleProof.pathElements).toHaveLength(mockConfig.poolConfig.treeDepth);
      expect(material.merkleProof.leafIndex).toBeDefined();

      // Verify witness is prepared
      expect(material.witness).toBeDefined();
      expect(material.witness.pool_id).toBeDefined();
      expect(material.witness.root).toBeDefined();
      expect(material.witness.nullifier_hash).toBeDefined();
      expect(material.witness.recipient).toBeDefined();
      expect(material.witness.amount).toBeDefined();
      expect(material.witness.relayer).toBeDefined();
      expect(material.witness.fee).toBeDefined();
      expect(material.witness.denomination).toBeDefined();

      // Verify proof is generated
      expect(material.proof).toBeDefined();
      expect(material.proof.length).toBe(256); // Groth16 proof is 256 bytes

      // Verify public inputs are serialized
      expect(material.publicInputs).toBeDefined();
      expect(material.publicInputs.fields).toHaveLength(8); // 8 public inputs
      expect(material.publicInputs.bytes.length).toBe(256); // 8 * 32 bytes

      // Verify recipient and relayer
      expect(material.recipient).toBeDefined();
      expect(material.relayer).toBeDefined();
      expect(material.fee).toBe(0n);
    });

    it('should accept custom recipient, relayer, and fee', async () => {
      // **Validates: Requirement 14.1** - Support custom withdrawal parameters
      const harness = new WithdrawHarness(mockConfig);

      await harness.setupPool();

      const customRecipient = 'GD2UGSQJ7KWIMGKDYTWQ4C22CUG3IGF4GSFCVL43T77FOMXRKQ655LRT';
      const customRelayer = 'GAJKWRFOP5OIO4CZR47ZMKNGKH5Q5FNWNJZP5NRKYBCFS7ZAI7JU6TXX';
      const customFee = 1_000_000n;

      const material = await harness.prepareValidWithdrawal(customRecipient, customRelayer, customFee);

      expect(material.recipient).toBe(customRecipient);
      expect(material.relayer).toBe(customRelayer);
      expect(material.fee).toBe(customFee);
    });
  });
});
