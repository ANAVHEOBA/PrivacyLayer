/**
 * Contract Integration Tests
 * 
 * This test file demonstrates how the WithdrawHarness integrates with
 * existing contract test infrastructure, using the same patterns as
 * the Rust integration tests in contracts/privacy_pool/src/integration_test.rs
 * 
 * **Validates: Requirements 16.1, 16.2, 16.3, 9.5**
 * 
 * Key Integration Points:
 * - Uses existing contract client patterns
 * - Uses existing test utilities (address generation, balance checking)
 * - Runs alongside existing integration tests
 * - Reports results to the same test runner (Jest/Vitest)
 * 
 * @module contract_integration.test
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WithdrawHarness } from './harness';
import { createConfigFromEnvironment } from './config';
import type { HarnessConfig, PoolConfig } from './types';
import { MockProvingBackend } from './mock_backend';

/**
 * Mock Contract Client
 * 
 * This mock simulates the Soroban contract client interface used in
 * the Rust integration tests. In a real integration, this would be
 * replaced with the actual Stellar SDK contract client.
 * 
 * Mirrors the patterns from contracts/privacy_pool/src/integration_test.rs:
 * - setup() function for environment initialization
 * - Address generation utilities
 * - Token balance checking
 * - Pool state management
 */
class MockContractClient {
  private poolState: Map<string, any> = new Map();
  private tokenBalances: Map<string, bigint> = new Map();
  private spentNullifiers: Map<string, Set<string>> = new Map();

  /**
   * Initialize the contract (mirrors client.initialize(&admin))
   */
  async initialize(admin: string): Promise<void> {
    // Simulate contract initialization
  }

  /**
   * Create a pool (mirrors client.create_pool())
   */
  async createPool(
    poolId: string,
    token: string,
    denomination: bigint,
    verifyingKey: any
  ): Promise<void> {
    this.poolState.set(poolId, {
      token,
      denomination,
      verifyingKey,
      currentRoot: '0'.repeat(64),
      rootHistory: [],
      nextLeafIndex: 0,
      depositCount: 0,
      withdrawalCount: 0,
    });
    this.spentNullifiers.set(poolId, new Set());
  }

  /**
   * Deposit to pool (mirrors client.deposit())
   */
  async deposit(
    poolId: string,
    depositor: string,
    commitment: string
  ): Promise<{ leafIndex: number; root: string }> {
    const state = this.poolState.get(poolId);
    if (!state) {
      throw new Error('Pool not found');
    }

    const leafIndex = state.nextLeafIndex;
    state.nextLeafIndex++;
    state.depositCount++;

    // Generate a new root (simplified)
    const root = Buffer.from(commitment, 'hex')
      .toString('hex')
      .padStart(64, '0');
    state.currentRoot = root;
    state.rootHistory.push(root);

    // Update balances
    const depositorBalance = this.tokenBalances.get(depositor) || 0n;
    this.tokenBalances.set(depositor, depositorBalance - state.denomination);

    return { leafIndex, root };
  }

  /**
   * Withdraw from pool (mirrors client.withdraw())
   */
  async withdraw(
    poolId: string,
    proof: Buffer,
    publicInputs: any
  ): Promise<{ success: boolean; error?: Error }> {
    const state = this.poolState.get(poolId);
    if (!state) {
      return { success: false, error: new Error('Pool not found') };
    }

    // Check if root is known
    if (!state.rootHistory.includes(publicInputs.root)) {
      return { success: false, error: new Error('UnknownRoot') };
    }

    // Check if nullifier is already spent
    const spentNullifiers = this.spentNullifiers.get(poolId)!;
    if (spentNullifiers.has(publicInputs.nullifier_hash)) {
      return { success: false, error: new Error('NullifierAlreadySpent') };
    }

    // Verify proof (simplified - always succeeds for non-zero proofs)
    if (proof.every(byte => byte === 0)) {
      return { success: false, error: new Error('InvalidProof') };
    }

    // Verify pool ID (mirrors contract comparing public input with contract storage)
    if (publicInputs.pool_id !== poolId) {
      return { success: false, error: new Error('PoolIdMismatch') };
    }

    // Verify amount matches denomination
    const amount = BigInt('0x' + publicInputs.amount);
    if (amount !== state.denomination) {
      return { success: false, error: new Error('DenominationMismatch') };
    }

    // Verify fee is less than or equal to amount
    const fee = BigInt('0x' + publicInputs.fee);
    if (fee > amount) {
      return { success: false, error: new Error('FeeExceedsAmount') };
    }

    // Mark nullifier as spent
    spentNullifiers.add(publicInputs.nullifier_hash);
    state.withdrawalCount++;

    // Update balances
    const recipientBalance = this.tokenBalances.get(publicInputs.recipient) || 0n;
    this.tokenBalances.set(publicInputs.recipient, recipientBalance + amount);

    if (publicInputs.relayer && publicInputs.relayer !== '0'.repeat(64)) {
      const relayerBalance = this.tokenBalances.get(publicInputs.relayer) || 0n;
      const fee = BigInt('0x' + publicInputs.fee);
      this.tokenBalances.set(publicInputs.relayer, relayerBalance + fee);
    }

    return { success: true };
  }

