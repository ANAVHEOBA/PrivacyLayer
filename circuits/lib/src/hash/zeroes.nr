use crate::hash::pair;

/// Canonical zero leaf: H(0, 0). Uniform placeholder for empty Merkle positions.
pub fn zero_leaf() -> Field {
    pair::hash_pair(0, 0)
}

/// Zero node at the given tree level, derived deterministically from zero_leaf().
/// Level 0 = zero_leaf(); level i = H(zero_node(i-1), zero_node(i-1)).
pub fn zero_node_at_level(level: u32) -> Field {
    let mut z = zero_leaf();
    for i in 0_u32..20_u32 {
        if i < level {
            z = pair::hash_pair(z, z);
        }
    }
    z
}

/// Canonical zero-sibling path for a sparse single-leaf tree.
/// path[i] = zero_node_at_level(i), matching every empty sibling at each level.
pub fn zero_sibling_path() -> [Field; 20] {
    let mut path: [Field; 20] = [0; 20];
    let mut z = zero_leaf();
    for i in 0..20 {
        path[i] = z;
        z = pair::hash_pair(z, z);
    }
    path
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_leaf_is_nonzero() {
        assert(zero_leaf() != 0, "zero_leaf must not be the field zero");
    }

    #[test]
    fn test_zero_node_level_zero_equals_zero_leaf() {
        assert(zero_node_at_level(0) == zero_leaf());
    }

    #[test]
    fn test_zero_node_levels_are_distinct() {
        let z0 = zero_node_at_level(0);
        let z1 = zero_node_at_level(1);
        let z2 = zero_node_at_level(2);
        assert(z0 != z1, "zero nodes at different levels must differ");
        assert(z1 != z2, "zero nodes at different levels must differ");
    }

    #[test]
    fn test_zero_sibling_path_matches_ladder() {
        let path = zero_sibling_path();
        for i in 0..20 {
            assert(path[i] == zero_node_at_level(i as u32));
        }
    }
}
