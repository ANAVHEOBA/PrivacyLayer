// ============================================================
// Merkle Tree Library
// ============================================================
// Provides an incremental Merkle tree path verifier for use
// in the withdrawal proof circuit.
//
// Tree configuration:
//   - Depth: 20 levels - supports up to 2^20 = 1,048,576 notes
//   - Hash: Pedersen (BN254-friendly)
//   - Zero values: Hash(0, 0) propagated up the tree
//
// Inspired by:
//   - Tornado Cash MerkleTreeWithHistory.sol
//   - Penumbra tiered commitment tree (penumbra-sdk-tct)
// ============================================================

use crate::hash;

/// Tree depth constant - must match the Soroban contract
pub global TREE_DEPTH: u32 = 20;

/// Compute the Merkle root from a leaf and its authentication path.
///
/// # Arguments
/// - `leaf`      : the commitment being proven (Hash(nullifier, secret))
/// - `index`     : the leaf position in the tree (determines left/right at each level)
/// - `hash_path` : authentication path - sibling hashes at each level
///
/// # Returns
/// The computed Merkle root. Must match the on-chain root to prove inclusion.
pub fn compute_root(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
) -> Field {
    // Decompose index into bits to determine left/right at each level
    // Bit 0 = deepest level (leaf level), bit 19 = root level
    // Use unconstrained to compute bits without adding constraints in the main circuit
    unconstrained fn get_index_bits(index: Field) -> [u1; 20] {
        index.to_le_bits()
    }
    let index_bits = get_index_bits(index);

    let mut current = leaf;

    for i in 0..20 {
        // At level i: if bit i is 0, current is left child; if 1, it's right child
        let is_right = index_bits[i] != 0;

        // Optimize: use arithmetic selection which is more efficient than if statements
        // left = is_right * hash_path[i] + (1 - is_right) * current
        // right = is_right * current + (1 - is_right) * hash_path[i]
        // This uses two multiplications per level, which is optimal
        let is_right_field = is_right as Field;
        let one_minus_is_right = 1 - is_right_field;
        
        let left = is_right_field * hash_path[i] + one_minus_is_right * current;
        let right = is_right_field * current + one_minus_is_right * hash_path[i];

        current = hash::hash_pair(left, right);
    }

    current
}

/// Verify that a leaf is included in the Merkle tree with the given root.
///
/// # Arguments
/// - `leaf`      : leaf value to verify
/// - `index`     : leaf position
/// - `hash_path` : authentication path
/// - `root`      : expected Merkle root (public)
///
/// # Panics
/// Asserts if the computed root does not match the expected root.
pub fn verify_inclusion(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
    root: Field,
) {
    let computed_root = compute_root(leaf, index, hash_path);
    assert(computed_root == root, "merkle inclusion check failed: leaf not in tree");
}
