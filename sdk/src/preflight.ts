import { Note } from './note';

/**
 * Pool metadata fetched from on-chain contract storage.
 */
export interface PoolMetadata {
  poolId: string;
  denomination: string;
  paused: boolean;
  verifierAddress: string;
  verifierCodeHash: string;
  minDepositAmount?: bigint;
  maxDepositAmount?: bigint;
}

/**
 * Stable error codes for preflight validation failures.
 * Allows callers to distinguish between different failure modes.
 */
export type PreflightErrorCode =
  | 'POOL_NOT_FOUND'
  | 'DENOMINATION_MISMATCH'
  | 'POOL_PAUSED'
  | 'STALE_VERIFIER_METADATA'
  | 'VERIFIER_NOT_FOUND'
  | 'AMOUNT_OUT_OF_BOUNDS'
  | 'FETCH_FAILED'
  | 'INVALID_POOL_ID';

/**
 * Thrown when pool metadata validation fails before deposit or withdraw.
 * Includes stable error code to allow programmatic error handling.
 */
export class PreflightError extends Error {
  constructor(
    message: string,
    public readonly code: PreflightErrorCode,
    public readonly poolId?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PreflightError';
  }
}

/**
 * OnChainPoolFetcher abstracts reading pool metadata from the contract.
 * Implementations handle RPC calls, caching, and network error resilience.
 */
export interface OnChainPoolFetcher {
  /**
   * Fetch pool metadata by ID from the on-chain contract.
   * @throws PreflightError if pool not found or fetch fails
   */
  fetchPoolMetadata(poolId: string): Promise<PoolMetadata>;

  /**
   * Fetch the current verifier code hash or address for a given denomination.
   * Used to validate that local artifacts match on-chain state.
   */
  fetchVerifierMetadata(
    denomination: string,
  ): Promise<{ address: string; codeHash: string }>;
}

/**
 * ArtifactValidator checks that local SDK artifacts match on-chain expectations.
 */
export interface ArtifactValidator {
  /**
   * Validate that a denomination's local verifier artifact matches the on-chain verifier.
   * @returns true if verifier matches; false if stale or missing.
   */
  validateVerifierArtifact(
    denomination: string,
    onChainCodeHash: string,
  ): boolean;

  /**
   * Get the expected denomination from a local artifact.
   * Returns undefined if artifact not found.
   */
  getDenominationForArtifact(artifactId: string): string | undefined;
}

/**
 * Preflight validation result on success.
 */
export interface PreflightValidationResult {
  poolId: string;
  poolMetadata: PoolMetadata;
  isValid: true;
}

/**
 * Pool preflight validator orchestrates on-chain metadata fetch and local artifact validation.
 * Run before deposit or withdraw to ensure pool state is safe and consistent.
 */
export class PoolPreflightValidator {
  constructor(
    private fetcher: OnChainPoolFetcher,
    private artifactValidator: ArtifactValidator,
  ) {}

  /**
   * Validate pool metadata before a deposit operation.
   *
   * Checks:
   * - Pool exists on-chain
   * - Pool denomination matches the note
   * - Pool is not paused
   * - Local verifier artifact matches on-chain verifier
   * - Amount is within pool bounds (if defined)
   *
   * @param poolId Pool identifier
   * @param note Note with amount and denomination expectations
   * @throws PreflightError with stable code on any validation failure
   */
  async validateDepositPreflight(
    poolId: string,
    note: Note,
  ): Promise<PreflightValidationResult> {
    if (!poolId || typeof poolId !== 'string' || poolId.trim().length === 0) {
      throw new PreflightError(
        'Invalid pool ID: must be a non-empty string',
        'INVALID_POOL_ID',
        poolId,
      );
    }

    // Fetch on-chain pool metadata
    let poolMetadata: PoolMetadata;
    try {
      poolMetadata = await this.fetcher.fetchPoolMetadata(poolId);
    } catch (error) {
      if (error instanceof PreflightError && error.code === 'POOL_NOT_FOUND') {
        throw error;
      }
      throw new PreflightError(
        `Failed to fetch pool metadata for ${poolId}: ${error instanceof Error ? error.message : String(error)}`,
        'FETCH_FAILED',
        poolId,
        { originalError: error },
      );
    }

    // Check pool existence
    if (!poolMetadata) {
      throw new PreflightError(
        `Pool not found on-chain: ${poolId}`,
        'POOL_NOT_FOUND',
        poolId,
      );
    }

    // Check denomination matches note
    if (poolMetadata.denomination !== note.poolId) {
      throw new PreflightError(
        `Denomination mismatch: pool uses ${poolMetadata.denomination}, note specifies ${note.poolId}`,
        'DENOMINATION_MISMATCH',
        poolId,
        {
          expectedDenomination: poolMetadata.denomination,
          noteDenomination: note.poolId,
        },
      );
    }

    // Check pool is not paused
    if (poolMetadata.paused) {
      throw new PreflightError(
        `Pool is paused and not accepting deposits: ${poolId}`,
        'POOL_PAUSED',
        poolId,
      );
    }

    // Check amount bounds if defined
    if (
      poolMetadata.minDepositAmount &&
      note.amount < poolMetadata.minDepositAmount
    ) {
      throw new PreflightError(
        `Deposit amount below minimum: ${note.amount} < ${poolMetadata.minDepositAmount}`,
        'AMOUNT_OUT_OF_BOUNDS',
        poolId,
        {
          amount: note.amount.toString(),
          minAmount: poolMetadata.minDepositAmount.toString(),
        },
      );
    }

    if (
      poolMetadata.maxDepositAmount &&
      note.amount > poolMetadata.maxDepositAmount
    ) {
      throw new PreflightError(
        `Deposit amount exceeds maximum: ${note.amount} > ${poolMetadata.maxDepositAmount}`,
        'AMOUNT_OUT_OF_BOUNDS',
        poolId,
        {
          amount: note.amount.toString(),
          maxAmount: poolMetadata.maxDepositAmount.toString(),
        },
      );
    }

    // Validate verifier artifact matches on-chain state
    await this.validateVerifierMetadata(
      poolMetadata.denomination,
      poolMetadata.verifierCodeHash,
    );

    return {
      poolId,
      poolMetadata,
      isValid: true,
    };
  }

