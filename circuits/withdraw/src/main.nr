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
    // Use unconstrained to compute index bits to reduce constraints
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

/// Build a minimal valid Merkle path for a leaf at index 0 in a depth-20 tree.
/// All siblings are 0 - simulates an empty tree with one note.
fn build_simple_path(leaf: Field) -> ([Field; 20], Field) {
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(leaf, 0, hash_path);
    (hash_path, root)
}

#[test]
fn test_valid_withdrawal() {
    let nullifier: Field = 111;
    let secret: Field = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);

    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    let recipient: Field = 0xABCD;
    let amount: Field = 100_0000000; // 100 XLM in stroops
    let relayer: Field = 0;
    let fee: Field = 0;

    main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash, recipient, amount, relayer, fee
    );
}

#[test]
fn test_withdrawal_with_relayer_fee() {
    let nullifier: Field = 333;
    let secret: Field = 444;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);

    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);
    let recipient: Field = 0xDEAD;
    let amount: Field = 100_0000000;
    let relayer: Field = 0xBEEF;
    let fee: Field = 1_0000000; // 1 XLM fee

    main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash, recipient, amount, relayer, fee
    );
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_secret_fails() {
    let nullifier: Field = 111;
    let secret: Field = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Use wrong secret - commitment won't match leaf in tree
    main(nullifier, 999, 0, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "merkle inclusion check failed: leaf not in tree")]
fn test_wrong_root_fails() {
    let nullifier: Field = 111;
    let secret: Field = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, _real_root) = build_simple_path(commitment);
    let wrong_root: Field = 9999;
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, wrong_root);

    // Wrong root - Merkle inclusion fails
    main(nullifier, secret, 0, hash_path, wrong_root, nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "nullifier_hash mismatch: invalid nullifier or wrong root")]
fn test_wrong_nullifier_hash_fails() {
    let nullifier: Field = 111;
    let secret: Field = 222;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let wrong_nullifier_hash: Field = 54321; // fabricated

    // Correct Merkle proof but wrong nullifier_hash
    main(nullifier, secret, 0, hash_path, root, wrong_nullifier_hash, 0xABCD, 100_0000000, 0, 0);
}

#[test(should_fail_with = "fee cannot exceed withdrawal amount")]
fn test_fee_exceeds_amount_fails() {
    let nullifier: Field = 555;
    let secret: Field = 666;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // fee > amount - should fail
    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xABCD, 10, 0xBEEF, 100);
}

#[test(should_fail_with = "relayer must be zero address if fee is zero")]
fn test_nonzero_relayer_with_zero_fee_fails() {
    let nullifier: Field = 777;
    let secret: Field = 888;
    let commitment = hash::compute_commitment(nullifier, secret);

    let (hash_path, root) = build_simple_path(commitment);
    let nullifier_hash = hash::compute_nullifier_hash(nullifier, root);

    // Non-zero relayer with zero fee - should fail
    main(nullifier, secret, 0, hash_path, root, nullifier_hash, 0xABCD, 100_0000000, 0xBEEF, 0);
}
