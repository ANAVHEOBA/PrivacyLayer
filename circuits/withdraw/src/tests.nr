use super::main;
use lib::validation::test_helpers::{WithdrawalBuilder, build_sparse_path};
use lib::hash;
use lib::merkle;

fn execute(builder: WithdrawalBuilder) {
    let (n, s, li, hp, p, r, nh, rec, a, rel, f, d) = builder.build();
    main(n, s, li, hp, p, r, nh, rec, a, rel, f, d);
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
        pool_id, root, nullifier_hash, 0xFFFF, 100_0000000, 0, 0, 100_0000000,
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
        pool_id, root, nullifier_hash, 0xFFFF, 100_0000000, 0, 0, 100_0000000,
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
        pool_id, root, nullifier_hash, 0x1234, 100_0000000, 0, 0, 100_0000000,
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
        pool_id, root, nullifier_hash, 0x5678, 100_0000000, 0, 0, 100_0000000,
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
        pool_id, root, nullifier_hash, 0x9ABC, 100_0000000, 0, 0, 100_0000000,
    );
}

#[test]
#[test]
fn test_withdrawal_realistic_fixtures() {
    // TV-005: Realistic withdrawal with deep non-zero siblings and non-zero leaf index
    let path: [Field; 20] = [
        0x2d875e0f4eb9cd0c152967aa1509d796cf5e20864c73f1d0ad9d0388ceadb56e,
        0x1e750f716d8f3dc24bcec58913844c1a38b60bdc940852d7e6b0bacce48a3aaa,
        0x238730206efa133518034bc6ef5ea503cab13bef5b77c1812b857e4dae462283,
        0x19c42485250d97981789bab3d71bc2e61befa1c12a0e7664b3997b2f255235c2,
        0x0722b37ef2d0564ce4247f5a01cb5fb95e3610acf8a81192e567378918fbda8d,
        0x1aa2078a57e8042beaa7da8c8cfc602db4641776420205d7e6dc32c89f558269,
        0x10fa1396affbc20fba5d482897060cf1a2157002ec160a2bf26c7fa4c515ad3d,
        0x00ad0163e1abd8cae635d823ecd5158b885bc7445ce8378195ecbdac89584704,
        0x2a10d87065c6586c7fb1896b2282ec27937fbff1fd22ea587a568c2ce58175cb,
        0x0106b7e2efc5bda07747b13ebc155a5cefcd9478819f096e5f7885d4757b6299,
        0x05d5453bea2ea3a5544a67825af531cc4ccbaac19739567ab30c58601fa0f084,
        0x050a8ef92fe1bd6c1f2a1cbbed22356edd0e74991fd8840883e2c4bccd95e763,
        0x0c46ae9447fed0da75259d0c5ad08313b04a7e03ea8dbc40fa93dfe50fbb35fc,
        0x08c84fec7ab4933b316a05745682b9439ec6f68c570688a16bd05b0cd0f73d7c,
        0x20ce7dd8ec30e7c3ca13d9a3da8a4cbf2fcc0509c61f696166b37a94c60812d3,
        0x1e1cefc0f0bec95bd91df31b5e169b671ba4ef517cd8ca69414181cd13135aab,
        0x05b6a93f4259c6a9b812919e641ea7582519a4b60443029e24399a7c7925b3c0,
        0x19dd2952cc2bdfa8f7014a96d3701ced2c21ef081b8a2f0673728cdc8ebcb4e9,
        0x0c3607bc4238ef735053f79c2e61c9f3c12447bc0a9856b98c16c0f4869cbdec,
        0x11a4ba756f55e71acc9f86350bc0e989c55b49417166ce2fc61fa8d91c76125a
    ];

    execute(WithdrawalBuilder::new()
        .with_nullifier(0x0011111111111111111111111111111111111111111111111111111111111111)
        .with_secret(0x0022222222222222222222222222222222222222222222222222222222222222)
        .with_pool_id(0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff)
        .with_leaf_index(10)
        .with_hash_path(path)
        .with_root(0x07be1a8886dd8b97c93528f7e40b657e91f6891bf8a0e7347f7834e3459a5f27)
        .with_nullifier_hash(0x2670bcddb5d53b38fcbe58ecf256e97e1026a2630f594d427034da07cb547627)
        .with_recipient(0x0379e6ee06f99867f4a3394f241036f395c248ad93e27fd7f2674f62645c44ea)
        .with_amount(1000000000)
        .with_relayer(0x0457e64b8de401c599dbe00dcace8a6b8976214c957bb78c958ee1f5d88ffc8e)
        .with_fee(1000000));
}