  /**
   * Check if root is known (mirrors client.is_known_root())
   */
  async isKnownRoot(poolId: string, root: string): Promise<boolean> {
    const state = this.poolState.get(poolId);
    return state ? state.rootHistory.includes(root) : false;
  }

  /**
   * Check if nullifier is spent (mirrors client.is_spent())
   */
  async isSpent(poolId: string, nullifierHash: string): Promise<boolean> {
    const spentNullifiers = this.spentNullifiers.get(poolId);
    return spentNullifiers ? spentNullifiers.has(nullifierHash) : false;
  }

  /**
   * Get token balance (mirrors token_balance())
   */
  getBalance(address: string): bigint {
    return this.tokenBalances.get(address) || 0n;
  }

  /**
   * Set token balance (for test setup)
   */
  setBalance(address: string, balance: bigint): void {
    this.tokenBalances.set(address, balance);
  }

  /**
   * Get pool state
   */
  getPoolState(poolId: string): any {
    return this.poolState.get(poolId);
  }

  /**
   * Mark nullifier as spent (for testing nullifier failure scenario)
   */
  markNullifierSpent(poolId: string, nullifierHash: string): void {
    const spentNullifiers = this.spentNullifiers.get(poolId);
    if (spentNullifiers) {
      spentNullifiers.add(nullifierHash);
    }
  }
}

/**
 * Test Utilities
 * 
 * Mirrors the utility functions from contracts/privacy_pool/src/integration_test.rs:
 * - Address generation
 * - Commitment generation
 * - Nullifier hash generation
 * - Field element generation
 */
class TestUtilities {
  /**
   * Generate a test address (mirrors Address::generate(&env))
   */
  static generateAddress(seed: string): string {
    return Buffer.from(seed.padEnd(32, '0'), 'utf8')
      .toString('hex')
      .slice(0, 64);
  }

  /**
   * Generate a commitment (mirrors make_commit())
   */
  static makeCommitment(seed: number): string {
    const bytes = Buffer.alloc(32);
    bytes[30] = (seed + 1) & 0xff;
    bytes[31] = seed & 0xff;
    return bytes.toString('hex');
  }

  /**
   * Generate a nullifier hash (mirrors make_nullifier_hash())
   */
  static makeNullifierHash(seed: number): string {
    const bytes = Buffer.alloc(32);
    bytes[31] = (seed + 100) & 0xff;
    return bytes.toString('hex');
  }

  /**
   * Generate a field element (mirrors field())
   */
  static makeField(value: number): string {
    const bytes = Buffer.alloc(32);
    bytes[31] = value & 0xff;
    return bytes.toString('hex');
  }

  /**
   * Generate a pool ID (mirrors make_pool_id())
   */
  static makePoolId(seed: number): string {
    const bytes = Buffer.alloc(32);
    bytes.fill(seed);
    return bytes.toString('hex');
  }
}

/**
 * Setup function
 * 
 * Mirrors the setup() function from contracts/privacy_pool/src/integration_test.rs
 * Returns all necessary test fixtures:
 * - Contract client
 * - Token address
 * - Admin address
 * - Test user addresses (alice, bob)
 * - Pool ID
 */