  /**
   * Validate pool metadata before a withdrawal operation.
   *
   * Checks:
   * - Pool exists on-chain
   * - Pool denomination matches the note
   * - Pool is not paused
   * - Local verifier artifact matches on-chain verifier
   *
   * @param poolId Pool identifier
   * @param note Note with denomination expectations
   * @throws PreflightError with stable code on any validation failure
   */
  async validateWithdrawalPreflight(
    poolId: string,
    note: Note,
  ): Promise<PreflightValidationResult> {
    if (!poolId || typeof poolId !== 'string' || poolId.trim().length === 0) {
      throw new PreflightError(
        'Invalid pool ID: must be a non-empty string',
        'INVALID_POOL_ID',
        poolId,
      );
    }

    // Fetch on-chain pool metadata
    let poolMetadata: PoolMetadata;
    try {
      poolMetadata = await this.fetcher.fetchPoolMetadata(poolId);
    } catch (error) {
      if (error instanceof PreflightError && error.code === 'POOL_NOT_FOUND') {
        throw error;
      }
      throw new PreflightError(
        `Failed to fetch pool metadata for ${poolId}: ${error instanceof Error ? error.message : String(error)}`,
        'FETCH_FAILED',
        poolId,
        { originalError: error },
      );
    }

    // Check pool existence
    if (!poolMetadata) {
      throw new PreflightError(
        `Pool not found on-chain: ${poolId}`,
        'POOL_NOT_FOUND',
        poolId,
      );
    }

    // Check denomination matches note
    if (poolMetadata.denomination !== note.poolId) {
      throw new PreflightError(
        `Denomination mismatch: pool uses ${poolMetadata.denomination}, note specifies ${note.poolId}`,
        'DENOMINATION_MISMATCH',
        poolId,
        {
          expectedDenomination: poolMetadata.denomination,
          noteDenomination: note.poolId,
        },
      );
    }

    // Check pool is not paused
    if (poolMetadata.paused) {
      throw new PreflightError(
        `Pool is paused and not accepting withdrawals: ${poolId}`,
        'POOL_PAUSED',
        poolId,
      );
    }

    // Validate verifier artifact matches on-chain state
    await this.validateVerifierMetadata(
      poolMetadata.denomination,
      poolMetadata.verifierCodeHash,
    );

    return {
      poolId,
      poolMetadata,
      isValid: true,
    };
  }

  /**
   * Private helper to validate that local verifier artifact matches on-chain verifier.
   * @throws PreflightError if artifact is stale or missing
   */
  private async validateVerifierMetadata(
    denomination: string,
    onChainCodeHash: string,
  ): Promise<void> {
    try {
      // Check if local artifact validates against on-chain code hash
      const isValid = this.artifactValidator.validateVerifierArtifact(
        denomination,
        onChainCodeHash,
      );

      if (!isValid) {
        throw new PreflightError(
          `Verifier artifact mismatch for denomination ${denomination}: local artifact does not match on-chain verifier (code hash: ${onChainCodeHash})`,
          'STALE_VERIFIER_METADATA',
          denomination,
          { onChainCodeHash },
        );
      }
    } catch (error) {
      if (error instanceof PreflightError) {
        throw error;
      }
      throw new PreflightError(
        `Failed to validate verifier metadata for ${denomination}: ${error instanceof Error ? error.message : String(error)}`,
        'VERIFIER_NOT_FOUND',
        denomination,
        { originalError: error },
      );
    }
  }
}

/**
 * Create a preflight validator with standard implementations.
 * Intended for SDK initialization.
 *
 * @param fetcher Implementation of on-chain pool metadata fetching
 * @param artifactValidator Implementation of local artifact validation
 * @returns Configured PoolPreflightValidator
 */
export function createPoolPreflightValidator(
  fetcher: OnChainPoolFetcher,
  artifactValidator: ArtifactValidator,
): PoolPreflightValidator {
  return new PoolPreflightValidator(fetcher, artifactValidator);
}
