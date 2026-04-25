/// Shared ZK protocol constants used by PrivacyLayer circuits.
/// Keep these values in sync with sdk/src/constants.ts.

/// Tree depth constant - must match the Soroban contract and SDK.
pub global TREE_DEPTH: u32 = 20;

/// BN254-safe byte width for note nullifier and secret scalars.
pub global NOTE_SCALAR_BYTES: u32 = 31;

/// Canonical byte width for field/node identifiers.
pub global FIELD_BYTES: u32 = 32;

/// Zero leaf/sibling value used by empty Merkle tree paths.
pub global ZERO_LEAF: Field = 0;

/// Relayer field value required when fee is zero.
pub global ZERO_RELAYER: Field = 0;
