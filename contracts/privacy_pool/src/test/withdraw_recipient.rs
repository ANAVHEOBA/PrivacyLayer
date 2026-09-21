//! Unit tests for the withdraw recipient binding logic.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, Vec};

#[test]
fn test_recipient_hash_matches_proof_input() {
    let env = Env::default();
    env.mock_all_auths();

    let recipient = Address::generate(&env);
    let hash_bytes = super::super::core::withdraw::hash_recipient(&env, &recipient);
    let mut truncated = [0u8; 16];
    truncated.copy_from_slice(&hash_bytes.as_ref()[..16]);
    let expected = u128::from_be_bytes(truncated);

    // Simulate a public input vector where the recipient hash is at index 4.
    let mut inputs = Vec::new(&env);
    for _ in 0..4 {
        inputs.push_back(0u128);
    }
    inputs.push_back(expected);

    // The verifier stub always returns true for this test.
    let proof = BytesN::from_array(&env, &[0u8; 64]);
    let result = super::super::core::withdraw::withdraw(&env, proof, inputs, recipient);
    assert_eq!(result, Ok(()));
}
