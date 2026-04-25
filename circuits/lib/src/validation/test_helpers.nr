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
/// Canonical test recipient field value.
pub global KAT_RECIPIENT: Field = 0xABCD;
/// Canonical test pool identifier.
pub global KAT_POOL_ID: Field = 1;

// ============================================================
// Fixture Builder Functions
// ============================================================

/// Build a complete, valid withdrawal proof fixture for leaf at index 0.
///
/// Uses canonical zero siblings so the empty-tree root is reproducible.
/// Returns (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash).
pub fn build_valid_fixture() -> (Field, Field, Field, Field, [Field; 20], Field, Field) {
    let nullifier: Field = KAT_NULLIFIER;
    let secret: Field    = KAT_SECRET;
    let pool_id: Field   = KAT_POOL_ID;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let leaf_index: Field = KAT_LEAF_INDEX;

    let hash_path = hash::zero_sibling_path();
    let root = merkle::compute_root(commitment, leaf_index, hash_path);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash)
}

/// Setup a complete valid withdrawal with all public parameters.
/// Returns (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, fee)
pub fn setup_valid_withdrawal() -> (Field, Field, Field, Field, [Field; 20], Field, Field, Field, Field, Field) {
    let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash) = build_valid_fixture();
    let recipient = KAT_RECIPIENT;
    let relayer = 0;
    let fee = 0;
    (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, fee)
}

/// Build a withdrawal fixture for a leaf at an arbitrary index in a sparse tree.
///
/// Uses canonical zero siblings so any leaf position yields a reproducible root.
pub fn build_fixture_at_index(
    nullifier: Field,
    secret: Field,
    pool_id: Field,
    leaf_index: Field,
) -> ([Field; 20], Field, Field) {
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let hash_path = hash::zero_sibling_path();
    let root = merkle::compute_root(commitment, leaf_index, hash_path);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    (hash_path, root, nullifier_hash)
}

/// Build a Merkle proof for a single leaf in an otherwise empty tree.
///
/// All siblings are the canonical zero nodes, making the path valid for any
/// leaf position without duplicating zero-ladder math across test sites.
pub fn build_sparse_path(leaf: Field, leaf_index: Field) -> ([Field; 20], Field) {
    let siblings = hash::zero_sibling_path();
    let root = merkle::compute_root(leaf, leaf_index, siblings);
    (siblings, root)
}

/// Build a Merkle proof with caller-supplied sibling values.
///
/// Computes the correct root for the given (leaf, index, siblings) tuple so
/// tests can construct realistic non-zero sibling paths without inline root math.
pub fn build_custom_path(
    leaf: Field,
    leaf_index: Field,
    siblings: [Field; 20],
) -> ([Field; 20], Field) {
    let root = merkle::compute_root(leaf, leaf_index, siblings);
    (siblings, root)
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
    let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash) = build_valid_fixture();

    // Re-derive all values and verify consistency
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
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
    let pool_id: Field   = 0x7777;
    let leaf_index: Field = 524288; // bit 19 only: 0b10...0

    let (hash_path, root, nullifier_hash) = build_fixture_at_index(nullifier, secret, pool_id, leaf_index);

    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let recomputed_root = merkle::compute_root(commitment, leaf_index, hash_path);
    let recomputed_nh   = hash::compute_nullifier_hash(nullifier, root);

    assert(recomputed_root == root);
    assert(recomputed_nh   == nullifier_hash);
}

/// TC-H-05: build_sparse_path inclusion round-trip.
#[test]
fn test_build_sparse_path_inclusion() {
    let leaf: Field      = 0xDEAD;
    let leaf_index: Field = 42;
    let (siblings, root) = build_sparse_path(leaf, leaf_index);
    merkle::verify_inclusion(leaf, leaf_index, siblings, root);
}

/// TC-H-06: build_sparse_path differs by leaf position.
#[test]
fn test_build_sparse_path_position_sensitivity() {
    let leaf: Field = 0xBEEF;
    let (_, root_0) = build_sparse_path(leaf, 0);
    let (_, root_7) = build_sparse_path(leaf, 7);
    assert(root_0 != root_7, "sparse paths at different positions must yield different roots");
}

/// TC-H-07: build_custom_path inclusion round-trip with non-trivial siblings.
#[test]
fn test_build_custom_path_inclusion() {
    let leaf: Field      = 0xCAFE;
    let leaf_index: Field = 3;
    let siblings: [Field; 20] = [
        111, 222, 333, 444, 555, 666, 777, 888, 999, 1000,
        1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010,
    ];
    let (_, root) = build_custom_path(leaf, leaf_index, siblings);
    merkle::verify_inclusion(leaf, leaf_index, siblings, root);
}

/// TC-H-08: build_custom_path root changes when a sibling changes.
#[test]
fn test_build_custom_path_sibling_sensitivity() {
    let leaf: Field      = 0xF00D;
    let leaf_index: Field = 5;
    let mut siblings_a: [Field; 20] = [0; 20];
    siblings_a[2] = 0xAAAA;
    let mut siblings_b: [Field; 20] = [0; 20];
    siblings_b[2] = 0xBBBB;

    let (_, root_a) = build_custom_path(leaf, leaf_index, siblings_a);
    let (_, root_b) = build_custom_path(leaf, leaf_index, siblings_b);
    assert(root_a != root_b, "different siblings must produce different roots");
}
