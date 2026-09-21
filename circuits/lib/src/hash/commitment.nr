use std::hash::poseidon2_permutation;
use super::pair::hash_pair;
use super::nullifier::compute_nullifier_hash;

/// Domain separator for note commitment hashing (ZK-011).
/// ASCII "commitment_domain_v1" left-padded to 32 bytes as a canonical BN254 field element.
pub global COMMITMENT_DOMAIN_SEP: Field = 0x000000000000000000000000636f6d6d69746d656e745f646f6d61696e5f7631;

fn poseidon2_hash_4(a: Field, b: Field, c: Field, d: Field) -> Field {
    let iv: Field = 4 * 18_446_744_073_709_551_616;
    let state: [Field; 4] = [a, b, c, iv];
    let permuted1 = poseidon2_permutation(state);
    let state2: [Field; 4] = [permuted1[0] + d, permuted1[1], permuted1[2], permuted1[3]];
    let permuted2 = poseidon2_permutation(state2);
    permuted2[0]
}

/// Legacy 3-input Poseidon2 hash without domain separation for regression testing (ZK-011).
pub fn legacy_undomain_separated_commitment(nullifier: Field, secret: Field, pool_id: Field) -> Field {
    let iv: Field = 3 * 18_446_744_073_709_551_616;
    let state: [Field; 4] = [nullifier, secret, pool_id, iv];
    let permuted = poseidon2_permutation(state);
    permuted[0]
}

/// Compute commitment from nullifier, secret and pool_id with explicit domain separation (ZK-011).
/// commitment = Poseidon2(COMMITMENT_DOMAIN_SEP, nullifier, secret, pool_id)
pub fn compute_commitment(nullifier: Field, secret: Field, pool_id: Field) -> Field {
    poseidon2_hash_4(COMMITMENT_DOMAIN_SEP, nullifier, secret, pool_id)
}

#[test]
fn test_commitment_domain_sep_is_nonzero() {
    assert(COMMITMENT_DOMAIN_SEP != 0, "commitment domain separator must be non-zero");
}

#[test]
fn test_commitment_domain_separated_hash_is_deterministic() {
    let c1 = compute_commitment(42, 99, 1);
    let c2 = compute_commitment(42, 99, 1);
    assert(c1 == c2, "commitment hash must be deterministic");
}

#[test]
fn test_commitment_hash_differs_from_legacy_undomain_separated() {
    let nullifier: Field = 123;
    let secret: Field = 456;
    let pool_id: Field = 789;
    let separated = compute_commitment(nullifier, secret, pool_id);
    let legacy = legacy_undomain_separated_commitment(nullifier, secret, pool_id);
    assert(separated != legacy, "domain-separated commitment must differ from legacy commitment");
}

#[test]
fn test_commitment_hash_differs_from_nullifier_hash_same_inputs() {
    let a: Field = 0xdeadbeef;
    let b: Field = 0xcafebabe;
    let c: Field = 0x12345678;
    let cm = compute_commitment(a, b, c);
    let nh = compute_nullifier_hash(a, b);
    assert(cm != nh, "commitment domain must be disjoint from nullifier domain");
}

#[test]
fn test_commitment_hash_differs_from_merkle_pair_hash_same_inputs() {
    let a: Field = 0xdeadbeef;
    let b: Field = 0xcafebabe;
    let cm = compute_commitment(a, b, 0);
    let ph = hash_pair(a, b);
    assert(cm != ph, "commitment domain must be disjoint from merkle pair domain");
}

