// ============================================================
// PrivacyLayer - Merkle Tree Tests
// ============================================================
// Test suite for the shared Merkle tree library.
// The actual implementation is in circuits/lib/merkle/mod.nr
// ============================================================

use lib::merkle;
use lib::hash;

// Re-export for external use
pub use lib::merkle::{compute_root, verify_inclusion, TREE_DEPTH};

// ============================================================
// Tests
// ============================================================
// Total tests: 12
//   - Root computation tests    (5)
//   - Inclusion verification    (4)
//   - Hash consistency tests    (2)
//   - Tree position tests       (1)
// ============================================================

// ------------------------------------------------------------
// Root Computation Tests
// ------------------------------------------------------------

/// TC-M-01: Single-leaf logical tree -- verify root is deterministically
/// computed from one leaf and an all-zero sibling hash-path.
/// The computed root must be non-zero (a non-zero leaf always yields non-zero root).
#[test]
fn test_single_leaf_tree() {
    // Depth-1 tree (simplified): just verify the hash composition
    let leaf: Field = 42;
    let sibling: Field = 0; // right sibling is zero (empty)
    let index: Field = 0;   // leaf is at position 0 (left)

    // For a single level, root = Hash(leaf, sibling)
    // But we have a 20-level tree - build a full path of zeros
    let mut hash_path: [Field; 20] = [0; 20];
    hash_path[0] = sibling;

    // Compute expected root by manually hashing up
    let mut expected = hash::hash_pair(leaf, sibling);
    for _i in 1..20 {
        expected = hash::hash_pair(expected, 0);
    }

    let computed = merkle::compute_root(leaf, index, hash_path);
    assert(computed == expected);
}

/// TC-M-02: Root of non-zero leaf with all-zero siblings is itself non-zero.
/// Ensures the hash chain doesn't accidentally collapse.
#[test]
fn test_nonempty_leaf_produces_nonzero_root() {
    let leaf: Field = 12345;
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(leaf, 0, hash_path);
    assert(root != 0, "root with a non-zero leaf must not be zero");
}

/// TC-M-03: Right child position (index=1 -> bit-0 = 1).
/// H(sibling, leaf) is used at level 0, not H(leaf, sibling).
#[test]
fn test_right_child_position() {
    // Leaf at index=1 means it's the RIGHT child at level 0
    let leaf: Field = 99;
    let sibling: Field = 77;
    let index: Field = 1; // bit 0 = 1 - leaf is right child

    let mut hash_path: [Field; 20] = [0; 20];
    hash_path[0] = sibling;

    // At level 0: right child - hash(sibling, leaf)
    let mut expected = hash::hash_pair(sibling, leaf);
    for _i in 1..20 {
        expected = hash::hash_pair(expected, 0);
    }

    let computed = merkle::compute_root(leaf, index, hash_path);
    assert(computed == expected);
}

/// TC-M-04: Determinism -- same (leaf, index, path) always yields the same root.
/// Critical property: provers cannot produce differing roots for the same inputs.
#[test]
fn test_same_leaf_same_root() {
    // Same inputs must always produce the same root (determinism)
    let leaf: Field = 12345;
    let index: Field = 7;
    let hash_path: [Field; 20] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    let root1 = merkle::compute_root(leaf, index, hash_path);
    let root2 = merkle::compute_root(leaf, index, hash_path);
    assert(root1 == root2);
}

/// TC-M-05: Full 20-bit index (2^20 - 1 = 1048575 -- rightmost leaf).
/// Tests that the bit decomposition at full depth does not overflow or panic.
#[test]
fn test_max_index_root_computable() {
    let leaf: Field = 0xABCDEF;
    let index: Field = 1048575; // all 20 bits set
    let hash_path: [Field; 20] = [0; 20];

    let root = merkle::compute_root(leaf, index, hash_path);
    // Root must differ from the root at index 0
    let root_at_zero = merkle::compute_root(leaf, 0, hash_path);
    assert(root != root_at_zero, "max-index root must differ from index-0 root");
}

// ------------------------------------------------------------
// Inclusion Verification Tests
// ------------------------------------------------------------

/// TC-M-06: Round-trip -- compute root then verify_inclusion must not panic.
#[test]
fn test_verify_inclusion_correct_root() {
    let leaf: Field = 42;
    let index: Field = 0;
    let hash_path: [Field; 20] = [0; 20];

    let correct_root = merkle::compute_root(leaf, index, hash_path);
    merkle::verify_inclusion(leaf, index, hash_path, correct_root); // should not panic
}

/// TC-M-07: Wrong root -- verify_inclusion must reject a fabricated root.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_verify_inclusion_wrong_root_fails() {
    let leaf: Field = 42;
    let index: Field = 0;
    let hash_path: [Field; 20] = [0; 20];
    let wrong_root: Field = 9999; // not the real root

    merkle::verify_inclusion(leaf, index, hash_path, wrong_root);
}

