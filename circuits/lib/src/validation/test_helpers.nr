// ============================================================
// PrivacyLayer - Test Helper Utilities
// ============================================================
// Reusable fixtures, known-answer test vectors, and utility
// functions shared across all circuit test suites.
//
// Usage:
//   use lib::validation::test_helpers;
//
// Conventions:
//   - VALID_*  : known-good vectors that any circuit must accept
//   - INVALID_* : known-bad vectors that circuits must reject
//   - build_*   : functions that construct test inputs dynamically
// ============================================================

use crate::hash;
use crate::merkle;

// ============================================================
// Known-Answer Test (KAT) Vectors
// ============================================================
// These are pre-computed reference values pinned to the
// Pedersen hash implementation in hash/mod.nr.
// If the hash implementation changes, recompute these.
// ============================================================

/// Canonical test nullifier (small field value, easy to debug).
pub global KAT_NULLIFIER: Field = 1;
/// Canonical test secret.
pub global KAT_SECRET: Field = 2;
/// Canonical leaf index for KAT proofs.
pub global KAT_LEAF_INDEX: Field = 0;
/// Standard withdrawal amount: 100 XLM in stroops.
pub global KAT_AMOUNT: Field = 100_0000000;
/// Canonical recipient field value.
pub global KAT_RECIPIENT: Field = 0xABCD;

// ============================================================
// Fixture Builder Functions
// ============================================================

/// Build a complete, valid withdrawal proof fixture for leaf at index 0.
///
/// Returns (nullifier, secret, leaf_index, hash_path, root, nullifier_hash)
/// for use in withdrawal circuit tests.
///
/// Example:
/// ```noir
/// let f = test_helpers::build_valid_fixture();
/// main(f.0, f.1, f.2, f.3, f.4, f.5, recipient, amount, 0, 0);
/// ```
pub fn build_valid_fixture() -> (Field, Field, Field, [Field; 20], Field, Field) {
    let nullifier: Field = KAT_NULLIFIER;
    let secret: Field    = KAT_SECRET;
    let commitment = hash::compute_commitment(nullifier, secret);
    let leaf_index: Field = KAT_LEAF_INDEX;

    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(commitment, leaf_index, hash_path);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    (nullifier, secret, leaf_index, hash_path, root, nullifier_hash)
}

/// Build a withdrawal fixture for a leaf at an arbitrary index.
///
/// Useful for testing index decomposition edge cases.
pub fn build_fixture_at_index(
    nullifier: Field,
    secret: Field,
    leaf_index: Field,
) -> ([Field; 20], Field, Field) {
    let commitment = hash::compute_commitment(nullifier, secret);
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(commitment, leaf_index, hash_path);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    (hash_path, root, nullifier_hash)
}

/// Build a two-leaf tree and return paths/root for both leaves.
///
/// Returns (path1, path2, shared_root).
/// Leaf 1 is at index 0 with commitment c1; leaf 2 is at index 1 with commitment c2.
pub fn build_two_leaf_tree(c1: Field, c2: Field) -> ([Field; 20], [Field; 20], Field) {
    let mut path1: [Field; 20] = [0; 20];
    path1[0] = c2; // sibling of c1 at level 0 is c2

    let mut path2: [Field; 20] = [0; 20];
    path2[0] = c1; // sibling of c2 at level 0 is c1

    let root = merkle::compute_root(c1, 0, path1);
    (path1, path2, root)
}

