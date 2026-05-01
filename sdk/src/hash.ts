import { Buffer } from 'buffer';

/**
 * Portable SHA-256 hashing utility for ZK artifact validation.
 * Supports both Node.js and Browser environments.
 */
export async function sha256Hex(data: Uint8Array | Buffer | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    globalThis.crypto.subtle
  ) {
    // Browser / Web Worker / Modern Node.js webcrypto
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
    return '0x' + Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Legacy Node.js fallback
    try {
      // Use dynamic import to avoid bundling 'crypto' in browsers
      const { createHash } = await import('crypto');
      return '0x' + createHash('sha256').update(Buffer.from(bytes as any)).digest('hex');
    } catch (e) {
      throw new Error(
        'SHA-256 hashing not supported in this environment. ' +
        'Ensure globalThis.crypto.subtle is available or the "crypto" module is accessible.'
      );
    }
  }
}
