/**
 * Structured Logger for WithdrawHarness
 * 
 * Provides leveled logging with structured context and sensitive data redaction.
 * 
 * **Validates: Requirement 24.2** - Comprehensive logging and redaction
 */

import { createHash } from 'crypto';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  /** Minimum log level to display */
  level: LogLevel;
  /** Whether to enable verbose output */
  verbose: boolean;
  /** Whether to redact sensitive data (secret, nullifier) */
  redactSensitive: boolean;
}

export class HarnessLogger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Internal logging implementation
   */
  private log(level: LogLevel, message: string, context?: any): void {
    if (level < this.config.level && !this.config.verbose) {
      return;
    }

    const levelName = LogLevel[level];
    const timestamp = new Date().toISOString();
    
    let logMessage = `[${timestamp}] [${levelName}] ${message}`;
    
    if (context) {
      const processedContext = this.processContext(context);
      logMessage += `\nContext: ${JSON.stringify(processedContext, null, 2)}`;
    }

    switch (level) {
      case LogLevel.DEBUG:
        if (this.config.verbose) console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  /**
   * Processes context to redact sensitive data and format buffers
   */
  private processContext(context: any): any {
    if (context === null || typeof context !== 'object') {
      return typeof context === 'bigint' ? context.toString() : context;
    }

    if (Array.isArray(context)) {
      return context.map(item => this.processContext(item));
    }

    const processed: any = {};
    for (const [key, value] of Object.entries(context)) {
      // Redact sensitive keys
      if (this.config.redactSensitive && (key === 'secret' || key === 'nullifier')) {
        processed[key] = `[REDACTED (SHA256: ${this.hashSensitive(value)})]`;
        continue;
      }

      // Format buffers and Uint8Arrays
      if (value instanceof Buffer || value instanceof Uint8Array) {
        const buf = Buffer.from(value);
        if (buf.length > 32) {
          processed[key] = `Buffer(${buf.length} bytes): ${buf.slice(0, 16).toString('hex')}...${buf.slice(-16).toString('hex')}`;
        } else {
          processed[key] = `0x${buf.toString('hex')}`;
        }
        continue;
      }

      // Handle bigints
      if (typeof value === 'bigint') {
        processed[key] = value.toString();
        continue;
      }

      // Recursively process objects
      if (typeof value === 'object') {
        processed[key] = this.processContext(value);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * Hashes sensitive data for display in redacted logs
   */
  private hashSensitive(data: any): string {
    const str = typeof data === 'string' ? data : String(data);
    return createHash('sha256').update(str).digest('hex').slice(0, 8);
  }
}