async function setup(): Promise<{
  client: MockContractClient;
  token: string;
  admin: string;
  alice: string;
  bob: string;
  poolId: string;
}> {
  const client = new MockContractClient();

  // Generate addresses (mirrors Address::generate(&env))
  const token = TestUtilities.generateAddress('token');
  const admin = TestUtilities.generateAddress('admin');
  const alice = TestUtilities.generateAddress('alice');
  const bob = TestUtilities.generateAddress('bob');

  // Generate pool ID (mirrors PoolId(BytesN::from_array(&env, &[7u8; 32])))
  const poolId = TestUtilities.makePoolId(7);

  // Initialize balances (mirrors StellarAssetClient::new(&env, &token_id).mint())
  const DENOM_AMOUNT = 1_000_000_000n; // 100 XLM
  client.setBalance(alice, 200n * DENOM_AMOUNT);
  client.setBalance(bob, 200n * DENOM_AMOUNT);

  // Initialize contract (mirrors client.initialize(&admin))
  await client.initialize(admin);

  // Create pool (mirrors client.create_pool())
  await client.createPool(poolId, token, DENOM_AMOUNT, {});

  return { client, token, admin, alice, bob, poolId };
}

/**
 * Integration Tests
 * 
 * These tests demonstrate how the harness integrates with existing
 * contract test patterns. Each test mirrors a corresponding test from
 * contracts/privacy_pool/src/integration_test.rs
 */
