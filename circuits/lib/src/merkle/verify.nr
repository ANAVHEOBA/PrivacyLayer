use crate::merkle::root;

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
    expected_root: Field,
) {
    let computed_root = root::compute_root(leaf, index, hash_path);
    assert(computed_root == expected_root, "merkle inclusion check failed: leaf not in tree");
}
