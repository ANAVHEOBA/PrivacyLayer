// ============================================================
// PrivacyLayer SDK — Retry Logic Tests
// ============================================================

import {
  ErrorCode,
  NetworkError,
  ValidationError,
} from '../errors';
import {
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
  sleep,
  withRetry,
  retryable,
} from '../retry';

// ──────────────────────────────────────────────────────────────
// calculateDelay
// ──────────────────────────────────────────────────────────────

describe('calculateDelay', () => {
  const config: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    jitterFactor: 0, // Disable jitter for deterministic tests
  };

  it('should compute exponential backoff', () => {
    expect(calculateDelay(0, config)).toBe(1000); // 1000 * 2^0
    expect(calculateDelay(1, config)).toBe(2000); // 1000 * 2^1
    expect(calculateDelay(2, config)).toBe(4000); // 1000 * 2^2
    expect(calculateDelay(3, config)).toBe(8000); // 1000 * 2^3
  });

  it('should cap at maxDelayMs', () => {
    const capped: RetryConfig = { ...config, maxDelayMs: 5000 };

    expect(calculateDelay(0, capped)).toBe(1000);
    expect(calculateDelay(1, capped)).toBe(2000);
    expect(calculateDelay(2, capped)).toBe(4000);
    expect(calculateDelay(3, capped)).toBe(5000); // Capped
    expect(calculateDelay(10, capped)).toBe(5000); // Still capped
  });

  it('should apply jitter within bounds', () => {
    const jittered: RetryConfig = { ...config, jitterFactor: 0.5 };

    // Run many iterations to check jitter range
    for (let i = 0; i < 100; i++) {
      const delay = calculateDelay(0, jittered);
      // base = 1000, jitter = 0.5 -> range [500, 1500]
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(1500);
    }
  });

  it('should never return negative delay', () => {
    const extreme: RetryConfig = { ...config, jitterFactor: 1.0 };
    for (let i = 0; i < 100; i++) {
      expect(calculateDelay(0, extreme)).toBeGreaterThanOrEqual(0);
    }
  });

  it('should respect custom backoff multiplier', () => {
    const custom: RetryConfig = { ...config, backoffMultiplier: 3 };

    expect(calculateDelay(0, custom)).toBe(1000); // 1000 * 3^0
    expect(calculateDelay(1, custom)).toBe(3000); // 1000 * 3^1
    expect(calculateDelay(2, custom)).toBe(9000); // 1000 * 3^2
  });
});

// ──────────────────────────────────────────────────────────────
// sleep
// ──────────────────────────────────────────────────────────────

describe('sleep', () => {
  it('should resolve after the specified delay', async () => {
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40); // Allow small timing variance
  });

  it('should reject immediately if already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(sleep(1000, controller.signal)).rejects.toThrow('Retry aborted');
  });

  it('should reject when aborted during sleep', async () => {
    const controller = new AbortController();

    const sleepPromise = sleep(5000, controller.signal);

    // Abort after 10ms
    setTimeout(() => controller.abort(), 10);

    await expect(sleepPromise).rejects.toThrow('Retry aborted');
  });
});

// ──────────────────────────────────────────────────────────────
// withRetry
// ──────────────────────────────────────────────────────────────

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error and succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError(ErrorCode.NETWORK_TIMEOUT))
      .mockRejectedValueOnce(new NetworkError(ErrorCode.NETWORK_TIMEOUT))
      .mockResolvedValue('success');

    const result = await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw immediately on non-retryable error', async () => {
    const validationError = new ValidationError(ErrorCode.INVALID_ADDRESS);
    const fn = jest.fn().mockRejectedValue(validationError);

    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 10 }),
    ).rejects.toThrow(validationError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw MAX_RETRIES_EXCEEDED after exhausting retries', async () => {
    const fn = jest
      .fn()
      .mockRejectedValue(new NetworkError(ErrorCode.NETWORK_TIMEOUT));

    await expect(
      withRetry(fn, { maxRetries: 2, baseDelayMs: 10 }),
    ).rejects.toMatchObject({
      code: ErrorCode.MAX_RETRIES_EXCEEDED,
      isRetryable: false,
    });

    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should call onRetry callback for each retry', async () => {
    const onRetry = jest.fn();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError(ErrorCode.NETWORK_TIMEOUT))
      .mockResolvedValue('ok');

    await withRetry(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
      jitterFactor: 0,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.any(NetworkError),
      1,
      10, // baseDelayMs * 2^0 = 10
    );
  });

  it('should use custom shouldRetry function', async () => {
    const customShouldRetry = jest
      .fn()
      .mockReturnValueOnce(true) // retry first time
      .mockReturnValue(false); // don't retry second time

    const error = new Error('custom error');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      withRetry(fn, {
        maxRetries: 5,
        baseDelayMs: 10,
        shouldRetry: customShouldRetry,
      }),
    ).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    expect(customShouldRetry).toHaveBeenCalledTimes(2);
  });

  it('should work with zero retries', async () => {
    const fn = jest
      .fn()
      .mockRejectedValue(new NetworkError(ErrorCode.NETWORK_TIMEOUT));

    await expect(
      withRetry(fn, { maxRetries: 0 }),
    ).rejects.toMatchObject({ code: ErrorCode.MAX_RETRIES_EXCEEDED });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass through non-PrivacyLayerError on retry exhaustion', async () => {
    const rawError = new Error('raw');
    const fn = jest.fn().mockRejectedValue(rawError);

    await expect(
      withRetry(fn, {
        maxRetries: 1,
        baseDelayMs: 10,
        shouldRetry: () => true,
      }),
    ).rejects.toBe(rawError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should support abort signal cancellation', async () => {
    const controller = new AbortController();
    const fn = jest
      .fn()
      .mockRejectedValue(new NetworkError(ErrorCode.NETWORK_TIMEOUT));

    const promise = withRetry(fn, {
      maxRetries: 10,
      baseDelayMs: 5000,
      abortSignal: controller.signal,
    });

    // Abort after a short delay
    setTimeout(() => controller.abort(), 50);

    await expect(promise).rejects.toThrow('Retry aborted');
  });
});

// ──────────────────────────────────────────────────────────────
// retryable
// ──────────────────────────────────────────────────────────────

describe('retryable', () => {
  it('should create a retryable version of a function', async () => {
    let callCount = 0;
    const fn = async (x: number): Promise<number> => {
      callCount++;
      if (callCount < 3) {
        throw new NetworkError(ErrorCode.NETWORK_TIMEOUT);
      }
      return x * 2;
    };

    const retryableFn = retryable(fn, { maxRetries: 5, baseDelayMs: 10 });

    const result = await retryableFn(21);
    expect(result).toBe(42);
    expect(callCount).toBe(3);
  });

  it('should pass all arguments through', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const retryableFn = retryable(fn, { maxRetries: 1 });

    await retryableFn('a', 'b', 'c');

    expect(fn).toHaveBeenCalledWith('a', 'b', 'c');
  });
});

// ──────────────────────────────────────────────────────────────
// DEFAULT_RETRY_CONFIG
// ──────────────────────────────────────────────────────────────

describe('DEFAULT_RETRY_CONFIG', () => {
  it('should have sensible defaults', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30_000);
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
    expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.1);
  });

  it('should be frozen / read-only', () => {
    expect(Object.isFrozen(DEFAULT_RETRY_CONFIG)).toBe(true);
  });
});
