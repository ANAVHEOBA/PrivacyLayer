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

/// Commitment circuit - proves knowledge of a note's preimage.
///
/// # Private inputs
/// - `nullifier`  : unique per-note random field element; revealed on spend
/// - `secret`     : random field element; never revealed
///
/// # Public inputs
/// - `commitment` : Hash(nullifier, secret) - stored on-chain
fn main(
    // Private witnesses
    nullifier: Field,
    secret: Field,
    // Public statement
    commitment: pub Field,
) {
    // Compute commitment from private inputs
    let computed_commitment = hash::compute_commitment(nullifier, secret);

    // Validate the computed commitment matches the public on-chain value
    validation::validate_commitment(computed_commitment, commitment);
}

// ============================================================
// Tests - following noir-lang/noir-examples test patterns
// ============================================================
// Total tests: 16
//   - Happy path tests (4)
//   - Zero / boundary tests (4)
//   - Collision / uniqueness tests (3)
//   - Attack / failure tests (5)
// ============================================================

// ------------------------------------------------------------
// Happy Path Tests
// ------------------------------------------------------------

/// TC-C-01: Basic valid commitment with small field values.
/// Verifies the circuit accepts correctly-formed proofs.
#[test]
fn test_valid_commitment() {
    // Known values: commitment = Hash(nullifier=1, secret=2)
    let nullifier: Field = 1;
    let secret: Field = 2;
    let commitment = hash::compute_commitment(nullifier, secret);

    // Should pass - correct preimage
    main(nullifier, secret, commitment);
}

/// TC-C-02: Valid commitment with large hex-encoded field elements
/// (simulates realistic SDK-generated random values near field size).
#[test]
fn test_valid_commitment_large_values() {
    let nullifier: Field = 0x0000000000000000000000000000000000000000000000000000000000000064; // 100
    let secret: Field    = 0x00000000000000000000000000000000000000000000000000000000000003e8; // 1000
    let commitment = hash::compute_commitment(nullifier, secret);

    main(nullifier, secret, commitment);
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
    let commitment = hash::compute_commitment(nullifier, secret);

    main(nullifier, secret, commitment);
}

/// TC-C-04: Determinism -- same inputs always yield the exact same commitment.
/// Essential for note reconstruction and proof generation.
#[test]
fn test_commitment_is_deterministic() {
    let nullifier: Field = 0xdeadbeef;
    let secret: Field    = 0xcafebabe;

    let c1 = hash::compute_commitment(nullifier, secret);
    let c2 = hash::compute_commitment(nullifier, secret);

    // If commitments are equal, the circuit accepts both
    assert(c1 == c2, "commitment must be deterministic");
    main(nullifier, secret, c1);
}

// ------------------------------------------------------------
// Zero / Boundary Value Tests
// ------------------------------------------------------------

/// TC-C-05: Zero nullifier with zero secret -- edge case where both
/// inputs are the additive identity. The circuit must compute and
/// accept H(0, 0) as a valid commitment (not special-cased to fail).
#[test]
fn test_zero_inputs_valid_commitment() {
    let nullifier: Field = 0;
    let secret: Field    = 0;
    let commitment = hash::compute_commitment(nullifier, secret);
    main(nullifier, secret, commitment);
}

/// TC-C-06: Zero nullifier -- only the secret is non-zero.
/// Verifies partial-zero inputs are handled correctly.
#[test]
fn test_zero_nullifier_nonzero_secret() {
    let nullifier: Field = 0;
    let secret: Field    = 12345;
    let commitment = hash::compute_commitment(nullifier, secret);
    main(nullifier, secret, commitment);
}

/// TC-C-07: Non-zero nullifier with zero secret.
/// Mirror of TC-C-06 for the other input.
#[test]
fn test_nonzero_nullifier_zero_secret() {
    let nullifier: Field = 99999;
    let secret: Field    = 0;
    let commitment = hash::compute_commitment(nullifier, secret);
    main(nullifier, secret, commitment);
}

