// ============================================================
// PrivacyLayer - Withdrawal Proof Circuit
// ============================================================
// The core privacy circuit. Proves ALL of the following in one proof:
//
//   1. I know (nullifier, secret) such that:
//      commitment = Hash(nullifier, secret)
//
//   2. The commitment exists in the shielded pool Merkle tree:
//      compute_root(commitment, leaf_index, hash_path) == root
//
//   3. The nullifier_hash is correctly derived from the nullifier:
//      nullifier_hash = Hash(nullifier, root)
//      (binds the nullifier to this specific root - prevents cross-pool replay)
//
//   4. The recipient and amount are bound to the proof:
//      (prevents front-running / proof reuse attacks)
//
// This proof is verified on-chain by the Soroban contract via
// Stellar Protocol 25 BN254 pairing host functions (CAP-0074).
//
// Inspired by:
//   - Tornado Cash withdraw.circom (https://github.com/tornadocash/tornado-core)
//   - Aztec.nr spend circuit patterns
//   - Penumbra Spend circuit (groth16)
// ============================================================

use lib::hash;
use lib::merkle;
use lib::validation;

/// Full withdrawal proof circuit.
///
/// # Private witnesses (known only to the note holder)
/// - `nullifier`  : per-note random value; revealed via nullifier_hash
/// - `secret`     : per-note random value; never revealed
/// - `leaf_index` : position of commitment in the Merkle tree
/// - `hash_path`  : Merkle authentication path (siblings at each level)
///
/// # Public inputs (verified on-chain)
/// - `root`           : Merkle root that proves membership (must be a known historical root)
/// - `nullifier_hash` : Hash(nullifier, root) - prevents double-spend
/// - `recipient`      : Stellar address hash - prevents front-running
/// - `amount`         : denomination being withdrawn (e.g. 100_0000000 stroops = 100 XLM)
/// - `relayer`        : optional relayer address hash (0 if none)
/// - `fee`            : relayer fee (0 if no relayer)
fn main(
    // --- Private witnesses ---
    nullifier: Field,
    secret: Field,
    leaf_index: Field,
    hash_path: [Field; 20],

    // --- Public inputs ---
    root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    amount: pub Field,
    relayer: pub Field,
    fee: pub Field,
) {
    // -- Step 1: Reconstruct commitment --
    // commitment = Hash(nullifier, secret)
    // Same as the deposit step - must match what was stored in the tree
    let commitment = hash::compute_commitment(nullifier, secret);

    // -- Step 2: Verify Merkle inclusion --
    // Prove that commitment is a leaf in the tree with the given root
    merkle::verify_inclusion(commitment, leaf_index, hash_path, root);

    // -- Step 3: Verify nullifier hash --
    // nullifier_hash = Hash(nullifier, root)
    // Binding to root prevents the same nullifier being used across different
    // pool snapshots (replay attack prevention)
    let computed_nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    validation::validate_nullifier_hash(computed_nullifier_hash, nullifier_hash);

    // -- Step 4: Validate withdrawal parameters --
    // Fee must not exceed amount
    validation::validate_fee(fee, amount);
    
    // Relayer must be zero if fee is zero
    validation::validate_relayer(relayer, fee);
    
    // Bind recipient to prevent front-running
    // (In Groth16, all pub inputs are automatically bound to the proof)
    let _ = recipient;
}

// ============================================================
// Tests - covering all circuit paths
// ============================================================
// Total tests: 21
//   - Happy path tests        (4)
//   - Merkle / inclusion tests (6)
//   - Nullifier / hash tests   (4)
//   - Fee / relayer tests      (4)
//   - Boundary / misc tests    (3)
// ============================================================

// ------------------------------------------------------------
// Helper: Build a minimal Merkle path for a leaf at a given index.
// All siblings are zero - simulates an otherwise-empty tree.
// ------------------------------------------------------------

/// Returns (hash_path, root) for placing `leaf` at `leaf_index` in a
/// depth-20 tree where all other leaves are zero.
fn build_path_at(leaf: Field, leaf_index: Field) -> ([Field; 20], Field) {
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(leaf, leaf_index, hash_path);
    (hash_path, root)
}

/// Convenience wrapper for leaf at index 0.
fn build_simple_path(leaf: Field) -> ([Field; 20], Field) {
    build_path_at(leaf, 0)
}

// ------------------------------------------------------------
// Happy Path Tests
// ------------------------------------------------------------

/// TC-W-01: Standard withdrawal with no relayer.
/// Full valid proof for a single note at tree index 0.
#[test]
fn test_valid_withdrawal() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash, 0xABCD, 100_0000000, 0, 0,
    );
}

/// TC-W-02: Withdrawal with a relayer and non-zero fee (fee < amount).
/// Tests the happy-path of the relayer compensation branch.
#[test]
fn test_withdrawal_with_relayer_fee() {
    let nullifier: Field = 333;
    let secret: Field    = 444;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash,
        0xDEAD,        // recipient
        100_0000000,   // 100 XLM
        0xBEEF,        // relayer
        1_0000000,     // 1 XLM fee
    );
}

