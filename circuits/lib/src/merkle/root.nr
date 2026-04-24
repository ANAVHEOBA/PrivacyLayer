use crate::hash;
use crate::merkle::config;

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
    // Bit 0 = deepest level (leaf level), bit 19 = root level.
    let index_bits: [bool; 20] = index.to_le_bits();
    let mut current = leaf;

    for i in 0..config::TREE_DEPTH {
        let is_right = index_bits[i];
        let left = if is_right { hash_path[i] } else { current };
        let right = if is_right { current } else { hash_path[i] };
        current = hash::hash_pair(left, right);
    }

    current
}
