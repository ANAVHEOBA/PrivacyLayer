//! Integration tests for the privacy pool contract focusing on the withdraw
//! flow after the recipient‑binding fix (ZK‑072).

#![allow(dead_code)]

use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, Vec};

use crate::{
    core::withdraw::{self, WithdrawError},
    storage,
    // other modules...
};

/// Helper that creates a dummy proof and public inputs where the recipient hash
/// corresponds to `recipient`.
fn make_dummy_proof_and_inputs(env: &Env, recipient: &Address) -> (BytesN<64>, Vec<u128>) {
    // In a real test we would generate a proof using the SDK. For simplicity we
    // construct a placeholder proof (all zeros) and manually compute the public
    // inputs that the verifier would accept.
    let proof = BytesN::from_array(env, &[0u8; 64]);

    // Compute the hash of the recipient address using the same logic as the
    // contract.
    let recipient_hash_bytes = super::core::withdraw::hash_recipient(env, recipient);
    let mut hash_bytes = [0u8; 16];
    hash_bytes.copy_from_slice(&recipient_hash_bytes.as_ref()[..16]);
    let recipient_hash = u128::from_be_bytes(hash_bytes);

    // Assemble a minimal public inputs vector. The exact ordering must match
    // the circuit; we only need to provide the recipient hash at the correct
    // index for this test.
    let mut inputs = Vec::new(env);
    // Placeholder values for other public inputs (root, nullifier, amount, fee)
    inputs.push_back(0u128); // merkle root
    inputs.push_back(0u128); // nullifier
    inputs.push_back(0u128); // amount
    inputs.push_back(0u128); // fee
    inputs.push_back(recipient_hash); // RECIPIENT_HASH_INDEX == 4
    // ... any additional inputs the circuit expects could be appended here ...

    (proof, inputs)
}

#[test]
fn test_withdraw_successful_recipient_match() {
    let env = Env::default();
    env.mock_all_auths();

    // Set up a dummy contract instance and configuration.
    let contract_id = env.register_contract(None, crate::Contract);
    let client = crate::ContractClient::new(&env, &contract_id);
    storage::Config::set(&env, &storage::Config {
        // ... populate required config fields ...
        ..Default::default()
    });

    // Choose a recipient address.
    let recipient = Address::generate(&env);

    // Generate a dummy proof that binds to this recipient.
    let (proof, public_inputs) = make_dummy_proof_and_inputs(&env, &recipient);

    // Call withdraw – should succeed.
    let res = withdraw::withdraw(&env, proof, public_inputs, recipient.clone());
    assert_eq!(res, Ok(()));
}

#[test]
fn test_withdraw_fails_on_recipient_mismatch() {
    let env = Env::default();
    env.mock_all_auths();

    // Contract setup (same as above).
    let contract_id = env.register_contract(None, crate::Contract);
    let client = crate::ContractClient::new(&env, &contract_id);
    storage::Config::set(&env, &storage::Config {
        // ... populate required config fields ...
        ..Default::default()
    });

    // Correct recipient that the proof is bound to.
    let correct_recipient = Address::generate(&env);
    // Wrong recipient that will be supplied to the withdraw call.
    let wrong_recipient = Address::generate(&env);

    // Generate a dummy proof bound to the correct recipient.
    let (proof, public_inputs) = make_dummy_proof_and_inputs(&env, &correct_recipient);

    // Attempt withdraw with the wrong recipient – expect a RecipientMismatch error.
    let res = withdraw::withdraw(&env, proof, public_inputs, wrong_recipient);
    assert_eq!(res, Err(WithdrawError::RecipientMismatch));
}
