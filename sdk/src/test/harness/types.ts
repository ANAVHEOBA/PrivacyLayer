/**
 * Core types and interfaces for the Contract-Facing Withdraw Proof Harness
 * 
 * This module defines the foundational types used throughout the harness implementation,
 * including configuration, test results, withdrawal materials, and error handling.
 */

import { ProvingBackend } from '../../backends';
import { PreparedWitness } from '../../proof';
import { SerializedWithdrawalPublicInputs } from '../../public_inputs';
import { Note } from '../../note';
import { MerkleProof } from '../../proof';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Pool configuration for the test harness
 */
export interface PoolConfig {
  /** Unique identifier for the pool */
  poolId: string;
  /** Fixed denomination for deposits/withdrawals */
  denomination: bigint;
  /** Token address */
  token: string;
  /** Merkle tree depth */
  treeDepth: number;
}

/**
 * Test execution configuration
 */
export interface TestConfig {
  /** Timeout for test execution in milliseconds */
  timeout: number;
  /** Enable verbose logging */
  verbose: boolean;
  /** Skip cleanup after tests */
  skipCleanup: boolean;
}

/**
 * Circuit artifacts required for proof generation
 */
export interface CircuitArtifacts {
  /** ACIR bytecode */
  acir: Buffer;
  /** Verification key */
  vkey: Buffer;
  /** Circuit ABI */
  abi: Record<string, any>;
  /** Optional bytecode string (for NoirBackend) */
  bytecode?: string;
  /** Optional circuit name (for NoirBackend) */
  name?: string;
}

/**
 * Main configuration for the withdraw harness
 */
export interface HarnessConfig {
  /** Proving backend (mock or real) */
  provingBackend: ProvingBackend;
  /** Optional verifying backend for off-chain verification */
  verifyingBackend?: any; // TODO: Define VerifyingBackend interface
  /** Circuit artifacts */
  circuitArtifacts: CircuitArtifacts;
  /** Contract client for interacting with the privacy pool */
  contractClient: any; // TODO: Define PrivacyPoolClient interface
  /** Pool configuration */
  poolConfig: PoolConfig;
  /** Test configuration */
  testConfig: TestConfig;
  /** Optional manifest for artifact validation (used with NoirBackend) */
  manifest?: any; // ZkArtifactManifest from noir.ts
  /** Optional circuit name for manifest validation (used with NoirBackend) */
  circuitName?: string;
}

// ============================================================================
// Withdrawal Material Types
// ============================================================================

/**
 * Complete material required for a withdrawal test
 */
export interface WithdrawalMaterial {
  /** Note being withdrawn */
  note: Note;
  /** Merkle proof for the note's commitment */
  merkleProof: MerkleProof;
  /** Recipient address */
  recipient: string;
  /** Optional relayer address */
  relayer?: string;
  /** Optional fee amount */
  fee?: bigint;
  /** Prepared witness for proof generation */
  witness: PreparedWitness;
  /** Generated proof */
  proof: Buffer;
  /** Serialized public inputs */
  publicInputs: SerializedWithdrawalPublicInputs;
  /** Timing information */
  timing?: {
    /** Witness preparation time in milliseconds */
    witnessPreparationTime: number;
    /** Proof generation time in milliseconds */
    proofGenerationTime: number;
  };
}

/**
 * Context for a withdrawal test scenario
 */
export interface WithdrawalContext {
  /** Pool state snapshot */
  poolState: PoolState;
  /** Note being withdrawn */
  note: Note;
  /** Merkle proof for the note's commitment */
  merkleProof: MerkleProof;
  /** Recipient address */
  recipient: string;
  /** Optional relayer address */
  relayer?: string;
  /** Optional fee amount */
  fee?: bigint;
  /** Expected recipient balance after withdrawal */
  expectedRecipientBalance: bigint;
  /** Expected relayer balance after withdrawal */
  expectedRelayerBalance: bigint;
  /** Expected nullifier spent status */
  expectedNullifierSpent: boolean;
}

/**
 * Pool state snapshot
 */
export interface PoolState {
  /** Pool identifier */
  poolId: string;
  /** Token address */
  token: string;
  /** Fixed denomination */
  denomination: bigint;
  /** Merkle tree depth */
  treeDepth: number;
  /** Current merkle root */
  currentRoot: string;
  /** Root history */
  rootHistory: string[];
  /** Next leaf index */
  nextLeafIndex: number;
  /** Spent nullifiers (hex-encoded) */
  spentNullifiers: Set<string>;
  /** Total deposit count */
  depositCount: number;
  /** Total withdrawal count */
  withdrawalCount: number;
}

// ============================================================================
// Test Result Types
// ============================================================================

/**
 * Test scenario types
 */
export type TestScenario =
  | 'happy-path'
  | 'proof-failure'
  | 'root-failure'
  | 'nullifier-failure'
  | 'pool-id-mismatch'
  | 'denomination-mismatch'
  | 'fee-validation'
  | 'relayer-address';

/**
 * Performance metrics for a test execution
 */
export interface TestMetrics {
  /** Witness preparation time in milliseconds */
  witnessPreparationTime: number;
  /** Proof generation time in milliseconds */
  proofGenerationTime: number;
  /** Contract execution time in milliseconds */
  contractExecutionTime: number;
  /** Total execution time in milliseconds */
  totalTime: number;
}

/**
 * State changes observed during withdrawal
 */
export interface StateChanges {
  /** Whether nullifier was marked as spent */
  nullifierMarkedSpent: boolean;
  /** Recipient balance change */
  recipientBalanceChange: bigint;
  /** Relayer balance change */
  relayerBalanceChange: bigint;
  /** Whether withdrawal count was incremented */
  withdrawalCountIncremented: boolean;
}

