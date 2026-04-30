// ============================================================
// Spend Module - Core withdrawal constraints
// ============================================================
// Encapsulates the essential spend logic separate from test
// scaffolding and helper code. This module contains the core
// constraints that form the foundation of the withdrawal proof.
//
// ZK-073: Relayer binding is unified through validation::fee.nr
// which defines the canonical encoding contract:
//   Mode 1: No relayer      → relayer == 0 && fee == 0
//   Mode 2: Relayer + fee   → relayer != 0 && fee > 0
//   Mode 3: Malformed       → REJECTED by circuit assertion
// ============================================================

use lib::hash;
use lib::merkle;
use lib::validation;

/// Core withdrawal constraints.
///
/// Verifies all privacy-critical checks for a withdrawal:
/// 1. Commitment matches note secret and nullifier
/// 2. Commitment is in the Merkle tree (ownership proof)
/// 3. Nullifier hash prevents double-spend (ZK-035: pool-scoped)
/// 4. Amount matches pool's fixed denomination (ZK-030)
/// 5. Fee and relayer parameters are valid (ZK-073: unified binding)
///
/// # Arguments
/// - Private inputs: nullifier, secret, leaf_index, hash_path
/// - Public inputs: root, nullifier_hash, recipient, amount, relayer, fee, denomination
pub fn verify_withdrawal_constraints(
    nullifier: Field,
    secret: Field,
    pool_id: Field,
    leaf_index: Field,
    hash_path: [Field; 20],
    root: Field,
    nullifier_hash: Field,
    recipient: Field,
    amount: Field,
    relayer: Field,
    fee: Field,
    denomination: Field,
) {
    // Step 1: Reconstruct commitment from note secret, nullifier and pool_id
    let commitment = hash::compute_commitment(nullifier, secret, pool_id);

    // Step 2: Prove commitment is in the tree
    // (includes leaf_index range validation)
    merkle::verify_inclusion(commitment, leaf_index, hash_path, root);

    // Step 3: Verify nullifier hash (ZK-035: pool-scoped, prevents double-spend and cross-pool replay)
    let computed_nullifier_hash = hash::compute_nullifier_hash(nullifier, pool_id);
    validation::validate_nullifier_hash(computed_nullifier_hash, nullifier_hash);

    // Step 4: Validate amount matches pool denomination (ZK-030)
    validation::validate_denomination(amount, denomination);

    // Step 5: Validate fee and relayer — ZK-073 unified binding contract
    // R1: fee <= amount
    // R2: fee == 0 → relayer == 0 (no relayer)
    // R3: fee > 0  → relayer != 0 (relayer required)
    validation::validate_fee(fee, amount);
    validation::validate_relayer(relayer, fee);

    // Step 5b: ZK-073 defense-in-depth — reject malformed relayer patterns
    validation::validate_relayer_not_malformed(relayer);

    // Step 6: Bind recipient to proof (implicit in Groth16 via public inputs)
    let _ = recipient;
}

mod tests {

    use super::verify_withdrawal_constraints;
    use lib::validation::test_helpers::setup_valid_withdrawal;
    use lib::constants::DEFAULT_DENOMINATION;


    #[test]
    fn test_spend_constraints_happy_path() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, fee) =
            setup_valid_withdrawal();

        // Should not panic
        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION, relayer, fee, DEFAULT_DENOMINATION
        );
    }

    // ------------------------------------------------------------------
    // ZK-073: Relayer binding regression tests
    // ------------------------------------------------------------------

    /// Mode 1: No relayer — fee=0, relayer=0 (canonical no-relayer case)
    #[test]
    fn test_spend_no_relayer_zero_fee() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, _relayer, _fee) =
            setup_valid_withdrawal();

        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION,
            0, // relayer = 0 (no relayer)
            0, // fee = 0
            DEFAULT_DENOMINATION
        );
    }

    /// Mode 2: Relayer + fee — relayer != 0, fee > 0
    #[test]
    fn test_spend_with_relayer_and_fee() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, _relayer, _fee) =
            setup_valid_withdrawal();

        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION,
            0xc0ffee, // relayer != 0
            5,        // fee > 0
            DEFAULT_DENOMINATION
        );
    }

    /// Mode 3 (rejected): fee=0 but relayer != 0 — absent relayer cleanly rejected
    #[test(should_fail_with = "relayer must be zero address if fee is zero")]
    fn test_spend_phantom_relayer_rejected() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, _relayer, _fee) =
            setup_valid_withdrawal();

        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION,
            0xdeadbeef, // relayer != 0 but fee = 0 → REJECT
            0,
            DEFAULT_DENOMINATION
        );
    }

    /// Mode 3 (rejected): fee > 0 but relayer = 0 — relayer mismatch
    #[test(should_fail_with = "relayer must be non-zero address if fee is non-zero")]
    fn test_spend_orphan_fee_rejected() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, _relayer, _fee) =
            setup_valid_withdrawal();

        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION,
            0,  // relayer = 0 but fee > 0 → REJECT
            42,
            DEFAULT_DENOMINATION
        );
    }

    // ------------------------------------------------------------------
    // Existing constraint tests
    // ------------------------------------------------------------------

    #[test(should_fail)]
    fn test_spend_constraints_wrong_commitment() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, fee) =
            setup_valid_withdrawal();

        let wrong_secret = secret + 1;
        // Commitment mismatch will cause merkle verification to fail
        verify_withdrawal_constraints(
            nullifier, wrong_secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION, relayer, fee, DEFAULT_DENOMINATION
        );
    }

    #[test(should_fail)]
    fn test_spend_constraints_invalid_merkle_path() {
        let (nullifier, secret, pool_id, leaf_index, mut hash_path, root, nullifier_hash, recipient, relayer, fee) =
            setup_valid_withdrawal();

        // Corrupt merkle path
        hash_path[0] = hash_path[0] + 1;
        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION, relayer, fee, DEFAULT_DENOMINATION
        );
    }

    #[test(should_fail)]
    fn test_spend_constraints_invalid_nullifier_hash() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, fee) =
            setup_valid_withdrawal();

        let wrong_nullifier_hash = nullifier_hash + 1;
        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            wrong_nullifier_hash, recipient, DEFAULT_DENOMINATION, relayer, fee, DEFAULT_DENOMINATION
        );
    }

    #[test(should_fail)]
    fn test_spend_constraints_mismatched_denomination() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, fee) =
            setup_valid_withdrawal();

        // Amount does not match pool denomination
        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, 999, relayer, fee, DEFAULT_DENOMINATION
        );
    }

    #[test(should_fail)]
    fn test_spend_constraints_fee_exceeds_amount() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, _) =
            setup_valid_withdrawal();

        let amount = 100;
        let fee = 101;
        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, amount, relayer, fee, amount
        );
    }

    #[test(should_fail)]
    fn test_spend_constraints_relayer_without_fee() {
        let (nullifier, secret, pool_id, leaf_index, hash_path, root, nullifier_hash, recipient, relayer, _) =
            setup_valid_withdrawal();

        let non_zero_relayer = relayer + 1;
        verify_withdrawal_constraints(
            nullifier, secret, pool_id, leaf_index, hash_path, root,
            nullifier_hash, recipient, DEFAULT_DENOMINATION, non_zero_relayer, 0, DEFAULT_DENOMINATION
        );
    }
}
