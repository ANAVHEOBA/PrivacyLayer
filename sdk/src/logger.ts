// ============================================================
// PrivacyLayer SDK — Error Logger
// ============================================================
// Structured logging for SDK errors and operations.
//
// Security:
//   - NEVER logs private keys, nullifiers, or secrets
//   - Sanitizes all output before logging
//   - Configurable log levels
// ============================================================

import { PrivacyLayerError } from './errors';

// ──────────────────────────────────────────────────────────────
// Log Levels
// ──────────────────────────────────────────────────────────────

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

// ──────────────────────────────────────────────────────────────
// Logger Interface
// ──────────────────────────────────────────────────────────────

/**
 * Structured log entry for error reporting.
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    code?: string;
    isRetryable?: boolean;
  };
}

/**
 * Logger configuration.
 */
export interface LoggerConfig {
  /** Minimum log level to output. Default: WARN */
  level: LogLevel;

  /** Custom log handler. Default: console-based */
  handler?: (entry: LogEntry) => void;
}

// ──────────────────────────────────────────────────────────────
// Sensitive Field Detection
// ──────────────────────────────────────────────────────────────

/**
 * Fields that must NEVER appear in logs.
 * These patterns match private keys, secrets, and other sensitive data.
 */
const SENSITIVE_FIELDS = new Set([
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
]);

/**
 * Sanitize a details object by redacting sensitive fields.
 * Returns a new object — the original is never mutated.
 */
export function sanitizeDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ──────────────────────────────────────────────────────────────
// Logger Implementation
// ──────────────────────────────────────────────────────────────

/**
 * SDK Logger for structured error and event logging.
 *
 * @example
 * ```typescript
 * const logger = new Logger({ level: LogLevel.DEBUG });
 * logger.error('Deposit failed', error);
 * logger.info('Proof generated', { duration: 1234 });
 * ```
 */
export class Logger {
  private readonly config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: config?.level ?? LogLevel.WARN,
      handler: config?.handler,
    };
  }

  /**
   * Log a debug message.
   */
  public debug(message: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, details);
  }

  /**
   * Log an info message.
   */
  public info(message: string, details?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, details);
  }

  /**
   * Log a warning.
   */
  public warn(
    message: string,
    details?: Record<string, unknown>,
    error?: PrivacyLayerError,
  ): void {
    this.log(LogLevel.WARN, message, details, error);
  }

  /**
   * Log an error.
   */
  public error(
    message: string,
    error?: PrivacyLayerError | Error,
    details?: Record<string, unknown>,
  ): void {
    this.log(LogLevel.ERROR, message, details, error);
  }

  /**
   * Internal log method.
   */
  private log(
    level: LogLevel,
    message: string,
    details?: Record<string, unknown>,
    error?: PrivacyLayerError | Error,
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      details: details ? sanitizeDetails(details) : undefined,
    };

    if (error instanceof PrivacyLayerError) {
      entry.code = error.code;
      entry.error = {
        name: error.name,
        message: error.message,
        code: error.code,
        isRetryable: error.isRetryable,
      };
    } else if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
      };
    }

    if (this.config.handler) {
      this.config.handler(entry);
      return;
    }

    // Default console handler
    const logStr = JSON.stringify(entry);
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logStr);
        break;
      case LogLevel.INFO:
        console.info(logStr);
        break;
      case LogLevel.WARN:
        console.warn(logStr);
        break;
      case LogLevel.ERROR:
        console.error(logStr);
        break;
    }
  }
}