/**
 * Result of a single test execution
 */
export interface TestResult {
  /** Test name */
  testName: string;
  /** Test scenario type */
  scenario: TestScenario;
  /** Whether the test passed */
  passed: boolean;
  /** Error if test failed */
  error?: Error;
  /** Performance metrics */
  metrics: TestMetrics;
  /** Proof size in bytes */
  proofSize: number;
  /** Number of public inputs */
  publicInputCount: number;
  /** State changes (if applicable) */
  stateChanges?: StateChanges;
  /** Error classification (for failure scenarios) */
  errorClassification?: any; // Will be ClassifiedError from errors.ts
}

/**
 * Performance statistics for a set of measurements
 */
export interface PerformanceStats {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Average (mean) value */
  average: number;
  /** Median (p50) value */
  median: number;
  /** 95th percentile value */
  p95: number;
  /** 99th percentile value */
  p99: number;
  /** Total number of samples */
  sampleCount: number;
}

/**
 * Backend performance comparison
 */
export interface BackendPerformanceComparison {
  /** Backend type (mock or real) */
  backendType: 'mock' | 'real' | 'unknown';
  /** Proof generation statistics */
  proofGeneration: PerformanceStats;
  /** Contract execution statistics */
  contractExecution: PerformanceStats;
  /** Total execution statistics */
  totalExecution: PerformanceStats;
}

/**
 * Summary of all test executions
 */
export interface TestSummary {
  /** Total number of tests */
  totalTests: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Individual test results */
  results: TestResult[];
  /** Average proof generation time in milliseconds */
  averageProofGenerationTime: number;
  /** Average contract execution time in milliseconds */
  averageContractExecutionTime: number;
  /** Total execution time in milliseconds */
  totalExecutionTime: number;
  /** Errors grouped by type */
  errorsByType: Map<string, number>;
  /** Recommendations for optimization */
  recommendations: string[];
  /** Performance statistics for proof generation */
  proofGenerationStats?: PerformanceStats;
  /** Performance statistics for contract execution */
  contractExecutionStats?: PerformanceStats;
  /** Backend performance comparison */
  backendPerformance?: BackendPerformanceComparison;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for harness errors
 */
export type HarnessErrorCode =
  | 'WITNESS_PREPARATION_ERROR'
  | 'PROOF_GENERATION_ERROR'
  | 'PROOF_VERIFICATION_ERROR'
  | 'CONTRACT_EXECUTION_ERROR'
  | 'STATE_VALIDATION_ERROR'
  | 'CONFIGURATION_ERROR';

/**
 * Base error class for harness errors
 */
export class HarnessError extends Error {
  constructor(
    message: string,
    public readonly code: HarnessErrorCode,
    public readonly context?: any,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'HarnessError';
    
    // Maintain proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HarnessError);
    }
  }
}

/**
 * Error during witness preparation
 */
export class WitnessPreparationError extends HarnessError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'WITNESS_PREPARATION_ERROR', context, cause);
    this.name = 'WitnessPreparationError';
  }
}

/**
 * Error during proof generation
 */
export class ProofGenerationError extends HarnessError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'PROOF_GENERATION_ERROR', context, cause);
    this.name = 'ProofGenerationError';
  }
}

/**
 * Error during proof verification
 */
export class ProofVerificationError extends HarnessError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'PROOF_VERIFICATION_ERROR', context, cause);
    this.name = 'ProofVerificationError';
  }
}

/**
 * Error during contract execution
 */
export class ContractExecutionError extends HarnessError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'CONTRACT_EXECUTION_ERROR', context, cause);
    this.name = 'ContractExecutionError';
  }
}

/**
 * Error during state validation
 */
export class StateValidationError extends HarnessError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'STATE_VALIDATION_ERROR', context, cause);
    this.name = 'StateValidationError';
  }
}

/**
 * Error in harness configuration
 */
export class ConfigurationError extends HarnessError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', context, cause);
    this.name = 'ConfigurationError';
  }
}

// ============================================================================
// Error Classification Types
// ============================================================================

/**
 * Contract error types
 */
export type ContractErrorType =
  | 'proof'
  | 'root'
  | 'nullifier'
  | 'pool-id'
  | 'denomination'
  | 'unknown';

/**
 * Classified contract error
 */
export interface ClassifiedError {
  /** Error type */
  type: ContractErrorType;
  /** Error message */
  message: string;
  /** Actionable guidance */
  actionable: string;
}

/**
 * Detailed error report
 */
export interface ErrorReport {
  /** Error type name */
  errorType: string;
  /** Error code */
  errorCode: string;
  /** Error message */
  message: string;
  /** Stack trace */
  stackTrace?: string;
  /** Test scenario */
  testScenario: string;
  /** Redacted witness (for debugging) */
  witness?: string;
  /** Proof bytes (hex-encoded) */
  proof?: string;
  /** Public inputs (hex-encoded) */
  publicInputs?: string[];
  /** Actionable guidance */
  actionable: string;
  /** Recommendations */
  recommendations: string[];
}

// ============================================================================
// Withdrawal Result Types
// ============================================================================

/**
 * Result of a withdrawal execution
 */
export interface WithdrawalResult {
  /** Whether the withdrawal succeeded */
  success: boolean;
  /** Error if withdrawal failed */
  error?: Error;
  /** Transaction hash (if successful) */
  transactionHash?: string;
  /** Gas used */
  gasUsed?: bigint;
  /** State changes */
  stateChanges?: StateChanges;
}
