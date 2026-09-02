// ============================================================
// PrivacyLayer — Structural Guards Tests (ZK-075)
// ============================================================
// Tests that malformed byte lengths, wrong IC counts, and impossible
// payload shapes are rejected BEFORE deserializing elliptic-curve points
// or touching pairing logic.
// ============================================================

#![cfg(test)]
extern crate std;

use soroban_sdk::{BytesN, Env, Vec};
use crate::crypto::verifier::{
    validate_proof_structure, validate_public_inputs_structure, validate_vk_structure,
    verify_proof,
};
use crate::types::errors::Error;
use crate::types::state::{Proof, PublicInputs, VerifyingKey};

// ──────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────

fn valid_proof(env: &Env) -> Proof {
    Proof {
        a: BytesN::from_array(env, &[1u8; 64]),
        b: BytesN::from_array(env, &[2u8; 128]),
        c: BytesN::from_array(env, &[3u8; 64]),
    }
}

fn valid_vk(env: &Env) -> VerifyingKey {
    let g1 = BytesN::from_array(env, &[0xAAu8; 64]);
    let g2 = BytesN::from_array(env, &[0xBBu8; 128]);
    let mut ic = Vec::new(env);
    for i in 0..9 {
        ic.push_back(BytesN::from_array(env, &[(i + 1) as u8; 64]));
    }

    VerifyingKey {
        alpha_g1: g1.clone(),
        beta_g2: g2.clone(),
        gamma_g2: g2.clone(),
        delta_g2: g2,
        gamma_abc_g1: ic,
        circuit_id: soroban_sdk::String::from_str(env, "withdraw"),
        public_input_count: 8,
        manifest_hash: BytesN::from_array(env, &[0u8; 32]),
    }
}

fn valid_public_inputs(env: &Env) -> PublicInputs {
    PublicInputs {
        pool_id: BytesN::from_array(env, &[1u8; 32]),
        root: BytesN::from_array(env, &[2u8; 32]),
        nullifier_hash: BytesN::from_array(env, &[3u8; 32]),
        recipient: BytesN::from_array(env, &[4u8; 32]),
        amount: BytesN::from_array(env, &[5u8; 32]),
        relayer: BytesN::from_array(env, &[6u8; 32]),
        fee: BytesN::from_array(env, &[7u8; 32]),
        denomination: BytesN::from_array(env, &[8u8; 32]),
    }
}

// ──────────────────────────────────────────────────────────────
// VK Structure Tests (ZK-075)
// ──────────────────────────────────────────────────────────────

#[test]
fn test_vk_ic_vector_too_short_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    // IC vector with only 8 points instead of 9
    let mut short_ic = Vec::new(&env);
    for i in 0..8 {
        short_ic.push_back(BytesN::from_array(&env, &[(i + 1) as u8; 64]));
    }
    bad_vk.gamma_abc_g1 = short_ic;

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkIcVectorWrongLength));
}

#[test]
fn test_vk_ic_vector_too_long_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    // IC vector with 10 points instead of 9
    let mut long_ic = Vec::new(&env);
    for i in 0..10 {
        long_ic.push_back(BytesN::from_array(&env, &[(i + 1) as u8; 64]));
    }
    bad_vk.gamma_abc_g1 = long_ic;

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkIcVectorWrongLength));
}

#[test]
fn test_vk_ic_vector_empty_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    bad_vk.gamma_abc_g1 = Vec::new(&env); // Empty IC vector

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkIcVectorWrongLength));
}

#[test]
fn test_valid_structure_passes_structural_guards() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let vk = valid_vk(&env);
    let pub_inputs = valid_public_inputs(&env);

    assert_eq!(validate_proof_structure(&proof), Ok(()));
    assert_eq!(validate_vk_structure(&vk), Ok(()));
    assert_eq!(validate_public_inputs_structure(&pub_inputs), Ok(()));
}
