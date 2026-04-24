use crate::hash::pair;

/// Compute zero-value leaf hash.
/// Used to fill empty positions in the tree.
pub fn zero_leaf() -> Field {
    pair::hash_pair(0, 0)
}
