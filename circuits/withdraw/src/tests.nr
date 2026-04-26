use super::main;
use lib::validation::test_helpers::{WithdrawalBuilder, build_sparse_path};
use lib::hash;
use lib::merkle;

fn execute(builder: WithdrawalBuilder) {
    let (n, s, li, hp, p, r, nh, rec, a, rel, f) = builder.build();
    main(n, s, li, hp, p, r, nh, rec, a, rel, f);
}

#[test]
fn test_valid_withdrawal() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(111)
        .with_secret(222)
        .with_pool_id(1)
        .with_recipient(0xABCD)
        .with_amount(100_0000000));
}

#[test]
fn test_withdrawal_with_relayer_fee() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(333)
        .with_secret(444)
        .with_pool_id(1)
        .with_recipient(0xDEAD)
        .with_amount(100_0000000)
        .with_relayer(0xBEEF)
        .with_fee(1_0000000));
}

#[test]
fn test_withdrawal_fee_equals_amount() {
    let amount: Field = 50_0000000;
    execute(WithdrawalBuilder::new()
        .with_nullifier(555)
        .with_secret(666)
        .with_pool_id(1)
        .with_recipient(0xABCD)
        .with_amount(amount)
        .with_relayer(0xBEEF)
        .with_fee(amount));
}

#[test]
fn test_withdrawal_nonzero_leaf_index() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(777)
        .with_secret(888)
        .with_pool_id(1)
        .with_leaf_index(7)
        .with_recipient(0x1111)
        .with_amount(100_0000000));
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_secret_fails() {
    let nullifier = 111;
    let pool_id = 1;
    let real_secret = 222;
    let real_commitment = hash::compute_commitment(nullifier, real_secret, pool_id);
    let path = hash::zero_sibling_path();
    let real_root = merkle::compute_root(real_commitment, 0, path);
    let real_nh = hash::compute_nullifier_hash(nullifier, real_root);

    execute(WithdrawalBuilder::new()
        .with_nullifier(nullifier)
        .with_secret(999) // Wrong secret passed to circuit
        .with_pool_id(pool_id)
        .with_root(real_root) // Root for real_secret
        .with_nullifier_hash(real_nh)); 
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_root_fails() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(111)
        .with_secret(222)
        .with_pool_id(1)
        .with_root(9999)); // Wrong root
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_leaf_index_fails() {
    let nullifier = 111;
    let secret = 222;
    let pool_id = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let path = hash::zero_sibling_path();
    let real_root = merkle::compute_root(commitment, 0, path); // Root for index 0
    let real_nh = hash::compute_nullifier_hash(nullifier, real_root);

    execute(WithdrawalBuilder::new()
        .with_nullifier(nullifier)
        .with_secret(secret)
        .with_pool_id(pool_id)
        .with_leaf_index(1) // Wrong index
        .with_root(real_root) 
        .with_nullifier_hash(real_nh));
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_tampered_auth_path_fails() {
    let mut bad_path = hash::zero_sibling_path();
    bad_path[3] = 0xdeadbeef;
    
    let nullifier = 321;
    let secret = 654;
    let pool_id = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let real_path = hash::zero_sibling_path();
    let real_root = merkle::compute_root(commitment, 0, real_path);

    execute(WithdrawalBuilder::new()
        .with_nullifier(nullifier)
        .with_secret(secret)
        .with_pool_id(pool_id)
        .with_hash_path(bad_path) // Tampered path
        .with_root(real_root)); 
}

#[test]
fn test_zero_commitment_valid_if_in_tree() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(0)
        .with_secret(0)
        .with_pool_id(0));
}

#[test]
fn test_max_leaf_index() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(0xAA)
        .with_secret(0xBB)
        .with_pool_id(1)
        .with_leaf_index(1048575)
        .with_recipient(0xFFFF));
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_wrong_nullifier_hash_fails() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(111)
        .with_secret(222)
        .with_pool_id(1)
        .with_nullifier_hash(54321)); 
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_nullifier_hash_from_different_nullifier_fails() {
    let nullifier = 111;
    let secret = 222;
    let pool_id = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let path = hash::zero_sibling_path();
    let real_root = merkle::compute_root(commitment, 0, path);
    
    let wrong_nh = hash::compute_nullifier_hash(9999, real_root);

    execute(WithdrawalBuilder::new()
        .with_nullifier(nullifier)
        .with_secret(secret)
        .with_pool_id(pool_id)
        .with_nullifier_hash(wrong_nh));
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_nullifier_hash_bound_to_root() {
    let nullifier = 111;
    let stale_root: Field = 0xdeadcafe;
    let stale_nh = hash::compute_nullifier_hash(nullifier, stale_root);

    execute(WithdrawalBuilder::new()
        .with_nullifier(nullifier)
        .with_secret(222)
        .with_pool_id(1)
        .with_nullifier_hash(stale_nh));
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_zero_nullifier_hash_fails() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(111)
        .with_secret(222)
        .with_pool_id(1)
        .with_nullifier_hash(0));
}

