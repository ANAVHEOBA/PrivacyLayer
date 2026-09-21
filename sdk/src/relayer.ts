/**
 * Relayer handling utilities – a single source of truth for encoding/decoding
 * relayer information across the SDK.
 *
 * The relayer field is optional:
 *   - `null`  → no relayer (empty byte array)
 *   - `{ address, fee }` → relayer with fee
 *
 * Encoding format (canonical):
 *   - 1 byte   : presence flag (0 = none, 1 = present)
 *   - 32 bytes : address (if present)
 *   - 8 bytes  : fee as u64 little‑endian (if present)
 */

export type Relayer = {
  address: string; // Stellar address (hex, 32‑byte)
  fee: bigint;    // Fee in stroops (u64)
} | null;

/**
 * Encode a Relayer into a Uint8Array following the canonical format.
 */
export function encodeRelayer(relayer: Relayer): Uint8Array {
  if (relayer === null) {
    // No relayer → single zero byte
    return new Uint8Array([0]);
  }

  const addressBytes = hexToBytes(relayer.address);
  if (addressBytes.length !== 32) {
    throw new Error('Relayer address must be 32 bytes');
  }

  const feeBytes = new Uint8Array(8);
  const feeBig = BigInt(relayer.fee);
  for (let i = 0; i < 8; i++) {
    feeBytes[i] = Number((feeBig >> BigInt(8 * i)) & BigInt(0xff));
  }

  const out = new Uint8Array(1 + 32 + 8);
  out[0] = 1; // present
  out.set(addressBytes, 1);
  out.set(feeBytes, 33);
  return out;
}

/**
 * Decode a Uint8Array (produced by `encodeRelayer`) back into a Relayer.
 */
export function decodeRelayer(data: Uint8Array): Relayer {
  if (data.length === 0) {
    throw new Error('Relayer data cannot be empty');
  }
  const flag = data[0];
  if (flag === 0) {
    // No relayer – must be exactly one byte
    if (data.length !== 1) {
      throw new Error('Malformed relayer encoding (extra bytes after zero flag)');
    }
    return null;
  }
  if (flag !== 1) {
    throw new Error('Invalid relayer presence flag');
  }
  if (data.length !== 1 + 32 + 8) {
    throw new Error('Malformed relayer encoding (incorrect length)');
  }
  const address = bytesToHex(data.slice(1, 33));
  const fee = data.slice(33, 41).reduceRight((acc, byte, idx) => {
    return (acc << 8n) | BigInt(byte);
  }, 0n);
  return { address, fee };
}

/* Helper utilities – kept local to avoid circular imports */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}
function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
