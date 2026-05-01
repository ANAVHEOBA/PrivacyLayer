use crate::hash;
use crate::merkle::config;
use crate::merkle::index;

/// Compute the Merkle root from a leaf and its authentication path.
///
/// # Arguments
/// - `leaf`      : the commitment being proven (Hash(nullifier, secret))
/// - `index`     : the leaf position in the tree (determines left/right at each level)
/// - `hash_path` : authentication path - sibling hashes at each level
///
/// # Returns
/// The computed Merkle root. Must match the on-chain root to prove inclusion.
///
/// # Security
/// The leaf index is decomposed into exactly 20 bits with a round-trip check.
/// Left/right decisions at each tree level are driven by these explicit bits,
/// ensuring that out-of-range indices are rejected and path traversal cannot
/// be influenced by unchecked field arithmetic.
pub fn compute_root(
    leaf: Field,
    index: Field,
    hash_path: [Field; 20],
) -> Field {
    // Decompose index into 20 bits with range validation.
    // This guarantees index is in [0, 2^20 - 1] and the bits faithfully
    // represent the index value (no silent truncation of higher bits).
    let index_bits: [bool; 20] = index::decompose_and_validate(index);

    let mut current = leaf;

    // Bit 0 = deepest level (leaf level), bit 19 = root level.
    for i in 0..config::TREE_DEPTH {
        let is_right = index_bits[i];
        let left  = if is_right { hash_path[i] } else { current };
        let right = if is_right { current } else { hash_path[i] };
        current = hash::hash_pair(left, right);
    }

    current
}
