// Shared ZK protocol constants used by the TypeScript SDK.
// Keep these values in sync with circuits/lib/src/constants.nr.

/** Number of levels in the shielded-pool Merkle tree. */
export const ZK_TREE_DEPTH = 20;

/** Maximum 0-based leaf index accepted for the configured tree depth. */
export const ZK_MAX_LEAF_INDEX = (1 << ZK_TREE_DEPTH) - 1;

/** Byte length for note nullifier and secret scalars that must fit BN254. */
export const ZK_NOTE_SCALAR_BYTES = 31;

/** Byte length for canonical field/node/pool identifiers. */
export const ZK_FIELD_BYTES = 32;
export const ZK_POOL_ID_BYTES = ZK_FIELD_BYTES;

/** Portable note backup format layout. */
export const NOTE_BACKUP_VERSION = 0x01;
export const NOTE_BACKUP_PREFIX = 'privacylayer-note:';
export const NOTE_AMOUNT_BYTES = 8;
export const NOTE_CHECKSUM_BYTES = 4;
export const NOTE_BACKUP_PAYLOAD_LENGTH =
  1 + ZK_NOTE_SCALAR_BYTES + ZK_NOTE_SCALAR_BYTES + ZK_POOL_ID_BYTES + NOTE_AMOUNT_BYTES + NOTE_CHECKSUM_BYTES;
export const NOTE_BACKUP_CHECKSUM_OFFSET = NOTE_BACKUP_PAYLOAD_LENGTH - NOTE_CHECKSUM_BYTES;

/** Legacy note serialization reserves 16 bytes for the amount field. */
export const LEGACY_NOTE_AMOUNT_SLOT_BYTES = 16;

/** A valid Stellar zero account used only when no relayer fee is charged. */
export const ZERO_RELAYER_STELLAR_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