/// TC-M-08: Wrong index -- root computed for index=0 but claimed index=1 fails.
/// Leaf position is baked into the root; an incorrect index changes it.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_verify_inclusion_wrong_index_fails() {
    let leaf: Field = 42;
    let hash_path: [Field; 20] = [0; 20];

    // Compute root for index=0, but verify with index=1 - different root
    let correct_root = merkle::compute_root(leaf, 0, hash_path);
    merkle::verify_inclusion(leaf, 1, hash_path, correct_root);
}

/// TC-M-09: Tampered sibling -- altering any sibling must change the root,
/// causing the inclusion check to fail.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_verify_inclusion_tampered_sibling_fails() {
    let leaf: Field  = 55;
    let index: Field = 0;
    let hash_path: [Field; 20] = [0; 20];
    let correct_root = merkle::compute_root(leaf, index, hash_path);

    // Tamper with the sibling at level 5
    let mut tampered_path = hash_path;
    tampered_path[5] = 0xdeadbeef;

    // Root will now differ
    merkle::verify_inclusion(leaf, index, tampered_path, correct_root);
}

// ------------------------------------------------------------
// Hash Consistency Tests
// ------------------------------------------------------------

/// TC-M-10: Left vs right child produce different roots for the same leaf.
/// Ensures the bit-indexed left/right ordering is applied correctly.
#[test]
fn test_left_vs_right_child_produce_different_roots() {
    let leaf: Field = 7777;
    let hash_path: [Field; 20] = [0; 20];

    let root_left  = merkle::compute_root(leaf, 0, hash_path); // bit 0 = 0 -> left
    let root_right = merkle::compute_root(leaf, 1, hash_path); // bit 0 = 1 -> right

    assert(root_left != root_right, "left and right positions must produce different roots");
}

/// TC-M-11: Swapping sibling and leaf changes the root.
/// Verifies the hash is order-sensitive (non-commutative in context).
#[test]
fn test_sibling_leaf_swap_changes_root() {
    let leaf_a: Field = 10;
    let leaf_b: Field = 20;

    let mut path_a: [Field; 20] = [0; 20];
    path_a[0] = leaf_b; // sibling of a is b
    let root_a = merkle::compute_root(leaf_a, 0, path_a); // H(a, b) at level 0

    let mut path_b: [Field; 20] = [0; 20];
    path_b[0] = leaf_a; // sibling of b is a
    let root_b = merkle::compute_root(leaf_b, 0, path_b); // H(b, a) at level 0 -- but b is at index 0 (left)

    // root_a used leaf_a as left, leaf_b as sibling (right) -> H(a,b) at level 0
    // root_b used leaf_b as left, leaf_a as sibling (right) -> H(b,a) at level 0
    // Since hash is not commutative, these should differ
    assert(root_a != root_b, "swapping left/right children must change the root");
}

/// TC-M-12: All-zero leaf in otherwise non-zero path.
/// Simulates an empty leaf slot -- root should still be a valid, non-zero field element.
#[test]
fn test_zero_leaf_nonzero_path() {
    let leaf: Field = 0;
    let index: Field = 2;
    let hash_path: [Field; 20] = [1, 2, 3, 4, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    let root = merkle::compute_root(leaf, index, hash_path);
    // Root is driven by the siblings, so it must be non-zero
    assert(root != 0, "root with non-zero siblings must not be zero even for a zero leaf");

    // And verify_inclusion must accept the computed root
    merkle::verify_inclusion(leaf, index, hash_path, root);
}

// ============================================================
// ZK-020: Leaf Index Range Check Tests
// ============================================================

/// TC-M-13: Index at 2^20 (first out-of-range value) must be rejected.
#[test(should_fail_with = "leaf index out of range: must be < 2^20")]
fn test_out_of_range_index_rejected() {
    let leaf: Field = 42;
    let hash_path: [Field; 20] = [0; 20];
    // 2^20 = 1,048,576 is the first invalid index
    let _ = merkle::compute_root(leaf, 1_048_576, hash_path);
}

/// TC-M-14: Very large index must be rejected.
#[test(should_fail_with = "leaf index out of range: must be < 2^20")]
fn test_very_large_index_rejected() {
    let leaf: Field = 42;
    let hash_path: [Field; 20] = [0; 20];
    let _ = merkle::compute_root(leaf, 100_000_000, hash_path);
}

/// TC-M-15: Out-of-range index via verify_inclusion must be rejected.
#[test(should_fail_with = "leaf index out of range: must be < 2^20")]
fn test_verify_inclusion_out_of_range_index_fails() {
    let leaf: Field = 42;
    let hash_path: [Field; 20] = [0; 20];
    let fake_root: Field = 999;
    merkle::verify_inclusion(leaf, 1_048_576, hash_path, fake_root);
}

/// TC-M-16: Index 2^20 + 1 must be rejected (one past the boundary).
#[test(should_fail_with = "leaf index out of range: must be < 2^20")]
fn test_index_just_past_boundary_rejected() {
    let leaf: Field = 42;
    let hash_path: [Field; 20] = [0; 20];
    let _ = merkle::compute_root(leaf, 1_048_577, hash_path);
}

