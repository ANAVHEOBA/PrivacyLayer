// ============================================================
// PrivacyLayer SDK — Error Types Tests
// ============================================================

import {
  ContractError,
  DepositError,
  ErrorCode,
  ERROR_MESSAGES,
  NetworkError,
  PrivacyLayerError,
  ProofGenerationError,
  ValidationError,
  WalletError,
  isContractError,
  isDepositError,
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

  it('should serialize to JSON correctly', () => {
    const cause = new Error('root cause');
    const err = new PrivacyLayerError(ErrorCode.NETWORK_TIMEOUT, undefined, {
      details: { endpoint: 'https://rpc.stellar.org' },
      cause,
      isRetryable: true,
    });

    const json = err.toJSON();
    expect(json.name).toBe('PrivacyLayerError');
    expect(json.code).toBe(ErrorCode.NETWORK_TIMEOUT);
    expect(json.isRetryable).toBe(true);
    expect(json.cause).toBe('root cause');
    expect(json.details).toEqual({ endpoint: 'https://rpc.stellar.org' });
  });

  it('should be an instance of Error', () => {
    const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PrivacyLayerError);
  });

  it('should have a valid timestamp', () => {
    const before = new Date().toISOString();
    const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);
    const after = new Date().toISOString();

    expect(err.timestamp >= before).toBe(true);
    expect(err.timestamp <= after).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// NetworkError
// ──────────────────────────────────────────────────────────────

describe('NetworkError', () => {
  it('should default to retryable', () => {
    const err = new NetworkError(ErrorCode.NETWORK_TIMEOUT);
    expect(err.isRetryable).toBe(true);
    expect(err.name).toBe('NetworkError');
  });

  it('should carry statusCode and endpoint', () => {
    const err = new NetworkError(ErrorCode.RATE_LIMITED, undefined, {
      statusCode: 429,
      endpoint: 'https://rpc.stellar.org',
    });

    expect(err.statusCode).toBe(429);
    expect(err.endpoint).toBe('https://rpc.stellar.org');
  });

  it('should be instanceof PrivacyLayerError', () => {
    const err = new NetworkError(ErrorCode.NETWORK_UNREACHABLE);
    expect(err).toBeInstanceOf(PrivacyLayerError);
    expect(err).toBeInstanceOf(NetworkError);
  });
});

// ──────────────────────────────────────────────────────────────
// ValidationError
// ──────────────────────────────────────────────────────────────

describe('ValidationError', () => {
  it('should not be retryable', () => {
    const err = new ValidationError(ErrorCode.INVALID_ADDRESS);
    expect(err.isRetryable).toBe(false);
    expect(err.name).toBe('ValidationError');
  });

  it('should carry field and constraint', () => {
    const err = new ValidationError(ErrorCode.INVALID_AMOUNT, undefined, {
      field: 'amount',
      constraint: 'must be positive',
    });

    expect(err.field).toBe('amount');
    expect(err.constraint).toBe('must be positive');
  });
});

// ──────────────────────────────────────────────────────────────
// DepositError
// ──────────────────────────────────────────────────────────────

describe('DepositError', () => {
  it('should carry phase information', () => {
    const err = new DepositError(ErrorCode.DEPOSIT_SIMULATION_FAILED, undefined, {
      phase: 'build',
    });

    expect(err.name).toBe('DepositError');
    expect(err.phase).toBe('build');
  });

  it('should support all deposit phases', () => {
    const phases: Array<'note-generation' | 'build' | 'sign' | 'submit' | 'confirm'> = [
      'note-generation', 'build', 'sign', 'submit', 'confirm',
    ];

    for (const phase of phases) {
      const err = new DepositError(ErrorCode.INTERNAL_ERROR, undefined, { phase });
      expect(err.phase).toBe(phase);
    }
  });

  it('should be instanceof PrivacyLayerError', () => {
    const err = new DepositError(ErrorCode.DEPOSIT_TIMEOUT);
    expect(err).toBeInstanceOf(PrivacyLayerError);
    expect(err).toBeInstanceOf(DepositError);
  });

  it('should default to non-retryable', () => {
    const err = new DepositError(ErrorCode.DEPOSIT_SIMULATION_FAILED);
    expect(err.isRetryable).toBe(false);
  });

  it('should support retryable flag', () => {
    const err = new DepositError(ErrorCode.DEPOSIT_TIMEOUT, undefined, {
      isRetryable: true,
    });
    expect(err.isRetryable).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// ProofGenerationError
// ──────────────────────────────────────────────────────────────

describe('ProofGenerationError', () => {
  it('should carry phase information', () => {
    const err = new ProofGenerationError(ErrorCode.PROOF_GENERATION_FAILED, undefined, {
      phase: 'proving',
    });

    expect(err.name).toBe('ProofGenerationError');
    expect(err.phase).toBe('proving');
  });

  it('should be instanceof PrivacyLayerError', () => {
    const err = new ProofGenerationError(ErrorCode.WASM_LOAD_FAILED);
    expect(err).toBeInstanceOf(PrivacyLayerError);
    expect(isProofGenerationError(err)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// ContractError
// ──────────────────────────────────────────────────────────────

describe('ContractError', () => {
  it('should carry contractErrorCode', () => {
    const err = new ContractError(ErrorCode.CONTRACT_PAUSED, undefined, {
      contractErrorCode: 20,
    });

    expect(err.name).toBe('ContractError');
    expect(err.contractErrorCode).toBe(20);
  });
});

// ──────────────────────────────────────────────────────────────
// WalletError
// ──────────────────────────────────────────────────────────────

describe('WalletError', () => {
  it('should carry walletProvider', () => {
    const err = new WalletError(ErrorCode.USER_REJECTED, undefined, {
      walletProvider: 'Freighter',
    });

    expect(err.name).toBe('WalletError');
    expect(err.walletProvider).toBe('Freighter');
  });
});

// ──────────────────────────────────────────────────────────────
// parseContractError
// ──────────────────────────────────────────────────────────────

describe('parseContractError', () => {
  it('should map known contract error codes', () => {
    const mappings: Array<[number, ErrorCode]> = [
      [20, ErrorCode.CONTRACT_PAUSED],
      [21, ErrorCode.TREE_FULL],
      [30, ErrorCode.INVALID_AMOUNT],
      [31, ErrorCode.ZERO_COMMITMENT],
      [41, ErrorCode.NULLIFIER_ALREADY_SPENT],
    ];

    for (const [contractCode, expectedCode] of mappings) {
      const err = parseContractError(contractCode);
      expect(err.code).toBe(expectedCode);
      expect(err.contractErrorCode).toBe(contractCode);
    }
  });

  it('should fall back to UNKNOWN_CONTRACT_ERROR for unrecognized codes', () => {
    const err = parseContractError(999);
    expect(err.code).toBe(ErrorCode.UNKNOWN_CONTRACT_ERROR);
  });

  it('should chain the raw error', () => {
    const rawError = new Error('contract call failed');
    const err = parseContractError(20, rawError);
    expect(err.cause).toBe(rawError);
  });
});

// ──────────────────────────────────────────────────────────────
// Type Guards
// ──────────────────────────────────────────────────────────────

describe('Type guards', () => {
  it('isPrivacyLayerError should work for all subclasses', () => {
    expect(isPrivacyLayerError(new PrivacyLayerError(ErrorCode.INTERNAL_ERROR))).toBe(true);
    expect(isPrivacyLayerError(new NetworkError(ErrorCode.NETWORK_TIMEOUT))).toBe(true);
    expect(isPrivacyLayerError(new ValidationError(ErrorCode.INVALID_ADDRESS))).toBe(true);
    expect(isPrivacyLayerError(new DepositError(ErrorCode.DEPOSIT_TIMEOUT))).toBe(true);
    expect(isPrivacyLayerError(new Error('not a PL error'))).toBe(false);
    expect(isPrivacyLayerError(null)).toBe(false);
    expect(isPrivacyLayerError(undefined)).toBe(false);
  });

  it('isNetworkError should only match NetworkError', () => {
    expect(isNetworkError(new NetworkError(ErrorCode.NETWORK_TIMEOUT))).toBe(true);
    expect(isNetworkError(new PrivacyLayerError(ErrorCode.INTERNAL_ERROR))).toBe(false);
  });

  it('isValidationError should only match ValidationError', () => {
    expect(isValidationError(new ValidationError(ErrorCode.INVALID_ADDRESS))).toBe(true);
    expect(isValidationError(new NetworkError(ErrorCode.NETWORK_TIMEOUT))).toBe(false);
  });

  it('isDepositError should only match DepositError', () => {
    expect(isDepositError(new DepositError(ErrorCode.DEPOSIT_TIMEOUT))).toBe(true);
    expect(isDepositError(new NetworkError(ErrorCode.NETWORK_TIMEOUT))).toBe(false);
    expect(isDepositError(new PrivacyLayerError(ErrorCode.INTERNAL_ERROR))).toBe(false);
  });

  it('isContractError should only match ContractError', () => {
    expect(isContractError(new ContractError(ErrorCode.CONTRACT_PAUSED))).toBe(true);
    expect(isContractError(new NetworkError(ErrorCode.NETWORK_TIMEOUT))).toBe(false);
  });

  it('isWalletError should only match WalletError', () => {
    expect(isWalletError(new WalletError(ErrorCode.USER_REJECTED))).toBe(true);
    expect(isWalletError(new PrivacyLayerError(ErrorCode.INTERNAL_ERROR))).toBe(false);
  });

  it('isRetryableError should check the isRetryable flag', () => {
    expect(isRetryableError(new NetworkError(ErrorCode.NETWORK_TIMEOUT))).toBe(true);
    expect(isRetryableError(new ValidationError(ErrorCode.INVALID_ADDRESS))).toBe(false);
    expect(isRetryableError(new Error('plain error'))).toBe(false);
    expect(isRetryableError(null)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// ERROR_MESSAGES
// ──────────────────────────────────────────────────────────────

describe('ERROR_MESSAGES', () => {
  it('should have a message for every ErrorCode', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      expect(typeof ERROR_MESSAGES[code]).toBe('string');
      expect(ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('should not contain sensitive keywords', () => {
    const sensitiveKeywords = ['private_key', 'privatekey', 'mnemonic', 'seed_phrase'];
    for (const msg of Object.values(ERROR_MESSAGES)) {
      for (const keyword of sensitiveKeywords) {
        expect(msg.toLowerCase()).not.toContain(keyword);
      }
    }
  });
});