/// TC-W-03: Fee equals amount (fee == amount) -- boundary where fee is exactly equal.
/// This is the maximum legal fee; the circuit should accept it.
#[test]
fn test_withdrawal_fee_equals_amount() {
    let nullifier: Field = 555;
    let secret: Field    = 666;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    let amount: Field  = 50_0000000; // 50 XLM

    // fee == amount is valid (relayer takes everything, recipient gets 0)
    main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash, 0xABCD, amount, 0xBEEF, amount,
    );
}

/// TC-W-04: Note at non-zero leaf index (index=7).
/// Verifies the index decomposition works for arbitrary positions.
#[test]
fn test_withdrawal_nonzero_leaf_index() {
    let nullifier: Field = 777;
    let secret: Field    = 888;
    let commitment = hash::compute_commitment(nullifier, secret);
    let leaf_index: Field = 7; // binary: 0b0...0111

    let (hash_path, root) = build_path_at(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        root, nullifier_hash, 0x1111, 100_0000000, 0, 0,
    );
}

// ------------------------------------------------------------
// Merkle Inclusion Tests
// ------------------------------------------------------------

/// TC-W-05: Wrong secret changes the commitment, causing Merkle inclusion to fail.
/// The reconstructed commitment does not match any leaf in the tree.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_secret_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Wrong secret changes commitment -> Merkle inclusion fails
    main(nullifier, 999, 0, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-06: Wrong root -- the provided root was never a valid on-chain root.
/// The computed root from the path will not match, so inclusion fails.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_root_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, _real_root) = build_simple_path(commitment);
    let wrong_root: Field = 9999;
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, wrong_root);

    // Wrong root - Merkle inclusion fails
    main(nullifier, secret, 0, hash_path, wrong_root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-07: Wrong leaf index with valid Merkle path for index 0.
/// Using index=1 with a path computed for index=0 produces a different root.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_leaf_index_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    // Path/root computed for leaf at index 0
    let (hash_path, root) = build_path_at(commitment, 0);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Claim the leaf is at index 1 -> recomputed root won't match
    main(nullifier, secret, 1, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-08: Tampered sibling in the auth path -- one sibling is altered.
/// The recomputed root will diverge from the real root at that level.
#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_tampered_auth_path_fails() {
    let nullifier: Field = 321;
    let secret: Field    = 654;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (mut hash_path, root) = build_simple_path(commitment);
    // Tamper with sibling at level 3
    hash_path[3] = 0xdeadbeef;

    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-09: Zero commitment (nullifier=0, secret=0) is still valid if the tree
/// actually contains that commitment. The circuit should not special-case zero.
#[test]
fn test_zero_commitment_valid_if_in_tree() {
    let nullifier: Field = 0;
    let secret: Field    = 0;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-10: Proof for leaf at maximum index (all bits set in 20-bit index = 2^20 - 1).
/// Exercises the full 20-level path decomposition.
#[test]
fn test_max_leaf_index() {
    let nullifier: Field = 0xAA;
    let secret: Field    = 0xBB;
    let commitment = hash::compute_commitment(nullifier, secret);
    // 2^20 - 1 = 1048575 -- rightmost leaf in the tree
    let leaf_index: Field = 1048575;

    let (hash_path, root) = build_path_at(commitment, leaf_index);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, leaf_index, hash_path,
        root, nullifier_hash, 0xFFFF, 100_0000000, 0, 0,
    );
}

// ------------------------------------------------------------
// Nullifier Hash Tests
// ------------------------------------------------------------

/// TC-W-11: Fabricated nullifier_hash -- attacker cannot forge the double-spend tag.
/// Merkle inclusion passes, but the nullifier_hash check fails.
#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_wrong_nullifier_hash_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let wrong_nullifier_hash: Field = 54321; // fabricated

    // Correct Merkle proof but wrong nullifier_hash
    main(nullifier, secret, 0, hash_path, root, wrong_nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-12: Nullifier_hash derived from a different nullifier.
/// Even with a valid Merkle proof, the nullifier_hash must bind to THIS nullifier.
#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_nullifier_hash_from_different_nullifier_fails() {
    let nullifier: Field  = 111;
    let secret: Field     = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    // Compute nullifier_hash using a different nullifier
    let wrong_nh = hash::compute_nullifier_hash(9999, root);

    main(nullifier, secret, 0, hash_path, root, wrong_nh, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-13: Nullifier_hash computed for a different root (cross-root replay attempt).
/// An attacker tries to reuse a nullifier_hash from an old pool snapshot.
#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_nullifier_hash_bound_to_root() {
    let nullifier: Field  = 111;
    let secret: Field     = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);

    // Nullifier hash computed against a DIFFERENT root (simulates old snapshot)
    let stale_root: Field = 0xdeadcafe;
    let stale_nh = hash::compute_nullifier_hash(nullifier, stale_root);

    // Merkle inclusion uses real root, but nullifier_hash uses stale root -> mismatch
    main(nullifier, secret, 0, hash_path, root, stale_nh, 0xABCD, 100_0000000, 0, 0);
}

/// TC-W-14: Zero nullifier_hash -- attacker submits 0 hoping it's skipped.
#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_zero_nullifier_hash_fails() {
    let nullifier: Field = 111;
    let secret: Field    = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);

    main(nullifier, secret, 0, hash_path, root, 0, 0xABCD, 100_0000000, 0, 0);
}

