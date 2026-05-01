/// Tree depth constant - must match the Soroban contract.
use crate::constants;

/// Fixed production depth used by the withdrawal circuit package.
pub global PRODUCTION_TREE_DEPTH: u32 = constants::MERKLE_TREE_DEPTH;

/// Alias retained for existing call sites in the circuit library.
pub global TREE_DEPTH: u32 = PRODUCTION_TREE_DEPTH;
