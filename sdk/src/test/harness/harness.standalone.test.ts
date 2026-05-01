import { describe, it, expect } from '@jest/globals';
import { WithdrawHarness } from './harness';
import { MockProvingBackend } from './mock_backend';
import type { HarnessConfig } from './types';

describe('WithdrawHarness Standalone', () => {
  const createMockConfig = (): HarnessConfig => ({
    provingBackend: new MockProvingBackend({ generateValidProofs: true }),
    circuitArtifacts: {
      acir: Buffer.from('mock-acir'),
      vkey: Buffer.from('mock-vkey'),
      abi: { mock: 'abi' },
    },
    contractClient: {
      initialize: async () => {},
      getPoolState: (poolId: string) => ({
        poolId,
        token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        denomination: 100_000_000n,
        treeDepth: 20,
        currentRoot: '0'.repeat(64),
        rootHistory: [],
        nextLeafIndex: 0,
        spentNullifiers: new Set(),
        depositCount: 0,
        withdrawalCount: 0,
      }),
    },
    poolConfig: {
      poolId: '0'.repeat(64),
      denomination: 100_000_000n,
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      treeDepth: 20,
    },
    testConfig: {
      timeout: 5000,
      verbose: false,
      skipCleanup: false,
    },
  });

  it('should accept HarnessConfig and initialize ProofGenerator', () => {
    const config = createMockConfig();
    const harness = new WithdrawHarness(config);
    
    expect(harness).toBeDefined();
    expect(harness.getProofGenerator()).toBeDefined();
    expect(harness.isPoolInitialized()).toBe(false);
    expect(harness.getTestsExecuted()).toBe(0);
  });

  it('should initialize pool and capture state', async () => {
    const config = createMockConfig();
    const harness = new WithdrawHarness(config);
    await harness.setupPool();
    
    expect(harness.isPoolInitialized()).toBe(true);
    expect(harness.getPoolState()).toBeDefined();
  });

  it('should clean up pool state', async () => {
    const config = createMockConfig();
    const harness = new WithdrawHarness(config);
    await harness.setupPool();
    await harness.cleanupPool();
    
    expect(harness.isPoolInitialized()).toBe(false);
    expect(harness.getPoolState()).toBeUndefined();
  });

  it('should reset pool state between tests', async () => {
    const config = createMockConfig();
    const harness = new WithdrawHarness(config);
    await harness.setupPool();
    await harness.resetPoolState();
    
    expect(harness.isPoolInitialized()).toBe(true);
    expect(harness.getPoolState()).toBeDefined();
  });

  it('should throw ConfigurationError for invalid config', () => {
    const invalidConfig = {
      ...createMockConfig(),
      provingBackend: undefined as any,
    };

    expect(() => new WithdrawHarness(invalidConfig)).toThrow();
  });
});
