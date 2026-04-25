/**
 * Browser-safe hash functions.
 *
 * Provides SHA-256 and other common hashes that work across environments:
 * - Node.js (native crypto module)
 * - Browsers (SubtleCrypto)
 *
 * NOTE: For production use with ZK circuits, you should use a dedicated
 * Poseidon hash implementation compatible with your proving system.
 */

import { detectEnv, RuntimeEnv } from './random';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A hash function that takes arbitrary bytes and returns a fixed-size digest.
 */
export interface HashFunction {
  /**
   * Compute the hash of the input data.
   */
  update(data: Buffer): this;

  /**
   * Finalize and return the digest.
   */
  digest(): Buffer;
}

// ---------------------------------------------------------------------------
// Hash implementations
// ---------------------------------------------------------------------------

/**
 * Node.js SHA-256 implementation.
 */
export class NodeSha256 implements HashFunction {
  private readonly hash: any;

  constructor() {
    const { createHash } = require('crypto');
    this.hash = createHash('sha256');
  }

  update(data: Buffer): this {
    this.hash.update(data);
    return this;
  }

  digest(): Buffer {
    return this.hash.digest();
  }
}

/**
 * Web Crypto SHA-256 implementation.
 * Note: This is async - you must await the digest promise.
 */
export class WebCryptoSha256 {
  private chunks: Buffer[] = [];

  update(data: Buffer): this {
    this.chunks.push(data);
    return this;
  }

  /**
   * WARNING: This returns a Promise, not a Buffer!
   * If you need a sync API, use Node.js or a pure-JS SHA-256 implementation.
   */
  async digest(): Promise<Buffer> {
    const data = Buffer.concat(this.chunks);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(new Uint8Array(hashBuffer));
  }
}

// ---------------------------------------------------------------------------
// Convenience API - SHA-256 (Node.js only for now due to async)
// ---------------------------------------------------------------------------

/**
 * Create a SHA-256 hash context.
 * NOTE: In browsers, this will throw - use a pure JS implementation or SubtleCrypto directly.
 */
export function createHash(algorithm: 'sha256'): HashFunction {
  if (algorithm !== 'sha256') {
    throw new Error(`Unsupported hash algorithm: ${algorithm}. Only 'sha256' is available.`);
  }

  const env = detectEnv();

  switch (env) {
    case 'node':
      return new NodeSha256();

    default:
      throw new Error(
        `Synchronous SHA-256 is not available in environment '${env}'. ` +
        `In browsers, use crypto.subtle.digest('SHA-256', data) which is async, ` +
        `or use a pure-JS SHA-256 implementation.`
      );
  }
}

/**
 * Compute SHA-256 hash of data in one call.
 */
export function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

export default {
  createHash,
  sha256,
  NodeSha256,
  WebCryptoSha256,
};