/// TC-C-08: nullifier == secret (identical inputs).
/// The hash function ought to distinguish this from other cases;
/// the circuit accepts it as long as the commitment is correct.
#[test]
fn test_identical_nullifier_and_secret() {
    let nullifier: Field = 7777;
    let secret: Field    = 7777;
    let commitment = hash::compute_commitment(nullifier, secret);
    main(nullifier, secret, commitment);
}

// ------------------------------------------------------------
// Collision / Uniqueness Tests
// ------------------------------------------------------------

/// TC-C-09: Different notes must produce different commitments (collision resistance).
/// A collision would allow two depositors to share a single on-chain slot.
#[test]
fn test_no_commitment_collision_different_inputs() {
    let c1 = hash::compute_commitment(1, 2);
    let c2 = hash::compute_commitment(3, 4);
    assert(c1 != c2, "different (nullifier, secret) pairs must not collide");
}

/// TC-C-10: Verify the hash is NOT symmetric, i.e. H(a,b) != H(b,a).
/// If it were symmetric, swapped inputs would open any note.
#[test]
fn test_commitment_is_not_symmetric() {
    let a: Field = 10;
    let b: Field = 20;
    let c_ab = hash::compute_commitment(a, b);
    let c_ba = hash::compute_commitment(b, a);
    // For a correctly ordered hash we expect c_ab != c_ba.
    // If Pedersen is symmetric for this case this assertion would fail, exposing the bug.
    assert(c_ab != c_ba, "H(a,b) must differ from H(b,a) – hash must be non-symmetric");
}

/// TC-C-11: Verifying that incrementing nullifier by 1 changes the commitment.
/// Ensures small deltas are visible (no partial-preimage attack surface).
#[test]
fn test_adjacent_nullifiers_produce_distinct_commitments() {
    let secret: Field = 100;
    let c1 = hash::compute_commitment(1, secret);
    let c2 = hash::compute_commitment(2, secret);
    assert(c1 != c2, "adjacent nullifiers must produce different commitments");
}

// ------------------------------------------------------------
// Attack / Failure Tests
// ------------------------------------------------------------

/// TC-C-12: Wrong nullifier with correct secret and real commitment -- must fail.
/// Simulates an adversary who knows the secret but not the nullifier.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_wrong_nullifier_fails() {
    let nullifier: Field = 1;
    let secret: Field    = 2;
    let commitment = hash::compute_commitment(nullifier, secret);

    // Provide wrong nullifier - should fail the assertion
    main(999, secret, commitment);
}

/// TC-C-13: Wrong secret with correct nullifier and real commitment -- must fail.
/// Simulates an adversary who knows the nullifier but not the secret.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_wrong_secret_fails() {
    let nullifier: Field = 1;
    let secret: Field    = 2;
    let commitment = hash::compute_commitment(nullifier, secret);

    // Provide wrong secret - should fail the assertion
    main(nullifier, 888, commitment);
}

/// TC-C-14: Swapped nullifier / secret -- must fail.
/// Even when both values are known, order matters in H(nullifier, secret).
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_swapped_inputs_fails() {
    let nullifier: Field = 1;
    let secret: Field    = 2;
    let commitment = hash::compute_commitment(nullifier, secret);

    // Swap nullifier and secret - should fail (hash is not symmetric)
    main(secret, nullifier, commitment);
}

/// TC-C-15: Fabricated (random) commitment value with zero inputs -- must fail.
/// An attacker who cannot compute the preimage should never be able to pass
/// a random commitment through the circuit.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_zero_inputs_with_fabricated_commitment_fails() {
    // Both zero with fabricated commitment value - should fail
    main(0, 0, 12345);
}

/// TC-C-16: Off-by-one commitment -- commitment is H(nullifier, secret) + 1.
/// Ensures the constraint rejects values that are only slightly wrong.
#[test(should_fail_with = "commitment mismatch: invalid nullifier/secret pair")]
fn test_off_by_one_commitment_fails() {
    let nullifier: Field = 42;
    let secret: Field    = 43;
    let real_commitment = hash::compute_commitment(nullifier, secret);
    // Add 1 to produce an off-by-one value (will wrap in the field -- still wrong)
    let tampered: Field = real_commitment + 1;
    main(nullifier, secret, tampered);
}
