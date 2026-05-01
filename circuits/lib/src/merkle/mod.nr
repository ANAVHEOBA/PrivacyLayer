// ============================================================
// Merkle Tree Library
// ============================================================
// Provides an incremental Merkle tree path verifier for use
// in the withdrawal proof circuit.
//
// Security: The leaf index is decomposed into exactly 20 bits
// with a round-trip reconstruction check inside compute_root.
// This ensures:
//   1. Indices outside [0, 2^20-1] are rejected deterministically
//   2. Left/right path decisions use explicit validated bits
//   3. No unchecked field arithmetic influences tree traversal
// ============================================================

pub mod config;
pub mod index;
pub mod root;
pub mod verify;

/// Tree depth constant - must match the Soroban contract.
pub global TREE_DEPTH: u32 = config::TREE_DEPTH;

/// Compute the Merkle root from a leaf and its authentication path.
///
/// The leaf index is decomposed into exactly 20 bits and range-validated
/// internally. Out-of-range indices will cause an assertion failure.
pub fn compute_root(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
) -> Field {
    // Range validation and bit decomposition happen inside root::compute_root
    root::compute_root(leaf, index, hash_path)
}

/// Verify that a leaf is included in the Merkle tree with the given root.
///
/// The leaf index is range-validated via explicit 20-bit decomposition
/// before verifying inclusion. Out-of-range indices cause assertion failure.
pub fn verify_inclusion(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
    root: Field,
) {
    verify::verify_inclusion(leaf, index, hash_path, root)
}
