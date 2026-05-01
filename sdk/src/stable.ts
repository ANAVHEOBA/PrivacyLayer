export type StableHashChunk = string | number | bigint | Uint8Array | Buffer;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function toBuffer(chunk: StableHashChunk): Buffer {
  if (typeof chunk === 'string') {
    return Buffer.from(chunk, 'utf8');
  }

  if (typeof chunk === 'number' || typeof chunk === 'bigint') {
    return Buffer.from(chunk.toString(), 'utf8');
  }

  return Buffer.from(chunk);
}

function packChunks(chunks: StableHashChunk[]): Buffer {
  const packed: Buffer[] = [];

  for (const chunk of chunks) {
    const bytes = toBuffer(chunk);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(bytes.length, 0);
    packed.push(len, bytes);
  }

  return Buffer.concat(packed);
}

function fnv1a(bytes: Buffer, seed: number): number {
  let hash = seed >>> 0;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Deterministic 32-byte hash utility.
 * This is for SDK stability and testing; it is NOT a replacement for Poseidon.
 *
 * NOTE (ZK-105): The first byte is cleared to ensure that the output always
 * represent a canonical field element (specifically, < 2^248, which is well
 * within the BN254 range).
 */
export function stableHash32(...chunks: StableHashChunk[]): Buffer {
  const payload = packChunks(chunks);
  const out = Buffer.alloc(32);

  for (let i = 0; i < 8; i += 1) {
    const seed = (FNV_OFFSET_BASIS ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
    const part = fnv1a(payload, seed);
    out.writeUInt32BE(part, i * 4);
  }

  // Ensure result is within BN254 field (ZK-105)
  // By clearing the first byte, we guarantee value < 2^248 < FIELD_MODULUS.
  out[0] = 0;
  return out;
}

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(value.toString());
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return JSON.stringify(Buffer.from(value).toString('hex'));
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    const body = entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',');
    return `{${body}}`;
  }

  return JSON.stringify(String(value));
}

export function normalizeHex(value: string): string {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  return normalized.toLowerCase();
}