#[test(should_fail_with = "fee cannot exceed withdrawal amount")]
fn test_fee_exceeds_amount_fails() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(555)
        .with_secret(666)
        .with_pool_id(1)
        .with_amount(10)
        .with_relayer(0xBEEF)
        .with_fee(100));
}

#[test(should_fail_with = "relayer must be zero address if fee is zero")]
fn test_nonzero_relayer_with_zero_fee_fails() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(777)
        .with_secret(888)
        .with_pool_id(1)
        .with_relayer(0xBEEF)
        .with_fee(0));
}

#[test]
fn test_zero_fee_zero_relayer_valid() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(123)
        .with_secret(456)
        .with_pool_id(1)
        .with_recipient(0xCC));
}

#[test]
fn test_unit_amount_unit_fee_valid() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(987)
        .with_secret(654)
        .with_pool_id(1)
        .with_recipient(0xBB)
        .with_amount(1)
        .with_relayer(0xAA)
        .with_fee(1));
}

#[test]
fn test_withdrawal_large_field_values() {
    execute(WithdrawalBuilder::new()
        .with_nullifier(0x00000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        .with_secret(0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        .with_pool_id(0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
        .with_recipient(0x1234567890ABCDEF)
        .with_amount(999_0000000));
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
    
    execute(WithdrawalBuilder::new()
        .with_nullifier(n1)
        .with_secret(s1)
        .with_pool_id(pool_id)
        .with_leaf_index(0)
        .with_hash_path(path1)
        .with_root(root)
        .with_recipient(0xA1));

    execute(WithdrawalBuilder::new()
        .with_nullifier(n2)
        .with_secret(s2)
        .with_pool_id(pool_id)
        .with_leaf_index(1)
        .with_hash_path(path2)
        .with_root(root)
        .with_recipient(0xA2));
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

// ============================================================
// ZK-020: Leaf Index Boundary and Range Tests
// ============================================================

#[test(should_fail_with = "leaf index out of range: must be < 2^20")]
fn test_leaf_index_exceeds_tree_capacity() {
    let nullifier: Field = 0xAA;
    let secret: Field    = 0xBB;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Build a valid path at index 0, then attempt with invalid index 2^20
    let (hash_path, root) = build_sparse_path(commitment, 0);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // 2^20 = 1,048,576 -- first invalid index
    main(
        nullifier, secret, 1_048_576, hash_path,
        pool_id, root, nullifier_hash, 0xFFFF, 100_0000000, 0, 0,
    );
}

#[test(should_fail_with = "leaf index out of range: must be < 2^20")]
fn test_leaf_index_large_out_of_range() {
    let nullifier: Field = 0xCC;
    let secret: Field    = 0xDD;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    let (hash_path, root) = build_sparse_path(commitment, 0);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Far outside valid range
    main(
        nullifier, secret, 99_999_999, hash_path,
        pool_id, root, nullifier_hash, 0xFFFF, 100_0000000, 0, 0,
    );
}

#[test]
fn test_leaf_index_zero_boundary() {
    // Index 0 is the minimum valid index
    let nullifier: Field = 0xEE;
    let secret: Field    = 0xFF;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let leaf_index: Field = 0;

    let (hash_path, root) = build_sparse_path(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        pool_id, root, nullifier_hash, 0x1234, 100_0000000, 0, 0,
    );
}

#[test]
fn test_leaf_index_max_boundary() {
    // Index 2^20 - 1 = 1,048,575 is the maximum valid index
    let nullifier: Field = 0x11;
    let secret: Field    = 0x22;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let leaf_index: Field = 1_048_575;

    let (hash_path, root) = build_sparse_path(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        pool_id, root, nullifier_hash, 0x5678, 100_0000000, 0, 0,
    );
}

#[test]
fn test_leaf_index_high_bit_only() {
    // Index 2^19 = 524,288 -- only the highest valid bit is set
    let nullifier: Field = 0x33;
    let secret: Field    = 0x44;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    let leaf_index: Field = 524_288;

    let (hash_path, root) = build_sparse_path(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        pool_id, root, nullifier_hash, 0x9ABC, 100_0000000, 0, 0,
    );
}
