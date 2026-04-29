/**
 * Error Classification Utilities
 * 
 * Provides utilities for classifying contract errors into actionable categories
 * and generating diagnostic reports for debugging.
 * 
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
 * 
 * Key Responsibilities:
 * - Classify contract errors by type (proof, root, nullifier, etc.)
 * - Generate actionable error messages with context
 * - Provide debugging recommendations
 * - Format error reports for test output
 * 
 * @module errors
 */

/**
 * Error category classification
 * 
 * **Validates: Requirement 10.1** - Distinguish between proof failure,
 * root failure, and nullifier failure
 */
export enum ErrorCategory {
  /** Proof verification failed - invalid proof or malformed proof */
  PROOF_FAILURE = 'PROOF_FAILURE',
  
  /** Root not found in pool's root history */
  ROOT_FAILURE = 'ROOT_FAILURE',
  
  /** Nullifier already spent - double-spend attempt */
  NULLIFIER_FAILURE = 'NULLIFIER_FAILURE',
  
  /** Pool ID mismatch between witness and contract */
  POOL_ID_MISMATCH = 'POOL_ID_MISMATCH',
  
  /** Denomination mismatch between witness and pool */
  DENOMINATION_MISMATCH = 'DENOMINATION_MISMATCH',
  
  /** Fee validation error */
  FEE_ERROR = 'FEE_ERROR',
  
  /** Recipient address validation error */
  RECIPIENT_ERROR = 'RECIPIENT_ERROR',
  
  /** Pool state error (paused, not initialized, etc.) */
  POOL_STATE_ERROR = 'POOL_STATE_ERROR',
  
  /** Verifying key error */
  VERIFYING_KEY_ERROR = 'VERIFYING_KEY_ERROR',
  
  /** Schema version mismatch */
  SCHEMA_VERSION_ERROR = 'SCHEMA_VERSION_ERROR',
  
  /** Unknown or unclassified error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Contract error codes from contracts/privacy_pool/src/types/errors.rs
 */
export enum ContractErrorCode {
  // Initialization
  AlreadyInitialized = 1,
  NotInitialized = 2,
  
  // Access Control
  UnauthorizedAdmin = 10,
  
  // Pool State
  PoolPaused = 20,
  TreeFull = 21,
  PoolNotFound = 22,
  
  // Deposit
  WrongAmount = 30,
  ZeroCommitment = 31,
  
  // Withdrawal
  UnknownRoot = 40,
  NullifierAlreadySpent = 41,
  InvalidProof = 42,
  FeeExceedsAmount = 43,
  InvalidRelayerFee = 44,
  ZeroRelayerRecipientMismatch = 45,
  InvalidRecipient = 46,
  InvalidPoolId = 47,
  InvalidDenomination = 48,
  
  // Verifying Key
  NoVerifyingKey = 50,
  MalformedVerifyingKey = 51,
  
  // Proof Format
  MalformedProofA = 60,
  MalformedProofB = 61,
  MalformedProofC = 62,
  
  // BN254 Arithmetic
  PointNotOnCurve = 70,
  PairingFailed = 71,
  
  // Schema Versioning
  InvalidSchemaVersion = 80,
  SchemaVersionMismatch = 81,
}

/**
 * Classified error with category and actionable message
 * 
 * **Validates: Requirement 10.2** - Generate actionable error messages
 */
export interface ClassifiedError {
  /** Error category */
  category: ErrorCategory;
  
  /** Original error message */
  originalMessage: string;
  
  /** Contract error code (if available) */
  errorCode?: ContractErrorCode;
  
  /** Actionable error message for debugging */
  actionableMessage: string;
  
  /** Debugging recommendations */
  recommendations: string[];
  
  /** Relevant context for debugging */
  context: Record<string, any>;
}

/**
 * Error report for test output
 * 
 * **Validates: Requirement 10.4** - Format error reports
 */
export interface ErrorReport {
  /** Classified error */
  error: ClassifiedError;
  
  /** Error context */
  context: ErrorContext;
  
