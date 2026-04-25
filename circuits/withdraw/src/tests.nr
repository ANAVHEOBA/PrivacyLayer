use super::main;
use lib::hash;
use lib::merkle;
use lib::constants;

fn build_path_at(leaf: Field, leaf_index: Field) -> ([Field; constants::MERKLE_TREE_DEPTH], Field) {
    let hash_path = hash::zero_sibling_path();
    let root = merkle::compute_root(leaf, leaf_index, hash_path);
    (hash_path, root)
}

fn build_simple_path(leaf: Field) -> ([Field; constants::MERKLE_TREE_DEPTH], Field) {
    build_path_at(leaf, 0)
}

#[test]
fn test_valid_withdrawal() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, 0, hash_path,
        pool_id, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0,
    );
}

#[test]
fn test_withdrawal_with_relayer_fee() {
    let nullifier: Field = 333;
    let secret: Field    = 444;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, 0, hash_path,
        pool_id, root, nullifier_hash,
        0xDEAD,
        100_0000000,
        0xBEEF,
        1_0000000,
    );
}

#[test]
fn test_withdrawal_fee_equals_amount() {
    let nullifier: Field = 555;
    let secret: Field    = 666;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    let amount: Field  = 50_0000000;

    main(
        nullifier, secret, 0, hash_path,
        pool_id, root, nullifier_hash, 0xABCD, amount, 0xBEEF, amount,
    );
}

#[test]
fn test_withdrawal_nonzero_leaf_index() {
    let nullifier: Field = 777;
    let secret: Field    = 888;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let leaf_index: Field = 7;

    let (hash_path, root) = build_path_at(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        pool_id, root, nullifier_hash, 0x1111, 100_0000000, 0, 0,
    );
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_secret_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, 999, 0, hash_path, pool_id, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_root_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, _real_root) = build_simple_path(commitment);
    let wrong_root: Field = 9999;
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, wrong_root);

    main(nullifier, secret, 0, hash_path, pool_id, wrong_root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_leaf_index_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_path_at(commitment, 0);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 1, hash_path, pool_id, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_tampered_auth_path_fails() {
    let nullifier: Field = 321;
    let secret: Field    = 654;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (mut hash_path, root) = build_simple_path(commitment);
    hash_path[3] = 0xdeadbeef;

    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    main(nullifier, secret, 0, hash_path, pool_id, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test]
fn test_zero_commitment_valid_if_in_tree() {
    let nullifier: Field = 0;
    let secret: Field    = 0;
    let pool_id: Field   = 0;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, pool_id, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test]
fn test_max_leaf_index() {
    let nullifier: Field = 0xAA;
    let secret: Field    = 0xBB;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let leaf_index: Field = 1048575;

    let (hash_path, root) = build_path_at(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        pool_id, root, nullifier_hash, 0xFFFF, 100_0000000, 0, 0,
    );
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_wrong_nullifier_hash_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let wrong_nullifier_hash: Field = 54321;

    main(nullifier, secret, 0, hash_path, pool_id, root, wrong_nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_nullifier_hash_from_different_nullifier_fails() {
    let nullifier: Field  = 111;
    let secret: Field     = 222;
    let pool_id: Field    = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let wrong_nh = hash::compute_nullifier_hash(9999, root);

    main(nullifier, secret, 0, hash_path, pool_id, root, wrong_nh, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_nullifier_hash_bound_to_root() {
    let nullifier: Field  = 111;
    let secret: Field     = 222;
    let pool_id: Field    = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);

    let stale_root: Field = 0xdeadcafe;
    let stale_nh = hash::compute_nullifier_hash(nullifier, stale_root);

    main(nullifier, secret, 0, hash_path, pool_id, root, stale_nh, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_zero_nullifier_hash_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);

    main(nullifier, secret, 0, hash_path, pool_id, root, 0, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "fee cannot exceed withdrawal amount")]
fn test_fee_exceeds_amount_fails() {
    let nullifier: Field = 555;
    let secret: Field    = 666;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, pool_id, root, nullifier_hash, 0xABCD, 10, 0xBEEF, 100);
}

#[test(should_fail_with = "relayer must be zero address if fee is zero")]
fn test_nonzero_relayer_with_zero_fee_fails() {
    let nullifier: Field = 777;
    let secret: Field    = 888;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, pool_id, root, nullifier_hash, 0xABCD, 100_0000000, 0xBEEF, 0);
}

#[test]
fn test_zero_fee_zero_relayer_valid() {
    let nullifier: Field = 123;
    let secret: Field    = 456;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, pool_id, root, nullifier_hash, 0xCC, 100_0000000, 0, 0);
}

#[test]
fn test_unit_amount_unit_fee_valid() {
    let nullifier: Field = 987;
    let secret: Field    = 654;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, pool_id, root, nullifier_hash, 0xBB, 1, 0xAA, 1);
}

#[test]
fn test_withdrawal_large_field_values() {
    let nullifier: Field = 0x00000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let secret: Field    = 0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let pool_id: Field   = 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, 0, hash_path,
        pool_id, root, nullifier_hash, 0x1234567890ABCDEF, 999_0000000, 0, 0,
    );
}

#[test]
fn test_two_notes_same_root_both_valid() {
    let pool_id: Field = 1;
    let n1: Field = 0xAA; let s1: Field = 0xBB;
    let c1 = hash::compute_commitment(n1, s1, pool_id);

    let n2: Field = 0xCC; let s2: Field = 0xDD;
    let c2 = hash::compute_commitment(n2, s2, pool_id);

    let mut path1 = hash::zero_sibling_path();
    path1[0] = c2;
    let root = merkle::compute_root(c1, 0, path1);

    let mut path2 = hash::zero_sibling_path();
    path2[0] = c1;
    let root2 = merkle::compute_root(c2, 1, path2);

    assert(root == root2, "both notes must share the same tree root");

    let nh1 = hash::compute_nullifier_hash(n1, root);
    let nh2 = hash::compute_nullifier_hash(n2, root);

    main(n1, s1, 0, path1, pool_id, root, nh1, 0xA1, 1_0000000, 0, 0);
    main(n2, s2, 1, path2, pool_id, root, nh2, 0xA2, 1_0000000, 0, 0);
}

#[test]
fn test_nullifier_hash_differs_across_roots() {
    let nullifier: Field = 0x1234;

    let root_a: Field = 1111;
    let root_b: Field = 2222;

    let nh_a = hash::compute_nullifier_hash(nullifier, root_a);
    let nh_b = hash::compute_nullifier_hash(nullifier, root_b);

    assert(nh_a != nh_b, "same nullifier in different roots must yield different nullifier_hashes");
}
