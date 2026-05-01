// ============================================================
// PrivacyLayer - Commitment Circuit
// ============================================================
// Proves knowledge of (nullifier, secret) such that:
//   commitment = Hash(nullifier, secret)
//
// This is the simplest building block - used during deposit.
// The commitment is stored publicly in the on-chain Merkle tree.
// The nullifier and secret are kept private by the user.
//
// Inspired by:
//   - Tornado Cash commitment scheme
//   - Penumbra note commitment (protocol.penumbra.zone)
// ============================================================

use lib::hash;
use lib::validation;
mod fixtures;

/// Commitment circuit - proves knowledge of a note's preimage.
///
/// # Private inputs
/// - `nullifier`  : unique per-note random field element; revealed on spend
/// - `secret`     : random field element; never revealed
///
/// # Public inputs
/// - `pool_id`    : unique identifier for the shielded pool
/// - `commitment` : Hash(nullifier, secret, pool_id) - stored on-chain
fn main(
    // Private witnesses
    nullifier: Field,
    secret: Field,
    // Public statement
    pool_id: pub Field,
    commitment: pub Field,
) {
    // Compute commitment from private inputs
    let computed_commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Validate the computed commitment matches the public on-chain value
    validation::validate_commitment(computed_commitment, commitment);
}

// ============================================================
// Tests - following noir-lang/noir-examples test patterns
// ============================================================
// Total tests: 17
//   - Happy path tests (4)
//   - Zero / boundary tests (4)
//   - Collision / uniqueness tests (4)
//   - Attack / failure tests (5)
// ============================================================

// --------------------------------------------
// Happy Path Tests
// --------------------------------------------

/// TC-C-01: Basic valid commitment with small field values.
/// Verifies the circuit accepts correctly-formed proofs.
#[test]
fn test_valid_commitment() {
    // Known values: commitment = Hash(nullifier=1, secret=2, pool_id=3)
    let nullifier: Field = 1;
    let secret: Field = 2;
    let pool_id: Field = 3;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Should pass - correct preimage
    main(nullifier, secret, pool_id, commitment);
}

/// TC-C-02: Valid commitment with large hex-encoded field elements
/// (simulates realistic SDK-generated random values near field size).
#[test]
fn test_valid_commitment_large_values() {
    let nullifier: Field = 0x0000000000000000000000000000000000000000000000000000000000000064; // 100
    let secret: Field    = 0x00000000000000000000000000000000000000000000000000000000000003e8; // 1000
    let pool_id: Field   = 0x0000000000000000000000000000000000000000000000000000000000000001; // 1
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    main(nullifier, secret, pool_id, commitment);
}

/// TC-C-03: Valid commitment with maximum safe field value.
/// BN254 scalar field modulus r = 2^254 - ... This uses a value that is
/// valid within the field. The circuit must handle high-valued witnesses.
#[test]
fn test_valid_commitment_near_max_field() {
    // A large prime-like field element near (but within) the BN254 scalar field.
    // BN254 r ~ 2^254, so 2^253 is safely inside the field.
    let nullifier: Field = 0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let secret: Field    = 0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let pool_id: Field   = 0x000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    main(nullifier, secret, pool_id, commitment);
}

/// TC-C-04: Determinism -- same inputs always yield the exact same commitment.
/// Essential for note reconstruction and proof generation.
#[test]
fn test_commitment_is_deterministic() {
    let nullifier: Field = 0xdeadbeef;
    let secret: Field    = 0xcafebabe;
    let pool_id: Field   = 0x12345678;

    let c1 = hash::compute_commitment(nullifier, secret, pool_id);
    let c2 = hash::compute_commitment(nullifier, secret, pool_id);

    // If commitments are equal, the circuit accepts both
    assert(c1 == c2, "commitment must be deterministic");
    main(nullifier, secret, pool_id, c1);
}

/// Shared cross-stack fixtures generated from the same source as
/// artifacts/zk/v1/commitment_vectors.json. These pin exact Noir <-> SDK outputs.
#[test]
fn test_shared_fixture_cv_001() {
    let (nullifier, secret, pool_id, commitment) = fixtures::fixture_cv_001();
    assert(hash::compute_commitment(nullifier, secret, pool_id) == commitment);
    main(nullifier, secret, pool_id, commitment);
}

#[test]
fn test_shared_fixture_cv_002() {
    let (nullifier, secret, pool_id, commitment) = fixtures::fixture_cv_002();
    assert(hash::compute_commitment(nullifier, secret, pool_id) == commitment);
    main(nullifier, secret, pool_id, commitment);
}

#[test]
fn test_shared_fixture_cv_003() {
    let (nullifier, secret, pool_id, commitment) = fixtures::fixture_cv_003();
    assert(hash::compute_commitment(nullifier, secret, pool_id) == commitment);
    main(nullifier, secret, pool_id, commitment);
}

