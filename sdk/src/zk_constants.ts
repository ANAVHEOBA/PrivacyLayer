export const MERKLE_TREE_DEPTH = 20;

export const NOTE_SCALAR_BYTE_LENGTH = 31;
export const MERKLE_NODE_BYTE_LENGTH = 32;
export const FIELD_BYTE_LENGTH = 32;

export const GROTH16_PROOF_BYTE_LENGTH = 256;

export const ZERO_FIELD_HEX = '0'.repeat(64);

/**
 * Canonical Stellar zero-account strkey — the "no-relayer" sentinel (ZK-104).
 *
 * SEMANTICS (decided by ZK-104):
 *   - This address is NOT a real funded account; it MUST NOT be used as a
 *     recipient or as a party to any on-chain transaction other than as the
 *     optional-relayer sentinel.
 *   - SDK relayer paths: when `relayer` is omitted or set to this value, the
 *     encoded relayer field is `ZERO_FIELD_HEX` (32 bytes of 0x00) and fee
 *     MUST also be zero.
 *   - Contract side: `decode_optional_relayer` in address_decoder.rs returns
 *     `None` when it receives 32 zero bytes, which matches this sentinel.
 *   - Validation: `encodeStellarAddress(STELLAR_ZERO_ACCOUNT)` encodes to
 *     `ZERO_FIELD_HEX`.  This is intentional and does NOT mean the address is
 *     a valid funding destination.
 *   - Tests: a zero-account passed as recipient is INVALID and must be rejected
 *     by the witness validator.  A zero-account passed as relayer is VALID and
 *     means "no relayer".
 *
 * The matching field representation is `ZERO_FIELD_HEX`.
 */
export const STELLAR_ZERO_ACCOUNT =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

/**
 * Helper: returns true if the given Stellar strkey is the zero-account
 * sentinel (i.e. the no-relayer indicator).  Do NOT use this to validate
 * recipient addresses — recipients must be non-zero.
 */
export function isZeroAccountSentinel(address: string): boolean {
  return address === STELLAR_ZERO_ACCOUNT;
}

// BN254 scalar field prime
// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
export const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const XLM_DECIMALS = 7;
export const STROOPS_PER_XLM = 10_000_000n;

// ============================================================
// Denomination Constants (ZK-030)
// ============================================================
// Fixed-denomination pools enforce that withdrawals can only
// occur for the exact amount class of the pool. This prevents
// amount manipulation and ensures consistency between note
// commitments and withdrawal proofs.
//
// Denomination values are expressed in the smallest unit (stroops for XLM).
// Common denominations:
// - 100 XLM  = 1_000_000_000 stroops
// - 1000 XLM = 10_000_000_000 stroops
// - 10000 XLM = 100_000_000_000 stroops
// ============================================================

export const DENOMINATION_100_XLM = 1_000_000_000n;
export const DENOMINATION_1000_XLM = 10_000_000_000n;
export const DENOMINATION_10000_XLM = 100_000_000_000n;

// Default denomination for testing (100 XLM)
export const DEFAULT_DENOMINATION = DENOMINATION_100_XLM;

/**
 * Domain separator for nullifier hashing (ZK-017).
 *
 * ASCII bytes of "nullifier_domain_v1" left-padded to 32 bytes, expressed as a
 * 64-character hex string.  Must exactly match NULLIFIER_DOMAIN_SEP in
 * circuits/lib/src/hash/nullifier.nr so both stacks produce identical hashes.
 */
export const NULLIFIER_DOMAIN_SEP_HEX =
  '000000000000000000000000006e756c6c69666965725f646f6d61696e5f7631';

export const NOTE_BACKUP_VERSION = 0x01;
export const NOTE_BACKUP_PREFIX = 'privacylayer-note:';
export const NOTE_BACKUP_AMOUNT_BYTE_LENGTH = 8;
export const NOTE_BACKUP_DENOMINATION_BYTE_LENGTH = 8;
export const NOTE_BACKUP_CHECKSUM_BYTE_LENGTH = 4;
export const NOTE_BACKUP_PAYLOAD_LENGTH =
  1 + NOTE_SCALAR_BYTE_LENGTH + NOTE_SCALAR_BYTE_LENGTH + FIELD_BYTE_LENGTH +
  NOTE_BACKUP_AMOUNT_BYTE_LENGTH + NOTE_BACKUP_DENOMINATION_BYTE_LENGTH + NOTE_BACKUP_CHECKSUM_BYTE_LENGTH;