/// Corrupt a Merkle path by overwriting one sibling with a garbage value.
/// `level` must be in range [0, 19].
pub fn tamper_path(path: [Field; 20], level: Field) -> [Field; 20] {
    let mut bad_path = path;
    // Use a field constant as the garbage value
    if level == 0 { bad_path[0] = 0xDEADBEEF; }
    else if level == 1 { bad_path[1] = 0xDEADBEEF; }
    else if level == 2 { bad_path[2] = 0xDEADBEEF; }
    else if level == 3 { bad_path[3] = 0xDEADBEEF; }
    else if level == 4 { bad_path[4] = 0xDEADBEEF; }
    else if level == 5 { bad_path[5] = 0xDEADBEEF; }
    else if level == 6 { bad_path[6] = 0xDEADBEEF; }
    else if level == 7 { bad_path[7] = 0xDEADBEEF; }
    else if level == 8 { bad_path[8] = 0xDEADBEEF; }
    else if level == 9 { bad_path[9] = 0xDEADBEEF; }
    else if level == 10 { bad_path[10] = 0xDEADBEEF; }
    else if level == 11 { bad_path[11] = 0xDEADBEEF; }
    else if level == 12 { bad_path[12] = 0xDEADBEEF; }
    else if level == 13 { bad_path[13] = 0xDEADBEEF; }
    else if level == 14 { bad_path[14] = 0xDEADBEEF; }
    else if level == 15 { bad_path[15] = 0xDEADBEEF; }
    else if level == 16 { bad_path[16] = 0xDEADBEEF; }
    else if level == 17 { bad_path[17] = 0xDEADBEEF; }
    else if level == 18 { bad_path[18] = 0xDEADBEEF; }
    else { bad_path[19] = 0xDEADBEEF; }
    bad_path
}

// ============================================================
// Self-Tests for the Test Helper Module
// ============================================================

/// TC-H-01: build_valid_fixture produces a logically consistent fixture.
/// Commitment re-derived from nullifier/secret must match the tree leaf.
#[test]
fn test_build_valid_fixture_is_consistent() {
    let (nullifier, secret, leaf_index, hash_path, root, nullifier_hash) = build_valid_fixture();

    // Re-derive all values and verify consistency
    let commitment = hash::compute_commitment(nullifier, secret);
    let recomputed_root = merkle::compute_root(commitment, leaf_index, hash_path);
    let recomputed_nh   = hash::compute_nullifier_hash(nullifier, root);

    assert(recomputed_root == root, "fixture root must match recomputed root");
    assert(recomputed_nh  == nullifier_hash, "fixture nullifier_hash must match recomputed value");
}

/// TC-H-02: build_two_leaf_tree -- both leaves share the same root.
#[test]
fn test_build_two_leaf_tree_shared_root() {
    let c1: Field = 0x1111;
    let c2: Field = 0x2222;

    let (path1, path2, root) = build_two_leaf_tree(c1, c2);

    let root_from_c1 = merkle::compute_root(c1, 0, path1);
    let root_from_c2 = merkle::compute_root(c2, 1, path2);

    assert(root_from_c1 == root, "c1 path must yield the same root");
    assert(root_from_c2 == root, "c2 path must yield the same root");
}

/// TC-H-03: tamper_path -- tampering corrupts the root.
#[test]
fn test_tamper_path_changes_root() {
    let leaf: Field  = 42;
    let index: Field = 0;
    let hash_path: [Field; 20] = [0; 20];

    let honest_root  = merkle::compute_root(leaf, index, hash_path);
    let bad_path     = tamper_path(hash_path, 3);
    let tampered_root = merkle::compute_root(leaf, index, bad_path);

    assert(honest_root != tampered_root, "tampered path must change the root");
}

/// TC-H-04: build_fixture_at_index with leaf_index=19 (high-bit set only).
#[test]
fn test_build_fixture_at_high_index() {
    let nullifier: Field = 0x5555;
    let secret: Field    = 0x6666;
    let leaf_index: Field = 524288; // bit 19 only: 0b10...0

    let (hash_path, root, nullifier_hash) = build_fixture_at_index(nullifier, secret, leaf_index);

    // Verify consistency
    let commitment = hash::compute_commitment(nullifier, secret);
    let recomputed_root = merkle::compute_root(commitment, leaf_index, hash_path);
    let recomputed_nh   = hash::compute_nullifier_hash(nullifier, root);

    assert(recomputed_root == root);
    assert(recomputed_nh   == nullifier_hash);
}