#[test]
fn test_shared_fixture_cv_004() {
    let (nullifier, secret, pool_id, commitment) = fixtures::fixture_cv_004();
    assert(hash::compute_commitment(nullifier, secret, pool_id) == commitment);
    main(nullifier, secret, pool_id, commitment);
}

// --------------------------------------------
// Zero / Boundary Value Tests
// --------------------------------------------

/// TC-C-05: Zero nullifier with zero secret -- edge case where both
/// inputs are the additive identity. The circuit must compute and
/// accept H(0, 0, 0) as a valid commitment (not special-cased to fail).
#[test]
fn test_zero_inputs_valid_commitment() {
    let nullifier: Field = 0;
    let secret: Field    = 0;
    let pool_id: Field   = 0;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    main(nullifier, secret, pool_id, commitment);
}

/// TC-C-06: Zero nullifier -- only the secret is non-zero.
/// Verifies partial-zero inputs are handled correctly.
#[test]
fn test_zero_nullifier_nonzero_secret() {
    let nullifier: Field = 0;
    let secret: Field    = 12345;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    main(nullifier, secret, pool_id, commitment);
}

/// TC-C-07: Non-zero nullifier with zero secret.
/// Mirror of TC-C-06 for the other input.
#[test]
fn test_nonzero_nullifier_zero_secret() {
    let nullifier: Field = 99999;
    let secret: Field    = 0;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    main(nullifier, secret, pool_id, commitment);
}

/// TC-C-08: nullifier == secret (identical inputs).
/// The hash function ought to distinguish this from other cases;
/// the circuit accepts it as long as the commitment is correct.
#[test]
fn test_identical_nullifier_and_secret() {
    let nullifier: Field = 7777;
    let secret: Field    = 7777;
    let pool_id: Field   = 1;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);
    main(nullifier, secret, pool_id, commitment);
}

// --------------------------------------------
// Collision / Uniqueness Tests
// --------------------------------------------

/// TC-C-09: Different notes must produce different commitments (collision resistance).
/// A collision would allow two depositors to share a single on-chain slot.
#[test]
fn test_no_commitment_collision_different_inputs() {
    let c1 = hash::compute_commitment(1, 2, 1);
    let c2 = hash::compute_commitment(3, 4, 1);
    assert(c1 != c2, "different (nullifier, secret) pairs must not collide");
}

/// TC-C-10: Verify the hash is NOT symmetric, i.e. H(a,b,c) != H(b,a,c).
/// If it were symmetric, swapped inputs would open any note.
#[test]
fn test_commitment_is_not_symmetric() {
    let a: Field = 10;
    let b: Field = 20;
    let c: Field = 30;
    let c_abc = hash::compute_commitment(a, b, c);
    let c_bac = hash::compute_commitment(b, a, c);
    assert(c_abc != c_bac, "H(a,b,c) must differ from H(b,a,c) – hash must be non-symmetric");
}

/// TC-C-11: Verifying that incrementing nullifier by 1 changes the commitment.
/// Ensures small deltas are visible (no partial-preimage attack surface).
#[test]
fn test_adjacent_nullifiers_produce_distinct_commitments() {
    let secret: Field = 100;
    let pool_id: Field = 1;
    let c1 = hash::compute_commitment(1, secret, pool_id);
    let c2 = hash::compute_commitment(2, secret, pool_id);
    assert(c1 != c2, "adjacent nullifiers must produce different commitments");
}

/// TC-C-17: Regression: Same secret material in different pools must yield different commitments.
/// This prevents note replay across pools.
#[test]
fn test_same_secret_different_pools_distinct_commitments() {
    let nullifier: Field = 0xdead;
    let secret: Field = 0xbeef;
    
    let c_pool1 = hash::compute_commitment(nullifier, secret, 1);
    let c_pool2 = hash::compute_commitment(nullifier, secret, 2);
    
    assert(c_pool1 != c_pool2, "commitments with same secret must differ across pools");
}

// --------------------------------------------
// Attack / Failure Tests
// --------------------------------------------

/// TC-C-12: Wrong nullifier with correct secret and real commitment -- must fail.
/// Simulates an adversary who knows the secret but not the nullifier.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_wrong_nullifier_fails() {
    let nullifier: Field = 1;
    let secret: Field    = 2;
    let pool_id: Field   = 3;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Provide wrong nullifier - should fail the assertion
    main(999, secret, pool_id, commitment);
}

/// TC-C-13: Wrong secret with correct nullifier and real commitment -- must fail.
/// Simulates an adversary who knows the nullifier but not the secret.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_wrong_secret_fails() {
    let nullifier: Field = 1;
    let secret: Field    = 2;
    let pool_id: Field   = 3;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Provide wrong secret - should fail the assertion
    main(nullifier, 888, pool_id, commitment);
}