// ------------------------------------------------------------
// Fee / Relayer Validation Tests
// ------------------------------------------------------------

/// TC-W-15: Fee exceeds withdrawal amount -- must fail.
/// Simulates a malicious relayer that sets fee > amount.
#[test(should_fail_with = "fee cannot exceed withdrawal amount")]
fn test_fee_exceeds_amount_fails() {
    let nullifier: Field = 555;
    let secret: Field    = 666;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // fee (100) > amount (10) -- should fail
    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xABCD, 10, 0xBEEF, 100);
}

/// TC-W-16: Non-zero relayer address with zero fee -- must fail.
/// Relayer must not be set when no fee is charged (prevents griefing).
#[test(should_fail_with = "relayer must be zero address if fee is zero")]
fn test_nonzero_relayer_with_zero_fee_fails() {
    let nullifier: Field = 777;
    let secret: Field    = 888;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Non-zero relayer with zero fee - should fail
    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0xBEEF, 0);
}

/// TC-W-17: Zero fee AND zero relayer -- valid (no relayer path).
/// This is the normal self-serve withdrawal with no relayer.
#[test]
fn test_zero_fee_zero_relayer_valid() {
    let nullifier: Field = 123;
    let secret: Field    = 456;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xCC, 100_0000000, 0, 0);
}

/// TC-W-18: Maximum fee with non-zero amount (fee == 1, amount == 1).
/// Boundary test: smallest non-zero amount and fee that are equal.
#[test]
fn test_unit_amount_unit_fee_valid() {
    let nullifier: Field = 987;
    let secret: Field    = 654;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // fee == amount == 1 (minimum non-zero -- boundary condition)
    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xBB, 1, 0xAA, 1);
}

// ------------------------------------------------------------
// Boundary / Miscellaneous Tests
// ------------------------------------------------------------

/// TC-W-19: Large but valid field values for all inputs.
/// Exercises the circuit with hex-literal witnesses to ensure no overflow.
#[test]
fn test_withdrawal_large_field_values() {
    let nullifier: Field = 0x00000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let secret: Field    = 0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash, 0x1234567890ABCDEF, 999_0000000, 0, 0,
    );
}

/// TC-W-20: Two separate notes withdrawn from the same pool root.
/// Both proofs are valid; nullifier_hashes differ because nullifiers differ.
#[test]
fn test_two_notes_same_root_both_valid() {
    // Note 1
    let n1: Field = 0xAA; let s1: Field = 0xBB;
    let c1 = hash::compute_commitment(n1, s1);

    // Note 2
    let n2: Field = 0xCC; let s2: Field = 0xDD;
    let c2 = hash::compute_commitment(n2, s2);

    // Place both commitments in the same tree (index 0 and 1)
    let mut path1: [Field; 20] = [0; 20];
    path1[0] = c2; // sibling of c1 at level 0 is c2
    let root = merkle::compute_root(c1, 0, path1);

    let mut path2: [Field; 20] = [0; 20];
    path2[0] = c1; // sibling of c2 at level 0 is c1
    // root for c2 at index 1 with sibling c1
    let root2 = merkle::compute_root(c2, 1, path2);

    // Both should compute the same global root
    assert(root == root2, "both notes must share the same tree root");

    let nh1 = hash::compute_nullifier_hash(n1, root);
    let nh2 = hash::compute_nullifier_hash(n2, root);

    main(n1, s1, 0, path1, root, nh1, 0xA1, 1_0000000, 0, 0);
    main(n2, s2, 1, path2, root, nh2, 0xA2, 1_0000000, 0, 0);
}

/// TC-W-21: Nullifier hashes for same nullifier in different roots must differ.
/// Critical cross-pool replay prevention check.
#[test]
fn test_nullifier_hash_differs_across_roots() {
    let nullifier: Field = 0x1234;

    // Two different Merkle roots (simulating two pool timestamps)
    let root_a: Field = 1111;
    let root_b: Field = 2222;

    let nh_a = hash::compute_nullifier_hash(nullifier, root_a);
    let nh_b = hash::compute_nullifier_hash(nullifier, root_b);

    assert(nh_a != nh_b, "same nullifier in different roots must yield different nullifier_hashes");
}
