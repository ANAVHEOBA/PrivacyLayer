export interface SecureRandomSource {
  randomBytes(length: number): Buffer;
}

export class SecureRandomUnavailableError extends Error {
  constructor(message = 'Secure random bytes are unavailable in this runtime') {
    super(message);
    this.name = 'SecureRandomUnavailableError';
  }
}

export type CryptoLike = {
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
};

type RuntimeGlobal = typeof globalThis & {
  crypto?: CryptoLike;
  msCrypto?: CryptoLike;
};

let overrideRandomSource: SecureRandomSource | undefined;

function getRuntimeCrypto(): CryptoLike | undefined {
  const runtime = globalThis as RuntimeGlobal;
  return runtime.crypto ?? runtime.msCrypto;
}

function browserRandomBytes(length: number, cryptoImpl: CryptoLike): Buffer {
  if (!cryptoImpl.getRandomValues) {
    throw new SecureRandomUnavailableError('Runtime crypto does not expose getRandomValues');
  }

  const bytes = new Uint8Array(length);
  // Web Crypto limits getRandomValues calls to 65,536 bytes. Note generation only
  // asks for 31-byte scalars, but chunking keeps the boundary generally safe.
  for (let offset = 0; offset < bytes.length; offset += 65536) {
    cryptoImpl.getRandomValues(bytes.subarray(offset, Math.min(offset + 65536, bytes.length)));
  }
  return Buffer.from(bytes);
}

function nodeRandomBytes(length: number): Buffer | undefined {
  try {
    // Keep this as a runtime lookup instead of a top-level import so browser
    // bundles can load the SDK without eagerly requiring Node's crypto module.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto') as { randomBytes?: (size: number) => Buffer };
    if (typeof nodeCrypto.randomBytes === 'function') {
      return nodeCrypto.randomBytes(length);
    }
  } catch {
    // Ignore and fall through to the clear failure below.
  }
  return undefined;
}

export function secureRandomBytesForRuntime(
  length: number,
  cryptoImpl: CryptoLike | undefined,
  nodeSource: ((size: number) => Buffer | undefined) | undefined
): Buffer {
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new RangeError('Random byte length must be a positive safe integer');
  }

  if (cryptoImpl?.getRandomValues) {
    return browserRandomBytes(length, cryptoImpl);
  }

  const nodeBytes = nodeSource?.(length);
  if (nodeBytes) {
    return nodeBytes;
  }

  throw new SecureRandomUnavailableError(
    'Secure random bytes require Web Crypto getRandomValues or Node crypto.randomBytes'
  );
}

export function secureRandomBytes(length: number): Buffer {
  if (overrideRandomSource) {
    const bytes = overrideRandomSource.randomBytes(length);
    if (!Buffer.isBuffer(bytes) || bytes.length !== length) {
      throw new SecureRandomUnavailableError(`Injected random source must return exactly ${length} bytes`);
    }
    return Buffer.from(bytes);
  }

  return secureRandomBytesForRuntime(length, getRuntimeCrypto(), nodeRandomBytes);
}

export function withSecureRandomSourceForTesting<T>(source: SecureRandomSource | undefined, fn: () => T): T {
  const previous = overrideRandomSource;
  overrideRandomSource = source;
  try {
    return fn();
  } finally {
    overrideRandomSource = previous;
  }
}
