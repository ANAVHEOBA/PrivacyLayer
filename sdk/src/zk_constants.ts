export const MERKLE_TREE_DEPTH = 20;

export const NOTE_SCALAR_BYTE_LENGTH = 31;
export const MERKLE_NODE_BYTE_LENGTH = 32;
export const FIELD_BYTE_LENGTH = 32;

export const GROTH16_PROOF_BYTE_LENGTH = 256;

export const ZERO_FIELD_HEX = '0'.repeat(64);

/**
 * Canonical Stellar zero-account strkey used as the default relayer when no
 * relayer is configured. The matching field representation is `ZERO_FIELD_HEX`.
 */
export const STELLAR_ZERO_ACCOUNT =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

// BN254 scalar field prime
// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
export const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const XLM_DECIMALS = 7;
export const STROOPS_PER_XLM = 10_000_000n;

/**
 * Domain separator for nullifier hashing (ZK-017).
 *
 * ASCII bytes of "nullifier_domain_v1" left-padded to 32 bytes, expressed as a
 * 64-character hex string.  Must exactly match NULLIFIER_DOMAIN_SEP in
 * circuits/lib/src/hash/nullifier.nr so both stacks produce identical hashes.
 */
export const NULLIFIER_DOMAIN_SEP_HEX =
  '0000000000000000000000000000006e756c6c69666965725f646f6d61696e5f7631';

export const NOTE_BACKUP_VERSION = 0x01;
export const NOTE_BACKUP_PREFIX = 'privacylayer-note:';
export const NOTE_BACKUP_AMOUNT_BYTE_LENGTH = 8;
export const NOTE_BACKUP_CHECKSUM_BYTE_LENGTH = 4;
export const NOTE_BACKUP_PAYLOAD_LENGTH =
  1 + NOTE_SCALAR_BYTE_LENGTH + NOTE_SCALAR_BYTE_LENGTH + FIELD_BYTE_LENGTH + NOTE_BACKUP_AMOUNT_BYTE_LENGTH + NOTE_BACKUP_CHECKSUM_BYTE_LENGTH;
