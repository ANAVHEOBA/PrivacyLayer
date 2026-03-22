// ============================================================
// PrivacyLayer SDK — Error Types Tests
// ============================================================

import {
  ContractError,
  ErrorCode,
  ERROR_MESSAGES,
  NetworkError,
  PrivacyLayerError,
  ProofGenerationError,
  ValidationError,
  WalletError,
  isContractError,
  isNetworkError,
  isPrivacyLayerError,
  isProofGenerationError,
  isRetryableError,
  isValidationError,
  isWalletError,
  parseContractError,
} from '../errors';

// ──────────────────────────────────────────────────────────────
// PrivacyLayerError (Base)
// ──────────────────────────────────────────────────────────────

describe('PrivacyLayerError', () => {
  it('should create an error with code and default message', () => {
    const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);

    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(err.message).toBe(ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR]);
    expect(err.name).toBe('PrivacyLayerError');
    expect(err.isRetryable).toBe(false);
    expect(err.timestamp).toBeDefined();
    expect(err.details).toBeUndefined();
  });

  it('should create an error with custom message', () => {
    const err = new PrivacyLayerError(
      ErrorCode.INTERNAL_ERROR,
      'Custom message',
    );

    expect(err.message).toBe('Custom message');
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
  });

  it('should accept details and cause', () => {
    const cause = new Error('root cause');
    const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR, undefined, {
      details: { operation: 'deposit', attempt: 3 },
      cause,
    });

    expect(err.details).toEqual({ operation: 'deposit', attempt: 3 });
    expect(err.cause).toBe(cause);
  });

  it('should set isRetryable flag', () => {
    const retryable = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR, undefined, {
      isRetryable: true,
    });
    const nonRetryable = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);

    expect(retryable.isRetryable).toBe(true);
    expect(nonRetryable.isRetryable).toBe(false);
  });

  it('should produce valid timestamp', () => {
    const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);
    const date = new Date(err.timestamp);
    expect(date.getTime()).not.toBeNaN();
  });

  it('should be instanceof Error', () => {
    const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PrivacyLayerError);
  });

  describe('toJSON', () => {
    it('should return a serializable object', () => {
      const cause = new Error('root');
      const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR, 'test', {
        details: { key: 'value' },
        cause,
        isRetryable: true,
      });

      const json = err.toJSON();

      expect(json.name).toBe('PrivacyLayerError');
      expect(json.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(json.message).toBe('test');
      expect(json.details).toEqual({ key: 'value' });
      expect(json.isRetryable).toBe(true);
      expect(json.cause).toBe('root');
      expect(json.timestamp).toBeDefined();
    });

    it('should handle missing cause', () => {
      const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);
      const json = err.toJSON();
      expect(json.cause).toBeUndefined();
    });
  });
});

// ──────────────────────────────────────────────────────────────
// NetworkError
// ──────────────────────────────────────────────────────────────

describe('NetworkError', () => {
  it('should be retryable by default', () => {
    const err = new NetworkError(ErrorCode.NETWORK_TIMEOUT);

    expect(err.name).toBe('NetworkError');
    expect(err.isRetryable).toBe(true);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err).toBeInstanceOf(PrivacyLayerError);
    expect(err).toBeInstanceOf(Error);
  });

  it('should accept statusCode and endpoint', () => {
    const err = new NetworkError(ErrorCode.RATE_LIMITED, undefined, {
      statusCode: 429,
      endpoint: 'https://rpc.stellar.org',
    });

    expect(err.statusCode).toBe(429);
    expect(err.endpoint).toBe('https://rpc.stellar.org');
  });

  it('should allow overriding isRetryable', () => {
    const err = new NetworkError(ErrorCode.TRANSACTION_FAILED, undefined, {
      isRetryable: false,
    });

    expect(err.isRetryable).toBe(false);
  });

  it('should use default error message from ERROR_MESSAGES', () => {
    const err = new NetworkError(ErrorCode.NETWORK_TIMEOUT);
    expect(err.message).toBe(ERROR_MESSAGES[ErrorCode.NETWORK_TIMEOUT]);
  });
});

// ──────────────────────────────────────────────────────────────
// ValidationError
// ──────────────────────────────────────────────────────────────