describe('Contract Integration - WithdrawHarness', () => {
  let harness: WithdrawHarness;
  let client: MockContractClient;
  let token: string;
  let admin: string;
  let alice: string;
  let bob: string;
  let poolId: string;

  beforeEach(async () => {
    // Setup test environment (mirrors setup() from integration_test.rs)
    const fixtures = await setup();
    client = fixtures.client;
    token = fixtures.token;
    admin = fixtures.admin;
    alice = fixtures.alice;
    bob = fixtures.bob;
    poolId = fixtures.poolId;

    // Create harness configuration using environment-based config
    // **Validates: Requirement 16.1** - Use existing contract client and environment setup
    const poolConfig: PoolConfig = {
      poolId,
      token,
      denomination: 1_000_000_000n, // 100 XLM
      treeDepth: 20,
    };

    const { config } = await createConfigFromEnvironment({
      backendType: 'mock', // Use mock backend for fast tests
      contractClient: client,
      poolConfig,
      verbose: false,
    });

    harness = new WithdrawHarness(config);
    await harness.setupPool();
  });

  afterEach(async () => {
    // Cleanup harness
    await harness.cleanupPool();
  });

  /**
   * Test: Happy Path Withdrawal
   * 
   * Mirrors test_e2e_deposit_updates_balances from integration_test.rs
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities
   * **Validates: Requirement 16.3** - Run alongside existing integration tests
   */
  it('should execute happy path withdrawal with balance updates', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(1);
    const { leafIndex, root } = await client.deposit(poolId, alice, commitment);

    expect(leafIndex).toBe(0);
    expect(await client.isKnownRoot(poolId, root)).toBe(true);

    // Run happy path test
    const result = await harness.runHappyPath();

    // Verify test passed
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('happy-path');
    expect(result.metrics.totalTime).toBeGreaterThan(0);

    // Verify state changes (mirrors balance checking from integration_test.rs)
    if (result.stateChanges) {
      expect(result.stateChanges.nullifierMarkedSpent).toBe(true);
      expect(result.stateChanges.withdrawalCountIncremented).toBe(true);
    }
  });

  /**
   * Test: Proof Failure
   * 
   * Mirrors proof verification failure scenarios from integration_test.rs
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities
   */
  it('should reject withdrawal with invalid proof', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(2);
    await client.deposit(poolId, alice, commitment);

    // Run proof failure test
    const result = await harness.runProofFailure();

    // Verify test passed (proof was correctly rejected)
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('proof-failure');

    // Verify error classification
    expect(result.errorClassification).toBeDefined();
    expect(result.errorClassification?.category).toBe('proof');
  });

  /**
   * Test: Unknown Root Rejection
   * 
   * Mirrors test_e2e_unknown_root_rejected from integration_test.rs
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities
   */
  it('should reject withdrawal with unknown root', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(3);
    await client.deposit(poolId, alice, commitment);

    // Run root failure test
    const result = await harness.runRootFailure();

    // Verify test passed (root was correctly rejected)
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('root-failure');

    // Verify error classification
    expect(result.errorClassification).toBeDefined();
    expect(result.errorClassification?.category).toBe('root');
  });

  /**
   * Test: Double-Spend Prevention
   * 
   * Mirrors test_e2e_double_spend_rejected_after_manual_spend_mark from integration_test.rs
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities
   */
  it('should reject withdrawal with already-spent nullifier', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(4);
    await client.deposit(poolId, alice, commitment);

    // Run nullifier failure test
    const result = await harness.runNullifierFailure();

    // Verify test passed (nullifier was correctly rejected)
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('nullifier-failure');

    // Verify error classification
    expect(result.errorClassification).toBeDefined();
    expect(result.errorClassification?.category).toBe('nullifier');
  });

  /**
   * Test: Pool ID Mismatch Rejection
   */
  it('should reject withdrawal with mismatched pool ID', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(10);
    await client.deposit(poolId, alice, commitment);

    // Run pool ID mismatch test
    const result = await harness.runPoolIdMismatch();

    // Verify test passed
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('pool-id-mismatch');
    expect(result.errorClassification?.category).toBe('pool_id');
  });

  /**
   * Test: Denomination Mismatch Rejection
   */
  it('should reject withdrawal with mismatched denomination', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(11);
    await client.deposit(poolId, alice, commitment);

    // Run denomination mismatch test
    const result = await harness.runDenominationMismatch();

    // Verify test passed
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('denomination-mismatch');
    expect(result.errorClassification?.category).toBe('denomination');
  });

  /**
   * Test: Fee Validation
   */
  it('should validate withdrawal with custom fee', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(12);
    await client.deposit(poolId, alice, commitment);

    // Run fee validation test
    const result = await harness.runFeeValidation();

    // Verify test passed
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('fee-validation');
  });

  /**
   * Test: Relayer Address Validation
   */
  it('should validate withdrawal with custom relayer', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(13);
    await client.deposit(poolId, alice, commitment);

    // Run relayer address test
    const result = await harness.runRelayerAddress();

    // Verify test passed
    expect(result.passed).toBe(true);
    expect(result.scenario).toBe('relayer-address');
  });


  /**
   * Test: Multiple Deposits Sequential Indices
   * 
   * Mirrors test_e2e_multiple_deposits_sequential_indices from integration_test.rs
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities
   */
  it('should handle multiple deposits with sequential indices', async () => {
    // Deposit multiple commitments (mirrors the pattern from integration_test.rs)
    const { leafIndex: i0, root: r0 } = await client.deposit(
      poolId,
      alice,
      TestUtilities.makeCommitment(1)
    );
    const { leafIndex: i1, root: r1 } = await client.deposit(
      poolId,
      alice,
      TestUtilities.makeCommitment(2)
    );
    const { leafIndex: i2, root: r2 } = await client.deposit(
      poolId,
      bob,
      TestUtilities.makeCommitment(3)
    );

    // Verify sequential indices
    expect(i0).toBe(0);
    expect(i1).toBe(1);
    expect(i2).toBe(2);

    // Verify unique roots
    expect(r0).not.toBe(r1);
    expect(r1).not.toBe(r2);

    // Verify all roots are known
    expect(await client.isKnownRoot(poolId, r0)).toBe(true);
    expect(await client.isKnownRoot(poolId, r1)).toBe(true);
    expect(await client.isKnownRoot(poolId, r2)).toBe(true);

    // Verify deposit count
    const state = client.getPoolState(poolId);
    expect(state.depositCount).toBe(3);
  });

  /**
   * Test: Run All Test Scenarios
   * 
   * Demonstrates running all test scenarios in sequence
   * 
   * **Validates: Requirement 16.3** - Run alongside existing integration tests
   * **Validates: Requirement 9.5** - Report results to same test runner
   */
  it('should run all test scenarios and aggregate results', async () => {
    // Deposit a commitment to establish root history
    const commitment = TestUtilities.makeCommitment(5);
    await client.deposit(poolId, alice, commitment);

    // Run all tests
    const summary = await harness.runAllTests();

    // Verify summary
    expect(summary.totalTests).toBeGreaterThan(0);
    expect(summary.results).toHaveLength(summary.totalTests);
    expect(summary.totalExecutionTime).toBeGreaterThan(0);

    // Verify metrics
    expect(summary.averageProofGenerationTime).toBeGreaterThanOrEqual(0);
    expect(summary.averageContractExecutionTime).toBeGreaterThanOrEqual(0);

    // Verify all scenarios were executed
    const scenarios = summary.results.map(r => r.scenario);
    expect(scenarios).toContain('happy-path');
    expect(scenarios).toContain('proof-failure');
    expect(scenarios).toContain('root-failure');
    expect(scenarios).toContain('nullifier-failure');

    // Log summary for visibility (mirrors test output from integration_test.rs)
    console.log('\n=== Test Summary ===');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Total Execution Time: ${summary.totalExecutionTime}ms`);
    console.log(`Average Proof Generation Time: ${summary.averageProofGenerationTime.toFixed(2)}ms`);
    console.log(`Average Contract Execution Time: ${summary.averageContractExecutionTime.toFixed(2)}ms`);
    console.log('===================\n');
  });

  /**
   * Test: Balance Checking Utilities
   * 
   * Demonstrates using existing balance checking utilities
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities (balance checking)
   */
  it('should use balance checking utilities from existing tests', async () => {
    const DENOM_AMOUNT = 1_000_000_000n; // 100 XLM

    // Check initial balances (mirrors token_balance() from integration_test.rs)
    const aliceInitial = client.getBalance(alice);
    const bobInitial = client.getBalance(bob);

    expect(aliceInitial).toBe(200n * DENOM_AMOUNT);
    expect(bobInitial).toBe(200n * DENOM_AMOUNT);

    // Deposit and check balance change
    const commitment = TestUtilities.makeCommitment(6);
    await client.deposit(poolId, alice, commitment);

    const aliceAfterDeposit = client.getBalance(alice);
    expect(aliceAfterDeposit).toBe(aliceInitial - DENOM_AMOUNT);
  });

  /**
   * Test: Address Generation Utilities
   * 
   * Demonstrates using existing address generation utilities
   * 
   * **Validates: Requirement 16.2** - Use existing test utilities (Address generation)
   */
  it('should use address generation utilities from existing tests', () => {
    // Generate addresses (mirrors Address::generate(&env) from integration_test.rs)
    const addr1 = TestUtilities.generateAddress('user1');
    const addr2 = TestUtilities.generateAddress('user2');
    const addr3 = TestUtilities.generateAddress('user1'); // Same seed

    // Verify addresses are deterministic
    expect(addr1).toBe(addr3);
    expect(addr1).not.toBe(addr2);

    // Verify address format (64 hex characters)
    expect(addr1).toMatch(/^[0-9a-f]{64}$/);
    expect(addr2).toMatch(/^[0-9a-f]{64}$/);
  });
});

/**
 * CI/CD Integration Tests
 * 
 * These tests demonstrate how the harness integrates with CI/CD pipelines
 * using environment-based configuration.
 * 
 * **Validates: Requirement 9.5** - Integrate with existing test suite
 */
describe('CI/CD Integration', () => {
  /**
   * Test: Fast Feedback with Mock Backend
   * 
   * Demonstrates fast CI/CD feedback loop using mock backend
   */
  it('should complete tests quickly with mock backend', async () => {
    const { client, poolId, alice } = await setup();

    const poolConfig: PoolConfig = {
      poolId,
      token: TestUtilities.generateAddress('token'),
      denomination: 1_000_000_000n,
      treeDepth: 20,
    };

    // Create config with mock backend (fast)
    const { config, backendType } = await createConfigFromEnvironment({
      backendType: 'mock',
      timeoutMs: 5000,
      contractClient: client,
      poolConfig,
      verbose: false,
    });

    expect(backendType).toBe('mock');

    const harness = new WithdrawHarness(config);
    await harness.setupPool();

    // Deposit to establish root history
    await client.deposit(poolId, alice, TestUtilities.makeCommitment(1));

    // Run all tests and measure time
    const startTime = Date.now();
    const summary = await harness.runAllTests();
    const totalTime = Date.now() - startTime;

    // Verify tests completed quickly (< 5 seconds)
    expect(totalTime).toBeLessThan(5000);
    expect(summary.totalTests).toBeGreaterThan(0);

    await harness.cleanupPool();
  });

  /**
   * Test: Environment Variable Configuration
   * 
   * Demonstrates configuration via environment variables
   */
  it('should respect environment variable configuration', async () => {
    // Set environment variables
    process.env.BACKEND_TYPE = 'mock';
    process.env.TIMEOUT_MS = '3000';
    process.env.HARNESS_VERBOSE = 'false';

    const { client, poolId } = await setup();

    const poolConfig: PoolConfig = {
      poolId,
      token: TestUtilities.generateAddress('token'),
      denomination: 1_000_000_000n,
      treeDepth: 20,
    };

    // Create config from environment
    const { config, backendType } = await createConfigFromEnvironment({
      contractClient: client,
      poolConfig,
    });

    expect(backendType).toBe('mock');
    expect(config.testConfig.timeout).toBe(3000);
    expect(config.testConfig.verbose).toBe(false);

    // Clean up environment
    delete process.env.BACKEND_TYPE;
    delete process.env.TIMEOUT_MS;
    delete process.env.HARNESS_VERBOSE;
  });
});
