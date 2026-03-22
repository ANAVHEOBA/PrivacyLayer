// ============================================================
// PrivacyLayer SDK — Logger Tests
// ============================================================

import { ErrorCode, PrivacyLayerError, NetworkError } from '../errors';
import { Logger, LogLevel, LogEntry, sanitizeDetails } from '../logger';

// ──────────────────────────────────────────────────────────────
// sanitizeDetails
// ──────────────────────────────────────────────────────────────

describe('sanitizeDetails', () => {
  it('should redact sensitive fields', () => {
    const details = {
      operation: 'deposit',
      secret: 'my-secret-value',
      privateKey: 'deadbeef',
      mnemonic: 'word1 word2 word3',
      nullifier: '0xabc123',
      preimage: 'preimage-data',
    };

    const sanitized = sanitizeDetails(details);

    expect(sanitized.operation).toBe('deposit');
    expect(sanitized.secret).toBe('[REDACTED]');
    expect(sanitized.privateKey).toBe('[REDACTED]');
    expect(sanitized.mnemonic).toBe('[REDACTED]');
    expect(sanitized.nullifier).toBe('[REDACTED]');
    expect(sanitized.preimage).toBe('[REDACTED]');
  });

  it('should handle nested objects', () => {
    const details = {
      user: {
        address: 'GABC...',
        secret: 'hidden',
        wallet: {
          privateKey: 'also-hidden',
          balance: 100,
        },
      },
    };

    const sanitized = sanitizeDetails(details);

    const user = sanitized.user as Record<string, unknown>;
    expect(user.address).toBe('GABC...');
    expect(user.secret).toBe('[REDACTED]');

    const wallet = user.wallet as Record<string, unknown>;
    expect(wallet.privateKey).toBe('[REDACTED]');
    expect(wallet.balance).toBe(100);
  });

  it('should not mutate the original object', () => {
    const details = { secret: 'original' };
    sanitizeDetails(details);
    expect(details.secret).toBe('original');
  });

  it('should handle empty objects', () => {
    expect(sanitizeDetails({})).toEqual({});
  });

  it('should handle arrays as leaf values', () => {
    const details = {
      items: [1, 2, 3],
      secret: 'hidden',
    };

    const sanitized = sanitizeDetails(details);
    expect(sanitized.items).toEqual([1, 2, 3]);
    expect(sanitized.secret).toBe('[REDACTED]');
  });

  it('should redact all known sensitive field names', () => {
    const sensitiveFields = [
      'secret',
      'privateKey',
      'private_key',
      'mnemonic',
      'seed',
      'password',
      'nullifier',
      'preimage',
      'secretKey',
      'secret_key',
      'signingKey',
      'signing_key',
    ];

    const details: Record<string, string> = {};
    for (const field of sensitiveFields) {
      details[field] = 'sensitive-value';
    }

    const sanitized = sanitizeDetails(details);

    for (const field of sensitiveFields) {
      expect(sanitized[field]).toBe('[REDACTED]');
    }
  });
});

// ──────────────────────────────────────────────────────────────
// Logger
// ──────────────────────────────────────────────────────────────

describe('Logger', () => {
  describe('log level filtering', () => {
    it('should filter messages below configured level', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.WARN,
        handler: (entry) => entries.push(entry),
      });

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(entries).toHaveLength(2);
      expect(entries[0].message).toBe('warn msg');
      expect(entries[1].message).toBe('error msg');
    });

    it('should log everything at DEBUG level', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(entries).toHaveLength(4);
    });

    it('should log nothing at SILENT level', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.SILENT,
        handler: (entry) => entries.push(entry),
      });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(entries).toHaveLength(0);
    });
  });

  describe('log entries', () => {
    it('should include timestamp', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      logger.info('test');

      expect(entries[0].timestamp).toBeDefined();
      expect(new Date(entries[0].timestamp).getTime()).not.toBeNaN();
    });

    it('should include log level', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(entries[0].level).toBe(LogLevel.DEBUG);
      expect(entries[1].level).toBe(LogLevel.INFO);
      expect(entries[2].level).toBe(LogLevel.WARN);
      expect(entries[3].level).toBe(LogLevel.ERROR);
    });

    it('should sanitize details automatically', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      logger.info('test', { secret: 'hidden', visible: 'ok' });

      expect(entries[0].details?.secret).toBe('[REDACTED]');
      expect(entries[0].details?.visible).toBe('ok');
    });

    it('should include PrivacyLayerError details', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      const err = new NetworkError(ErrorCode.NETWORK_TIMEOUT);
      logger.error('failed', err);

      expect(entries[0].error).toBeDefined();
      expect(entries[0].error?.name).toBe('NetworkError');
      expect(entries[0].error?.code).toBe(ErrorCode.NETWORK_TIMEOUT);
      expect(entries[0].error?.isRetryable).toBe(true);
    });

    it('should include plain Error details', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      const err = new Error('raw error');
      logger.error('failed', err);

      expect(entries[0].error).toBeDefined();
      expect(entries[0].error?.name).toBe('Error');
      expect(entries[0].error?.message).toBe('raw error');
    });

    it('should include error code', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        level: LogLevel.DEBUG,
        handler: (entry) => entries.push(entry),
      });

      const err = new PrivacyLayerError(ErrorCode.INTERNAL_ERROR);
      logger.error('test', err);

      expect(entries[0].code).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('default handler', () => {
    it('should use console methods when no custom handler', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const logger = new Logger({ level: LogLevel.ERROR });
      logger.error('test error');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('should use correct console method per level', () => {
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      const logger = new Logger({ level: LogLevel.DEBUG });
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(debugSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledTimes(1);

      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('default config', () => {
    it('should default to WARN level', () => {
      const entries: LogEntry[] = [];
      const logger = new Logger({
        handler: (entry) => entries.push(entry),
      });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');

      expect(entries).toHaveLength(1);
      expect(entries[0].message).toBe('w');
    });
  });
});