/// TC-C-14: Swapped nullifier / secret -- must fail.
/// Even when both values are known, order matters in H(nullifier, secret).
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_swapped_inputs_fails() {
    let nullifier: Field = 1;
    let secret: Field    = 2;
    let pool_id: Field   = 3;
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Swap nullifier and secret - should fail (hash is not symmetric)
    main(secret, nullifier, pool_id, commitment);
}

/// TC-C-15: Fabricated (random) commitment value with zero inputs -- must fail.
/// An attacker who cannot compute the preimage should never be able to pass
/// a random commitment through the circuit.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_zero_inputs_with_fabricated_commitment_fails() {
    // Both zero with fabricated commitment value - should fail
    main(0, 0, 0, 12345);
}

/// TC-C-16: Off-by-one commitment -- commitment is H(nullifier, secret) + 1.
/// Ensures the constraint rejects values that are only slightly wrong.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_off_by_one_commitment_fails() {
    let nullifier: Field = 42;
    let secret: Field    = 43;
    let pool_id: Field   = 44;
    let real_commitment = hash::compute_commitment(nullifier, secret, pool_id);
    // Add 1 to produce an off-by-one value (will wrap in the field -- still wrong)
    let tampered: Field = real_commitment + 1;
    main(nullifier, secret, pool_id, tampered);
}

// ============================================================
// ZK-018: Edge-case commitment regression corpus
// ============================================================
// Additional tests covering near-field-limit values, incremental
// deltas on all three inputs, and cross-domain isolation.
// These vectors are shared between this Noir test suite and the
// SDK commitment corpus tests in sdk/test/commitment_corpus.test.ts.
// ============================================================

/// TC-C-18: Near-field-limit nullifier with zero secret.
/// Tests that a nullifier at the high end of the safe field range
/// produces a valid and distinct commitment.
#[test]
fn test_near_field_limit_nullifier_zero_secret() {
    // 0x0FFFF... is well within BN254 (< r) but near the 31-byte ceiling
    let nullifier: Field = 0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let secret: Field    = 0;
    let pool_id: Field   = 1;
    let c = hash::compute_commitment(nullifier, secret, pool_id);
    main(nullifier, secret, pool_id, c);
    assert(c != 0, "near-max nullifier with zero secret must still produce non-zero commitment");
}

/// TC-C-19: Zero nullifier with near-field-limit secret.
/// Mirror of TC-C-18 to confirm neither field position is special-cased.
#[test]
fn test_zero_nullifier_near_field_limit_secret() {
    let nullifier: Field = 0;
    let secret: Field    = 0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let pool_id: Field   = 1;
    let c = hash::compute_commitment(nullifier, secret, pool_id);
    main(nullifier, secret, pool_id, c);
    assert(c != 0, "zero nullifier with near-max secret must produce non-zero commitment");
}

/// TC-C-20: TC-C-18 and TC-C-19 produce different commitments.
/// Verifies that swapping near-max and zero between the two positions
/// does not accidentally collide.
#[test]
fn test_near_field_limit_position_swap_produces_distinct_commitments() {
    let high: Field = 0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let pool_id: Field = 1;
    let c1 = hash::compute_commitment(high, 0, pool_id);
    let c2 = hash::compute_commitment(0, high, pool_id);
    assert(c1 != c2, "swapping near-max and zero between nullifier/secret must yield distinct commitments");
}

/// TC-C-21: Incremental delta on all three inputs simultaneously.
/// Verifies that a unit increment on each input changes the commitment,
/// ruling out any accidental cancellation in the hash.
#[test]
fn test_incremental_delta_all_inputs_changes_commitment() {
    let c_base      = hash::compute_commitment(100, 200, 300);
    let c_null_inc  = hash::compute_commitment(101, 200, 300);
    let c_sec_inc   = hash::compute_commitment(100, 201, 300);
    let c_pool_inc  = hash::compute_commitment(100, 200, 301);

    assert(c_base != c_null_inc,  "nullifier+1 must change the commitment");
    assert(c_base != c_sec_inc,   "secret+1 must change the commitment");
    assert(c_base != c_pool_inc,  "pool_id+1 must change the commitment");
    // All four must be mutually distinct
    assert(c_null_inc != c_sec_inc,  "nullifier-delta and secret-delta commitments must differ");
    assert(c_null_inc != c_pool_inc, "nullifier-delta and pool_id-delta commitments must differ");
    assert(c_sec_inc  != c_pool_inc, "secret-delta and pool_id-delta commitments must differ");
}

/// TC-C-22: All-equal inputs (nullifier == secret == pool_id).
/// An edge case where the three preimage positions carry identical values;
/// the circuit must still accept the commitment and produce a unique output.
#[test]
fn test_all_equal_inputs_valid_and_unique() {
    let v: Field = 0xabcdef;
    let c = hash::compute_commitment(v, v, v);
    main(v, v, v, c);
    // Must differ from a commitment with only two equal inputs
    let c2 = hash::compute_commitment(v, v, 0);
    assert(c != c2, "all-equal inputs must yield a different commitment than a partially-zero variant");
}