describe('ValidationError', () => {
  it('should never be retryable', () => {
    const err = new ValidationError(ErrorCode.INVALID_ADDRESS);

    expect(err.name).toBe('ValidationError');
    expect(err.isRetryable).toBe(false);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err).toBeInstanceOf(PrivacyLayerError);
  });

  it('should accept field and constraint', () => {
    const err = new ValidationError(ErrorCode.INVALID_ADDRESS, undefined, {
      field: 'recipient',
      constraint: 'Must be a valid Ed25519 public key',
    });

    expect(err.field).toBe('recipient');
    expect(err.constraint).toBe('Must be a valid Ed25519 public key');
  });

  it('should handle all validation error codes', () => {
    const validationCodes = [
      ErrorCode.INVALID_NOTE_FORMAT,
      ErrorCode.INVALID_ADDRESS,
      ErrorCode.INVALID_AMOUNT,
      ErrorCode.ZERO_COMMITMENT,
      ErrorCode.INVALID_NULLIFIER,
      ErrorCode.INVALID_SECRET,
      ErrorCode.INVALID_MERKLE_PROOF,
      ErrorCode.FEE_EXCEEDS_AMOUNT,
      ErrorCode.INVALID_RELAYER_FEE,
      ErrorCode.FIELD_OVERFLOW,
    ];

    for (const code of validationCodes) {
      const err = new ValidationError(code);
      expect(err.code).toBe(code);
      expect(err.isRetryable).toBe(false);
      expect(err.message).toBe(ERROR_MESSAGES[code]);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// ProofGenerationError
// ──────────────────────────────────────────────────────────────

describe('ProofGenerationError', () => {
  it('should create with phase', () => {
    const err = new ProofGenerationError(
      ErrorCode.PROOF_GENERATION_FAILED,
      undefined,
      { phase: 'proving' },
    );

    expect(err.name).toBe('ProofGenerationError');
    expect(err.phase).toBe('proving');
    expect(err).toBeInstanceOf(ProofGenerationError);
    expect(err).toBeInstanceOf(PrivacyLayerError);
  });

  it('should handle all proof phases', () => {
    const phases: Array<'compilation' | 'witness' | 'proving' | 'verification'> = [
      'compilation',
      'witness',
      'proving',
      'verification',
    ];

    for (const phase of phases) {
      const err = new ProofGenerationError(
        ErrorCode.PROOF_GENERATION_FAILED,
        undefined,
        { phase },
      );
      expect(err.phase).toBe(phase);
    }
  });

  it('should allow retryable WASM OOM errors', () => {
    const err = new ProofGenerationError(
      ErrorCode.WASM_OUT_OF_MEMORY,
      undefined,
      { isRetryable: true },
    );

    expect(err.isRetryable).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// ContractError
// ──────────────────────────────────────────────────────────────

describe('ContractError', () => {
  it('should create with contract error code', () => {
    const err = new ContractError(ErrorCode.CONTRACT_PAUSED, undefined, {
      contractErrorCode: 20,
    });

    expect(err.name).toBe('ContractError');
    expect(err.contractErrorCode).toBe(20);
    expect(err).toBeInstanceOf(ContractError);
    expect(err).toBeInstanceOf(PrivacyLayerError);
  });

  it('should map all contract error codes', () => {
    const expectedMappings: Array<[number, ErrorCode]> = [
      [1, ErrorCode.CONTRACT_ALREADY_INITIALIZED],
      [2, ErrorCode.CONTRACT_NOT_INITIALIZED],
      [10, ErrorCode.UNAUTHORIZED_ADMIN],
      [20, ErrorCode.CONTRACT_PAUSED],
      [21, ErrorCode.TREE_FULL],
      [30, ErrorCode.INVALID_AMOUNT],
      [31, ErrorCode.ZERO_COMMITMENT],
      [40, ErrorCode.UNKNOWN_ROOT],
      [41, ErrorCode.NULLIFIER_ALREADY_SPENT],
      [42, ErrorCode.PROOF_VERIFICATION_FAILED],
      [43, ErrorCode.FEE_EXCEEDS_AMOUNT],
      [44, ErrorCode.INVALID_RELAYER_FEE],
      [45, ErrorCode.INVALID_ADDRESS],
      [50, ErrorCode.NO_VERIFYING_KEY],
      [51, ErrorCode.MALFORMED_VERIFYING_KEY],
    ];

    for (const [contractCode, expectedSdkCode] of expectedMappings) {
      const err = parseContractError(contractCode);
      expect(err.code).toBe(expectedSdkCode);
      expect(err.contractErrorCode).toBe(contractCode);
      expect(err).toBeInstanceOf(ContractError);
    }
  });

  it('should handle unknown contract error codes', () => {
    const err = parseContractError(999);

    expect(err.code).toBe(ErrorCode.UNKNOWN_CONTRACT_ERROR);
    expect(err.contractErrorCode).toBe(999);
  });

  it('should preserve the original error', () => {
    const original = new Error('Soroban host error');
    const err = parseContractError(20, original);

    expect(err.cause).toBe(original);
  });
});

// ──────────────────────────────────────────────────────────────
// WalletError
// ──────────────────────────────────────────────────────────────

describe('WalletError', () => {
  it('should create with wallet provider', () => {
    const err = new WalletError(ErrorCode.USER_REJECTED, undefined, {
      walletProvider: 'Freighter',
    });

    expect(err.name).toBe('WalletError');
    expect(err.walletProvider).toBe('Freighter');
    expect(err).toBeInstanceOf(WalletError);
    expect(err).toBeInstanceOf(PrivacyLayerError);
  });

  it('should not be retryable by default', () => {
    const err = new WalletError(ErrorCode.WALLET_NOT_CONNECTED);
    expect(err.isRetryable).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Type Guards
// ──────────────────────────────────────────────────────────────

describe('Type Guards', () => {
  const errors = {
    base: new PrivacyLayerError(ErrorCode.INTERNAL_ERROR),
    network: new NetworkError(ErrorCode.NETWORK_TIMEOUT),
    validation: new ValidationError(ErrorCode.INVALID_ADDRESS),
    proof: new ProofGenerationError(ErrorCode.PROOF_GENERATION_FAILED),
    contract: new ContractError(ErrorCode.CONTRACT_PAUSED),
    wallet: new WalletError(ErrorCode.WALLET_NOT_CONNECTED),
    plain: new Error('plain error'),
    string: 'not an error',
    nullValue: null,
    undefinedValue: undefined,
  };

  describe('isPrivacyLayerError', () => {
    it('should return true for all PrivacyLayerError subtypes', () => {
      expect(isPrivacyLayerError(errors.base)).toBe(true);
      expect(isPrivacyLayerError(errors.network)).toBe(true);
      expect(isPrivacyLayerError(errors.validation)).toBe(true);
      expect(isPrivacyLayerError(errors.proof)).toBe(true);
      expect(isPrivacyLayerError(errors.contract)).toBe(true);
      expect(isPrivacyLayerError(errors.wallet)).toBe(true);
    });

    it('should return false for non-PrivacyLayerError values', () => {
      expect(isPrivacyLayerError(errors.plain)).toBe(false);
      expect(isPrivacyLayerError(errors.string)).toBe(false);
      expect(isPrivacyLayerError(errors.nullValue)).toBe(false);
      expect(isPrivacyLayerError(errors.undefinedValue)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should return true only for NetworkError', () => {
      expect(isNetworkError(errors.network)).toBe(true);
      expect(isNetworkError(errors.base)).toBe(false);
      expect(isNetworkError(errors.validation)).toBe(false);
      expect(isNetworkError(errors.plain)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true only for ValidationError', () => {
      expect(isValidationError(errors.validation)).toBe(true);
      expect(isValidationError(errors.base)).toBe(false);
      expect(isValidationError(errors.network)).toBe(false);
    });
  });

  describe('isProofGenerationError', () => {
    it('should return true only for ProofGenerationError', () => {
      expect(isProofGenerationError(errors.proof)).toBe(true);
      expect(isProofGenerationError(errors.base)).toBe(false);
      expect(isProofGenerationError(errors.contract)).toBe(false);
    });
  });

  describe('isContractError', () => {
    it('should return true only for ContractError', () => {
      expect(isContractError(errors.contract)).toBe(true);
      expect(isContractError(errors.base)).toBe(false);
      expect(isContractError(errors.wallet)).toBe(false);
    });
  });

  describe('isWalletError', () => {
    it('should return true only for WalletError', () => {
      expect(isWalletError(errors.wallet)).toBe(true);
      expect(isWalletError(errors.base)).toBe(false);
      expect(isWalletError(errors.network)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      expect(isRetryableError(errors.network)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError(errors.validation)).toBe(false);
      expect(isRetryableError(errors.base)).toBe(false);
      expect(isRetryableError(errors.wallet)).toBe(false);
    });

    it('should return false for non-PrivacyLayerError values', () => {
      expect(isRetryableError(errors.plain)).toBe(false);
      expect(isRetryableError(errors.string)).toBe(false);
      expect(isRetryableError(null)).toBe(false);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// Error Codes Completeness
// ──────────────────────────────────────────────────────────────

describe('Error Codes', () => {
  it('should have a message for every error code', () => {
    const allCodes = Object.values(ErrorCode);
    for (const code of allCodes) {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('should have unique error code strings', () => {
    const allCodes = Object.values(ErrorCode);
    const uniqueCodes = new Set(allCodes);
    expect(uniqueCodes.size).toBe(allCodes.length);
  });

  it('should follow PL_ prefix convention', () => {
    const allCodes = Object.values(ErrorCode);
    for (const code of allCodes) {
      expect(code).toMatch(/^PL_[A-Z]+_\d{3}$/);
    }
  });
});
