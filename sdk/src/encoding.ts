import { encodeRelayer, Relayer } from './relayer';

/**
 * Existing encoding utilities – now delegate relayer handling to the
 * canonical Relayer encoder.
 */

export function encodeWithdrawPayload(
  recipient: string,
  amount: bigint,
  relayer: Relayer,
  // other fields omitted for brevity
): Uint8Array {
  // Example: concatenate fields in the order expected by the circuit.
  const recipientBytes = hexToBytes(recipient);
  const amountBytes = u64ToLeBytes(amount);
  const relayerBytes = encodeRelayer(relayer);

  // Simple concatenation – actual implementation may include length prefixes.
  const payload = new Uint8Array(
    recipientBytes.length + amountBytes.length + relayerBytes.length,
  );
  let offset = 0;
  payload.set(recipientBytes, offset);
  offset += recipientBytes.length;
  payload.set(amountBytes, offset);
  offset += amountBytes.length;
  payload.set(relayerBytes, offset);
  return payload;
}

/* Existing helpers – unchanged */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}
function u64ToLeBytes(v: bigint): Uint8Array {
  const out = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    out[i] = Number((v >> BigInt(8 * i)) & BigInt(0xff));
  }
  return out;
}
