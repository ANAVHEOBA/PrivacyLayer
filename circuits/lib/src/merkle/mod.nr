// ============================================================
// Merkle Tree Library
// ============================================================
// Provides an incremental Merkle tree path verifier for use
// in the withdrawal proof circuit.
//
// The public API remains small while implementation details are
// separated into config, root computation, and verification logic.
// ============================================================

pub mod config;
pub mod root;
pub mod verify;

/// Tree depth constant - must match the Soroban contract.
pub global TREE_DEPTH: u32 = config::TREE_DEPTH;

/// Compute the Merkle root from a leaf and its authentication path.
pub fn compute_root(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
) -> Field {
    root::compute_root(leaf, index, hash_path)
}

/// Verify that a leaf is included in the Merkle tree with the given root.
pub fn verify_inclusion(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
    root: Field,
) {
    verify::verify_inclusion(leaf, index, hash_path, root)
}
