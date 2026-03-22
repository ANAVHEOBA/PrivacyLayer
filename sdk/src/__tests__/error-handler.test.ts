// ============================================================
// PrivacyLayer SDK — Error Handler Tests
// ============================================================

import {
  ContractError,
  ErrorCode,
  NetworkError,
  PrivacyLayerError,
  ProofGenerationError,
  ValidationError,
  WalletError,
} from '../errors';
import { classifyError, ErrorHandler } from '../error-handler';
import { Logger, LogLevel } from '../logger';

// ──────────────────────────────────────────────────────────────
// classifyError
// ──────────────────────────────────────────────────────────────

describe('classifyError', () => {
  // ── Already classified ──────────────────────────────────
  it('should pass through PrivacyLayerError instances', () => {
    const err = new NetworkError(ErrorCode.NETWORK_TIMEOUT);
    expect(classifyError(err)).toBe(err);
  });

  // ── Network errors ─────────────────────────────────────
  describe('network errors', () => {
    const networkCases: Array<[string, ErrorCode]> = [
      ['Request timeout exceeded', ErrorCode.NETWORK_TIMEOUT],
      ['ETIMEDOUT: connection timed out', ErrorCode.NETWORK_TIMEOUT],
      ['ECONNABORTED', ErrorCode.NETWORK_TIMEOUT],
      ['Network error occurred', ErrorCode.NETWORK_UNREACHABLE],
      ['ECONNREFUSED', ErrorCode.NETWORK_UNREACHABLE],
      ['ENOTFOUND: dns lookup failed', ErrorCode.NETWORK_UNREACHABLE],
      ['fetch failed', ErrorCode.NETWORK_UNREACHABLE],
      ['Failed to fetch resource', ErrorCode.NETWORK_UNREACHABLE],
      ['Rate limit exceeded', ErrorCode.RATE_LIMITED],
      ['429 Too Many Requests', ErrorCode.RATE_LIMITED],
      ['Transaction failed: tx_failed', ErrorCode.TRANSACTION_FAILED],
      ['tx_failed at ledger 12345', ErrorCode.TRANSACTION_FAILED],
      ['Transaction expired: tx_too_late', ErrorCode.TRANSACTION_EXPIRED],
    ];

    for (const [message, expectedCode] of networkCases) {
      it(`should classify "${message}" as ${expectedCode}`, () => {
        const err = classifyError(new Error(message));
        expect(err.code).toBe(expectedCode);
        expect(err).toBeInstanceOf(NetworkError);
      });
    }
  });

  // ── Contract errors ────────────────────────────────────
  describe('contract errors', () => {
    it('should parse contract error code from message', () => {
      const err = classifyError(
        new Error('Contract call error: code 20'),
      );
      expect(err.code).toBe(ErrorCode.CONTRACT_PAUSED);
      expect(err).toBeInstanceOf(ContractError);
    });

    it('should parse contract failed #code pattern', () => {
      const err = classifyError(
        new Error('Contract call failed with code #41'),
      );
      expect(err.code).toBe(ErrorCode.NULLIFIER_ALREADY_SPENT);
      expect(err).toBeInstanceOf(ContractError);
    });

    it('should parse HostError pattern', () => {
      const err = classifyError(
        new Error('HostError: Error(Contract, #40)'),
      );
      expect(err.code).toBe(ErrorCode.UNKNOWN_ROOT);
      expect(err).toBeInstanceOf(ContractError);
    });

    it('should handle unknown contract error codes', () => {
      const err = classifyError(
        new Error('Contract call error: code 999'),
      );
      expect(err.code).toBe(ErrorCode.UNKNOWN_CONTRACT_ERROR);
      expect(err).toBeInstanceOf(ContractError);
    });
  });

  // ── Wallet errors ──────────────────────────────────────
  describe('wallet errors', () => {
    const walletCases: Array<[string, ErrorCode]> = [
      ['User rejected the transaction', ErrorCode.USER_REJECTED],
      ['User denied signing', ErrorCode.USER_REJECTED],
      ['User cancelled the operation', ErrorCode.USER_REJECTED],
      ['Rejected by user', ErrorCode.USER_REJECTED],
      ['Wallet not connected', ErrorCode.WALLET_NOT_CONNECTED],
      ['No wallet found', ErrorCode.WALLET_NOT_CONNECTED],
      ['Not connected to wallet', ErrorCode.WALLET_NOT_CONNECTED],
      ['Insufficient funds for transaction', ErrorCode.INSUFFICIENT_FUNDS],
      ['Insufficient balance in wallet', ErrorCode.INSUFFICIENT_FUNDS],
      ['Wrong network selected', ErrorCode.NETWORK_MISMATCH],
      ['Network mismatch detected', ErrorCode.NETWORK_MISMATCH],
    ];

    for (const [message, expectedCode] of walletCases) {
      it(`should classify "${message}" as ${expectedCode}`, () => {
        const err = classifyError(new Error(message));
        expect(err.code).toBe(expectedCode);
        expect(err).toBeInstanceOf(WalletError);
      });
    }
  });

  // ── Proof/WASM errors ─────────────────────────────────
  describe('proof errors', () => {
    it('should classify WASM load failure', () => {
      const err = classifyError(new Error('WASM module failed to load'));
      expect(err.code).toBe(ErrorCode.WASM_LOAD_FAILED);
      expect(err).toBeInstanceOf(ProofGenerationError);
    });

    it('should classify WASM instantiation failure', () => {
      const err = classifyError(new Error('Failed to instantiate WASM'));
      expect(err.code).toBe(ErrorCode.WASM_LOAD_FAILED);
      expect(err).toBeInstanceOf(ProofGenerationError);
    });

    it('should classify OOM errors', () => {
      const err = classifyError(new Error('Out of memory'));
      expect(err.code).toBe(ErrorCode.WASM_OUT_OF_MEMORY);
      expect(err).toBeInstanceOf(ProofGenerationError);
      expect(err.isRetryable).toBe(true);
    });

    it('should classify proof generation failure', () => {
      const err = classifyError(new Error('Proof generation failed'));
      expect(err.code).toBe(ErrorCode.PROOF_GENERATION_FAILED);
      expect(err).toBeInstanceOf(ProofGenerationError);
    });

    it('should classify witness generation failure', () => {
      const err = classifyError(new Error('Witness computation failed'));
      expect(err.code).toBe(ErrorCode.WITNESS_GENERATION_FAILED);
      expect(err).toBeInstanceOf(ProofGenerationError);
    });
  });

  // ── Validation errors ─────────────────────────────────
  describe('validation errors', () => {
    it('should classify invalid address', () => {
      const err = classifyError(new Error('Invalid address format'));
      expect(err.code).toBe(ErrorCode.INVALID_ADDRESS);
      expect(err).toBeInstanceOf(ValidationError);
    });

    it('should classify invalid amount', () => {
      const err = classifyError(new Error('Invalid amount provided'));
      expect(err.code).toBe(ErrorCode.INVALID_AMOUNT);
      expect(err).toBeInstanceOf(ValidationError);
    });
  });

  // ── Fallback ──────────────────────────────────────────
  describe('fallback', () => {
    it('should classify unknown errors as INTERNAL_ERROR', () => {
      const err = classifyError(new Error('Something completely unexpected'));
      expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(err).toBeInstanceOf(PrivacyLayerError);
    });

    it('should handle string errors', () => {
      const err = classifyError('string error');
      expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(err.message).toBe('string error');
    });

    it('should handle null/undefined', () => {
      const err1 = classifyError(null);
      expect(err1.code).toBe(ErrorCode.INTERNAL_ERROR);

      const err2 = classifyError(undefined);
      expect(err2.code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });
});

// ──────────────────────────────────────────────────────────────
// ErrorHandler
// ──────────────────────────────────────────────────────────────

describe('ErrorHandler', () => {
  describe('execute', () => {
    it('should return result on success', async () => {
      const handler = new ErrorHandler();
      const result = await handler.execute(
        async () => 'result',
        'test-op',
      );
      expect(result).toBe('result');
    });

    it('should classify and rethrow errors', async () => {
      const handler = new ErrorHandler();

      await expect(
        handler.execute(
          async () => { throw new Error('Network error occurred'); },
          'test-op',
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.NETWORK_UNREACHABLE,
      });
    });

    it('should retry retryable errors', async () => {
      let attempt = 0;
      const handler = new ErrorHandler({
        retryConfig: { maxRetries: 2, baseDelayMs: 10 },
      });

      const result = await handler.execute(
        async () => {
          attempt++;
          if (attempt < 3) {
            throw new NetworkError(ErrorCode.NETWORK_TIMEOUT);
          }
          return 'success';
        },
        'retry-op',
      );

      expect(result).toBe('success');
      expect(attempt).toBe(3);
    });

    it('should call onError callback', async () => {
      const onError = jest.fn();
      const handler = new ErrorHandler({
        onError,
        retryConfig: { maxRetries: 0 },
      });

      await expect(
        handler.execute(
          async () => { throw new Error('fail'); },
          'test-op',
        ),
      ).rejects.toThrow();

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(PrivacyLayerError));
    });

    it('should log operations', async () => {
      const logs: string[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => logs.push(entry.message),
      });

      const handler = new ErrorHandler({ logger });

      await handler.execute(async () => 'ok', 'logged-op');

      expect(logs).toContain('Starting operation: logged-op');
      expect(logs).toContain('Operation completed: logged-op');
    });

    it('should log errors', async () => {
      const logs: string[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => logs.push(entry.message),
      });

      const handler = new ErrorHandler({
        logger,
        retryConfig: { maxRetries: 0 },
      });

      await expect(
        handler.execute(
          async () => { throw new Error('boom'); },
          'failing-op',
        ),
      ).rejects.toThrow();

      expect(logs).toContain('Operation failed: failing-op');
    });
  });

  describe('executeSync', () => {
    it('should return result on success', () => {
      const handler = new ErrorHandler();
      const result = handler.executeSync(() => 42, 'sync-op');
      expect(result).toBe(42);
    });

    it('should classify and rethrow sync errors', () => {
      const handler = new ErrorHandler();

      expect(() =>
        handler.executeSync(() => {
          throw new Error('Invalid address format');
        }, 'sync-op'),
      ).toThrow(expect.objectContaining({
        code: ErrorCode.INVALID_ADDRESS,
      }));
    });

    it('should call onError for sync errors', () => {
      const onError = jest.fn();
      const handler = new ErrorHandler({ onError });

      expect(() =>
        handler.executeSync(() => {
          throw new Error('fail');
        }, 'sync-op'),
      ).toThrow();

      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