  /** Formatted report text */
  reportText: string;
}

/**
 * Context for error classification and debugging
 */
export interface ErrorContext {
  /** Pool ID */
  poolId?: string;
  /** Nullifier hash */
  nullifierHash?: string;
  /** Merkle root */
  root?: string;
  /** Recipient address */
  recipient?: string;
  /** Relayer address */
  relayer?: string;
  /** Fee amount */
  fee?: bigint;
  /** Denomination */
  denomination?: bigint;
  /** Any additional context */
  [key: string]: any;
}

/**
 * Classifies a contract error into an actionable category
 * 
 * **Validates: Requirement 10.1** - Distinguish between error types
 * **Validates: Requirement 10.3** - Provide debugging context
 * 
 * @param error Error from contract execution
 * @param context Error context for additional debugging info
 * @returns Classified error with actionable message and recommendations
 */
export function classifyContractError(
  error: Error,
  context?: ErrorContext
): { category: string; type: string; message: string; actionableMessage: string; recommendations: string[]; originalMessage: string; errorCode?: number; context: Record<string, any> } {
  const errorMessage = error.message.toLowerCase();
  const errorCode = extractErrorCode(error);
  
  // Classify by error code first (most reliable)
  if (errorCode !== undefined) {
    const classified = classifyByErrorCode(errorCode, error, context);
    // Convert ErrorCategory enum to lowercase string for compatibility
    const categoryString = classified.category.toLowerCase().replace('_failure', '').replace('_mismatch', '').replace('_error', '');
    return {
      ...classified,
      category: categoryString,
      type: categoryString,
      message: classified.originalMessage,
    };
  }
  
  // Fallback to message-based classification
  const classified = classifyByMessage(errorMessage, error, context);
  const categoryString = classified.category.toLowerCase().replace('_failure', '').replace('_mismatch', '').replace('_error', '');
  return {
    ...classified,
    category: categoryString,
    type: categoryString,
    message: classified.originalMessage,
  };
}

/**
 * Extracts contract error code from error message or object
 * 
 * @param error Error object
 * @returns Contract error code or undefined
 */
function extractErrorCode(error: Error): ContractErrorCode | undefined {
  // Try to extract error code from error message
  // Format: "Error(42)" or "Contract error: 42"
  const codeMatch = error.message.match(/(?:Error\(|error:\s*)(\d+)/i);
  if (codeMatch) {
    const code = parseInt(codeMatch[1], 10);
    if (Object.values(ContractErrorCode).includes(code)) {
      return code as ContractErrorCode;
    }
  }
  
  // Try to extract from error object properties
  if ('code' in error && typeof (error as any).code === 'number') {
    const code = (error as any).code;
    if (Object.values(ContractErrorCode).includes(code)) {
      return code as ContractErrorCode;
    }
  }
  
  return undefined;
}

/**
 * Classifies error by contract error code
 * 
 * @param errorCode Contract error code
 * @param error Original error
 * @param context Error context
 * @returns Classified error
 */
function classifyByErrorCode(
  errorCode: ContractErrorCode,
  error: Error,
  context?: ErrorContext
): ClassifiedError {
  switch (errorCode) {
    // Proof errors
    case ContractErrorCode.InvalidProof:
      return {
        category: ErrorCategory.PROOF_FAILURE,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Proof verification failed. The ZK proof is invalid or malformed.',
        recommendations: [
          'Verify the proof was generated with the correct witness',
          'Check that the proving backend is functioning correctly',
          'Ensure the verifying key matches the circuit used to generate the proof',
          'Verify all public inputs match the witness values',
        ],
        context: {
          errorCode,
          nullifierHash: context?.nullifierHash,
          root: context?.root,
        },
      };
    
    case ContractErrorCode.MalformedProofA:
    case ContractErrorCode.MalformedProofB:
    case ContractErrorCode.MalformedProofC:
      return {
        category: ErrorCategory.PROOF_FAILURE,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Proof format is invalid. One or more proof points have incorrect byte length.',
        recommendations: [
          'Verify the proof was formatted correctly using ProofGenerator.formatProof()',
          'Check that the proof bytes are exactly 256 bytes (64 + 128 + 64)',
          'Ensure the proving backend generated a valid Groth16 proof',
        ],
        context: {
          errorCode,
          expectedProofSize: 256,
        },
      };
    
    case ContractErrorCode.PointNotOnCurve:
    case ContractErrorCode.PairingFailed:
      return {
        category: ErrorCategory.PROOF_FAILURE,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Proof contains invalid BN254 curve points or pairing check failed.',
        recommendations: [
          'Verify the proving backend is generating valid BN254 points',
          'Check that the proof was not corrupted during serialization',
          'Ensure the verifying key is valid and matches the circuit',
        ],
        context: {
          errorCode,
        },
      };
    
    // Root errors
    case ContractErrorCode.UnknownRoot:
      return {
        category: ErrorCategory.ROOT_FAILURE,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Merkle root not found in pool\'s root history. The root may be too old or invalid.',
        recommendations: [
          'Verify the merkle proof was generated from a recent deposit',
          'Check that the root is in the pool\'s root history',
          'Ensure the merkle tree was synced with the latest deposits',
          `Root in witness: ${context?.root?.slice(0, 16)}...`,
        ],
        context: {
          errorCode,
          root: context?.root,
          poolId: context?.poolId,
        },
      };
    
    // Nullifier errors
    case ContractErrorCode.NullifierAlreadySpent:
      return {
        category: ErrorCategory.NULLIFIER_FAILURE,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Nullifier already spent. This is a double-spend attempt.',
        recommendations: [
          'Verify the note has not been withdrawn before',
          'Check that the nullifier is unique for this withdrawal',
          'Ensure the test is not reusing the same note across multiple withdrawals',
          `Nullifier hash: ${context?.nullifierHash?.slice(0, 16)}...`,
        ],
        context: {
          errorCode,
          nullifierHash: context?.nullifierHash,
          poolId: context?.poolId,
        },
      };
    
    // Pool ID errors
    case ContractErrorCode.InvalidPoolId:
      return {
        category: ErrorCategory.POOL_ID_MISMATCH,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Pool ID in public inputs does not match the pool being withdrawn from.',
        recommendations: [
          'Verify the witness was prepared with the correct pool ID',
          'Check that the pool ID matches the contract pool configuration',
          `Pool ID in context: ${context?.poolId?.slice(0, 16)}...`,
        ],
        context: {
          errorCode,
          poolId: context?.poolId,
        },
      };
    
    // Denomination errors
    case ContractErrorCode.InvalidDenomination:
      return {
        category: ErrorCategory.DENOMINATION_MISMATCH,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Denomination in public inputs does not match the pool denomination.',
        recommendations: [
          'Verify the witness was prepared with the correct denomination',
          'Check that the denomination matches the pool configuration',
          `Denomination in context: ${context?.denomination}`,
        ],
        context: {
          errorCode,
          denomination: context?.denomination,
        },
      };
    
    // Fee errors
    case ContractErrorCode.FeeExceedsAmount:
      return {
        category: ErrorCategory.FEE_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Fee exceeds the withdrawal amount.',
        recommendations: [
          'Verify the fee is less than or equal to the denomination',
          `Fee: ${context?.fee}, Denomination: ${context?.denomination}`,
        ],
        context: {
          errorCode,
          fee: context?.fee,
          denomination: context?.denomination,
        },
      };
    
    case ContractErrorCode.InvalidRelayerFee:
      return {
        category: ErrorCategory.FEE_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Relayer address is non-zero but fee is zero.',
        recommendations: [
          'If using a relayer, provide a non-zero fee',
          'If not using a relayer, set relayer address to zero',
          `Relayer: ${context?.relayer?.slice(0, 16)}..., Fee: ${context?.fee}`,
        ],
        context: {
          errorCode,
          relayer: context?.relayer,
          fee: context?.fee,
        },
      };
    
    // Recipient errors
    case ContractErrorCode.ZeroRelayerRecipientMismatch:
      return {
        category: ErrorCategory.RECIPIENT_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Recipient address must be the transaction invoker for zero-relayer withdrawals.',
        recommendations: [
          'When not using a relayer, ensure the withdrawal recipient is your own address',
          'Verify the recipient address matches the invoker address of the transaction',
          `Recipient: ${context?.recipient?.slice(0, 16)}...`,
        ],
        context: {
          errorCode,
          recipient: context?.recipient,
          relayer: context?.relayer,
        },
      };

    case ContractErrorCode.InvalidRecipient:
      return {
        category: ErrorCategory.RECIPIENT_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Recipient address is invalid.',
        recommendations: [
          'Verify the recipient address is a valid Stellar address',
          'Check that the address was encoded correctly as a field element',
          `Recipient: ${context?.recipient?.slice(0, 16)}...`,
        ],
        context: {
          errorCode,
          recipient: context?.recipient,
        },
      };
    
    // Pool state errors
    case ContractErrorCode.PoolPaused:
      return {
        category: ErrorCategory.POOL_STATE_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Pool is paused. Deposits and withdrawals are blocked.',
        recommendations: [
          'Wait for the pool to be unpaused',
          'Check pool status before attempting withdrawal',
        ],
        context: {
          errorCode,
          poolId: context?.poolId,
        },
      };
    
    case ContractErrorCode.NotInitialized:
      return {
        category: ErrorCategory.POOL_STATE_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Pool has not been initialized.',
        recommendations: [
          'Initialize the pool before attempting withdrawal',
          'Verify the pool ID is correct',
        ],
        context: {
          errorCode,
          poolId: context?.poolId,
        },
      };
    
    case ContractErrorCode.PoolNotFound:
      return {
        category: ErrorCategory.POOL_STATE_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Pool with the given ID not found.',
        recommendations: [
          'Verify the pool ID is correct',
          'Check that the pool has been created',
          `Pool ID: ${context?.poolId?.slice(0, 16)}...`,
        ],
        context: {
          errorCode,
          poolId: context?.poolId,
        },
      };
    
    // Verifying key errors
    case ContractErrorCode.NoVerifyingKey:
      return {
        category: ErrorCategory.VERIFYING_KEY_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Verifying key has not been set for this pool.',
        recommendations: [
          'Set the verifying key before attempting withdrawal',
          'Verify the pool was initialized with a valid verifying key',
        ],
        context: {
          errorCode,
          poolId: context?.poolId,
        },
      };
    
    case ContractErrorCode.MalformedVerifyingKey:
      return {
        category: ErrorCategory.VERIFYING_KEY_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Verifying key is malformed (wrong byte length).',
        recommendations: [
          'Verify the verifying key was loaded correctly from circuit artifacts',
          'Check that the verifying key matches the expected format',
        ],
        context: {
          errorCode,
          poolId: context?.poolId,
        },
      };
    
    // Schema version errors
    case ContractErrorCode.InvalidSchemaVersion:
    case ContractErrorCode.SchemaVersionMismatch:
      return {
        category: ErrorCategory.SCHEMA_VERSION_ERROR,
        originalMessage: error.message,
        errorCode,
        actionableMessage: 'Public input schema version mismatch.',
        recommendations: [
          'Verify the circuit artifacts match the contract\'s expected schema version',
          'Regenerate proofs with the correct circuit version',
          'Check that the manifest.json has the correct schema_version',
        ],
        context: {
          errorCode,
        },
      };
    
    // Unknown error code
    default:
      return {
        category: ErrorCategory.UNKNOWN,
        originalMessage: error.message,
        errorCode,
        actionableMessage: `Unknown contract error code: ${errorCode}`,
        recommendations: [
          'Check the contract error definitions for this error code',
          'Review the contract logs for more details',
        ],
        context: {
          errorCode,
        },
      };
  }
}

/**
 * Classifies error by message content (fallback)
 * 
 * @param errorMessage Error message (lowercase)
 * @param error Original error
 * @param context Error context
 * @returns Classified error
 */
function classifyByMessage(
  errorMessage: string,
  error: Error,
  context?: ErrorContext
): ClassifiedError {
  // Proof errors
  if (errorMessage.includes('proof') || errorMessage.includes('invalid') || errorMessage.includes('verification')) {
    return {
      category: ErrorCategory.PROOF_FAILURE,
      originalMessage: error.message,
      actionableMessage: 'Proof verification failed. The ZK proof may be invalid or malformed.',
      recommendations: [
        'Verify the proof was generated with the correct witness',
        'Check that the proving backend is functioning correctly',
        'Ensure the verifying key matches the circuit',
      ],
      context: {
        nullifierHash: context?.nullifierHash,
        root: context?.root,
      },
    };
  }
  
  // Root errors
  if (errorMessage.includes('root') || errorMessage.includes('unknown')) {
    return {
      category: ErrorCategory.ROOT_FAILURE,
      originalMessage: error.message,
      actionableMessage: 'Merkle root not found in pool\'s root history.',
      recommendations: [
        'Verify the merkle proof was generated from a recent deposit',
        'Check that the root is in the pool\'s root history',
        'Ensure the merkle tree was synced with the latest deposits',
      ],
      context: {
        root: context?.root,
        poolId: context?.poolId,
      },
    };
  }
  
  // Nullifier errors
  if (errorMessage.includes('nullifier') || errorMessage.includes('spent') || errorMessage.includes('double')) {
    return {
      category: ErrorCategory.NULLIFIER_FAILURE,
      originalMessage: error.message,
      actionableMessage: 'Nullifier already spent. This is a double-spend attempt.',
      recommendations: [
        'Verify the note has not been withdrawn before',
        'Check that the nullifier is unique for this withdrawal',
        'Ensure the test is not reusing the same note',
      ],
      context: {
        nullifierHash: context?.nullifierHash,
        poolId: context?.poolId,
      },
    };
  }
  
  // Pool ID errors
  if (errorMessage.includes('pool') && errorMessage.includes('id')) {
    return {
      category: ErrorCategory.POOL_ID_MISMATCH,
      originalMessage: error.message,
      actionableMessage: 'Pool ID mismatch between witness and contract.',
      recommendations: [
        'Verify the witness was prepared with the correct pool ID',
        'Check that the pool ID matches the contract configuration',
      ],
      context: {
        poolId: context?.poolId,
      },
    };
  }
  
  // Denomination errors
  if (errorMessage.includes('denomination')) {
    return {
      category: ErrorCategory.DENOMINATION_MISMATCH,
      originalMessage: error.message,
      actionableMessage: 'Denomination mismatch between witness and pool.',
      recommendations: [
        'Verify the witness was prepared with the correct denomination',
        'Check that the denomination matches the pool configuration',
      ],
      context: {
        denomination: context?.denomination,
      },
    };
  }
  
  // Fee errors
  if (errorMessage.includes('fee')) {
    return {
      category: ErrorCategory.FEE_ERROR,
      originalMessage: error.message,
      actionableMessage: 'Fee validation error.',
      recommendations: [
        'Verify the fee is valid and less than the denomination',
        'Check relayer address and fee consistency',
      ],
      context: {
        fee: context?.fee,
        relayer: context?.relayer,
        denomination: context?.denomination,
      },
    };
  }
  
  // Unknown error
  return {
    category: ErrorCategory.UNKNOWN,
    originalMessage: error.message,
    actionableMessage: 'Unknown contract error. Review the error message for details.',
    recommendations: [
      'Check the contract logs for more details',
      'Verify all withdrawal parameters are correct',
      'Review the contract error definitions',
    ],
    context: {},
  };
}

/**
 * Generates a formatted error report for test output
 * 
 * **Validates: Requirement 10.4** - Format error reports
 * 
 * @param error Classified error
 * @param context Error context
 * @returns Formatted error report
 */
export function generateErrorReport(
  error: ClassifiedError,
  context: ErrorContext
): ErrorReport {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  WITHDRAWAL ERROR REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');
  
  // Error category
  lines.push(`Category: ${error.category}`);
  if (error.errorCode !== undefined) {
    lines.push(`Error Code: ${error.errorCode}`);
  }
  lines.push('');
  
  // Original error message
  lines.push('Original Error:');
  lines.push(`  ${error.originalMessage}`);
  lines.push('');
  
  // Actionable message
  lines.push('Diagnosis:');
  lines.push(`  ${error.actionableMessage}`);
  lines.push('');
  
  // Recommendations
  if (error.recommendations.length > 0) {
    lines.push('Recommendations:');
    error.recommendations.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`);
    });
    lines.push('');
  }
  
  // Error context
  if (context.poolId || context.recipient || context.nullifierHash || context.root) {
    lines.push('Context:');
    if (context.poolId) {
      lines.push(`  Pool ID: ${context.poolId.slice(0, 32)}...`);
    }
    if (context.recipient) {
      lines.push(`  Recipient: ${context.recipient.slice(0, 32)}...`);
    }
    if (context.relayer) {
      lines.push(`  Relayer: ${context.relayer.slice(0, 32)}...`);
    }
    if (context.fee !== undefined) {
      lines.push(`  Fee: ${context.fee}`);
    }
    if (context.denomination !== undefined) {
      lines.push(`  Denomination: ${context.denomination}`);
    }
    if (context.nullifierHash) {
      lines.push(`  Nullifier Hash: ${context.nullifierHash.slice(0, 32)}...`);
    }
    if (context.root) {
      lines.push(`  Root: ${context.root.slice(0, 32)}...`);
    }
    lines.push('');
  }
  
  // Additional context
  if (Object.keys(error.context).length > 0) {
    lines.push('Additional Context:');
    Object.entries(error.context).forEach(([key, value]) => {
      lines.push(`  ${key}: ${JSON.stringify(value)}`);
    });
    lines.push('');
  }
  
  lines.push('═══════════════════════════════════════════════════════════');
  
  const reportText = lines.join('\n');
  
  return {
    error,
    context,
    reportText,
  };
}
