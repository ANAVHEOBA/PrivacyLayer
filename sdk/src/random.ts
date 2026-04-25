/**
 * Browser-safe cryptographically secure random number generation.
 *
 * Provides environment detection and graceful fallbacks for:
 * - Node.js (native crypto module)
 * - Browsers (Web Crypto API)
 * - Cloudflare Workers / Deno (Web Crypto API)
 * - Other runtimes (throws helpful error with instructions)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A secure random source that can generate cryptographically safe bytes.
 */
export interface RandomSource {
  /**
   * Generate `n` cryptographically secure random bytes.
   */
  randomBytes(n: number): Buffer;
}

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

/**
 * Detected execution environment.
 */
export type RuntimeEnv =
  | 'node'        // Node.js
  | 'browser'     // Web browser
  | 'worker'      // Web Worker / Cloudflare Worker
  | 'deno'        // Deno
  | 'unknown';    // ¯\_(ツ)_/¯

/**
 * Detect the current execution environment.
 */
export function detectEnv(): RuntimeEnv {
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }

  if (typeof self !== 'undefined' && self.crypto) {
    // Check for Cloudflare Worker or Web Worker
    if (typeof (self as any).addEventListener !== 'undefined' && !self.document) {
      return 'worker';
    }
    return 'browser';
  }

  if (typeof (globalThis as any).Deno !== 'undefined') {
    return 'deno';
  }

  return 'unknown';
}

// ---------------------------------------------------------------------------
// Random source implementations
// ---------------------------------------------------------------------------

/**
 * Node.js random source using built-in crypto module.
 */
export class NodeRandomSource implements RandomSource {
  private readonly rb: (n: number) => Buffer;

  constructor() {
    // Lazy-require to avoid breaking browser bundlers
    const { randomBytes } = require('crypto');
    this.rb = randomBytes;
  }

  randomBytes(n: number): Buffer {
    return this.rb(n);
  }
}

/**
 * Web Crypto API random source (works in browsers, Deno, and Cloudflare Workers).
 */
export class WebCryptoRandomSource implements RandomSource {
  private readonly crypto: Crypto;

  constructor(cryptoImpl?: Crypto) {
    this.crypto = cryptoImpl || self.crypto;
    if (!this.crypto?.getRandomValues) {
      throw new Error(
        'Web Crypto API is not available in this environment. ' +
        'You may need to use a Node.js polyfill or provide a custom RandomSource.'
      );
    }
  }

  randomBytes(n: number): Buffer {
    const arr = new Uint8Array(n);
    this.crypto.getRandomValues(arr);
    return Buffer.from(arr);
  }
}

/**
 * Random source that always throws.
 * Used as the default fallback when no secure RNG is available.
 */
export class ThrowingRandomSource implements RandomSource {
  constructor(public readonly env: RuntimeEnv) {}

  randomBytes(n: number): Buffer {
    throw new Error(
      `No cryptographically secure random source available in detected environment '${this.env}'. ` +
      `Please provide a custom RandomSource implementation for this runtime. ` +
      `In Node.js, ensure you can 'require("crypto")'. ` +
      `In browsers, ensure you're running in a secure context (HTTPS or localhost).`
    );
  }
}

// ---------------------------------------------------------------------------
// Default source auto-selection
// ---------------------------------------------------------------------------

let defaultSource: RandomSource | undefined;

/**
 * Get the default random source for this environment.
 * The source is lazily detected on first call and cached.
 */
export function getDefaultRandomSource(): RandomSource {
  if (defaultSource) {
    return defaultSource;
  }

  const env = detectEnv();

  switch (env) {
    case 'node':
      defaultSource = new NodeRandomSource();
      break;

    case 'browser':
    case 'worker':
    case 'deno':
      defaultSource = new WebCryptoRandomSource();
      break;

    default:
      defaultSource = new ThrowingRandomSource(env);
  }

  return defaultSource;
}

/**
 * Override the default random source.
 * Useful for:
 * - Testing with deterministic mocks
 * - Using an HSM or hardware RNG
 * - Unsupported runtimes
 */
export function setDefaultRandomSource(source: RandomSource): void {
  defaultSource = source;
}

/**
 * Clear the cached default source, forcing re-detection on next use.
 */
export function clearDefaultRandomSource(): void {
  defaultSource = undefined;
}

/**
 * Generate random bytes using the default source.
 * Convenience export for callers.
 */
export function randomBytes(n: number): Buffer {
  return getDefaultRandomSource().randomBytes(n);
}

export default {
  randomBytes,
  getDefaultRandomSource,
  setDefaultRandomSource,
  clearDefaultRandomSource,
  detectEnv,
  NodeRandomSource,
  WebCryptoRandomSource,
  ThrowingRandomSource,
};
