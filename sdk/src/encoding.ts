import { createHash } from './hash';

// BN254 scalar field prime
// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Convert a bigint field element to a canonical 64-character hex string (32 bytes).
 * Throws if the value lies outside the BN254 scalar field.
 */
export function fieldToHex(n: bigint): string {
  if (n < 0n || n >= FIELD_MODULUS) {
    throw new RangeError(`Field element out of BN254 range: ${n}`);
  }
  return n.toString(16).padStart(64, '0');
}

/**
 * Parse a hex string (with or without 0x prefix) into a bigint field element.
 * Reduces modulo the field prime so callers can pass raw hash digests.
 */
export function hexToField(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length === 0) throw new Error('Empty hex string');
  const n = BigInt('0x' + clean) % FIELD_MODULUS;
  return n;
}

/**
 * Interpret a Buffer as a big-endian unsigned integer and return it reduced
 * modulo the BN254 field prime.
 */
export function bufferToField(buf: Buffer): bigint {
  if (buf.length === 0) throw new Error('Cannot convert empty buffer to field element');
  return BigInt('0x' + buf.toString('hex')) % FIELD_MODULUS;
}

/**
 * Serialize a field element to a fixed-length Buffer (big-endian).
 * Useful when building raw byte payloads for Soroban host calls.
 */
export function fieldToBuffer(n: bigint, byteLength: number = 32): Buffer {
  if (n < 0n || n >= FIELD_MODULUS) {
    throw new RangeError(`Field element out of BN254 range: ${n}`);
  }
  const buf = Buffer.alloc(byteLength);
  let val = n;
  for (let i = byteLength - 1; i >= 0; i--) {
    buf[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  return buf;
}

/**
 * Encode a 31-byte note scalar (nullifier or secret) as a 64-char circuit field hex string.
 * Note scalars are 31 bytes so they fit unconditionally within the BN254 field (< 2^248 < r).
 */
export function noteScalarToField(buf: Buffer): string {
  if (buf.length !== 31) {
    throw new Error(`Note scalar must be 31 bytes, got ${buf.length}`);
  }
  return fieldToHex(bufferToField(buf));
}

/**
 * Encode a 32-byte Merkle node (root or path element) as a circuit field hex string.
 * Values are reduced modulo the field prime before encoding.
 */
export function merkleNodeToField(buf: Buffer): string {
  if (buf.length !== 32) {
    throw new Error(`Merkle node must be 32 bytes, got ${buf.length}`);
  }
  return fieldToHex(bufferToField(buf));
}

/**
 * Encode a Stellar public key (G… Strkey address) as a circuit field element.
 *
 * The Stellar address is hashed with SHA-256 and the digest is reduced modulo
 * the BN254 field prime, producing a deterministic field-sized value.  This
 * mirrors the on-chain address_decoder used in the Soroban contract.
 */
export function stellarAddressToField(address: string): string {
  const digest = createHash('sha256').update(Buffer.from(address, 'utf8')).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

/**
 * Compute the nullifier hash: H(nullifier_field, root_field).
 *
 * The withdrawal circuit defines:
 *   nullifier_hash = pedersen_hash([nullifier, root])
 *
 * This implementation uses SHA-256 as a structural stand-in.  Replace the
 * hash call with a BN254 Pedersen implementation (e.g. @noir-lang/barretenberg)
 * before running against a real prover.
 */
export function computeNullifierHash(nullifierField: string, rootField: string): string {
  const input = Buffer.concat([
    Buffer.from(nullifierField.padStart(64, '0'), 'hex'),
    Buffer.from(rootField.padStart(64, '0'), 'hex'),
  ]);
  const digest = createHash('sha256').update(input).digest();
  return fieldToHex(BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS);
}

/**
 * Pack the six public inputs of the withdrawal circuit in the canonical order
 * defined by circuits/withdraw/src/main.nr:
 *
 *   root | nullifier_hash | recipient | amount | relayer | fee
 */
export function packWithdrawalPublicInputs(
  root: string,
  nullifierHash: string,
  recipient: string,
  amount: bigint,
  relayer: string,
  fee: bigint
): string[] {
  return [root, nullifierHash, recipient, amount.toString(), relayer, fee.toString()];
}
