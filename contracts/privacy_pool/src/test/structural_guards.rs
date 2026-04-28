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
use crate::crypto::verifier::verify_proof;
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
// Proof Structure Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_proof_a_wrong_length_rejected() {
    let env = Env::default();
    let vk = valid_vk(&env);
    let pub_inputs = valid_public_inputs(&env);

    // Proof with wrong A length (32 bytes instead of 64)
    let bad_proof = Proof {
        a: BytesN::from_array(&env, &[1u8; 32]), // Wrong: should be 64
        b: BytesN::from_array(&env, &[2u8; 128]),
        c: BytesN::from_array(&env, &[3u8; 64]),
    };

    let result = verify_proof(&env, &vk, &bad_proof, &pub_inputs);
    assert_eq!(result, Err(Error::MalformedProofA));
}

#[test]
fn test_proof_b_wrong_length_rejected() {
    let env = Env::default();
    let vk = valid_vk(&env);
    let pub_inputs = valid_public_inputs(&env);

    // Proof with wrong B length (64 bytes instead of 128)
    let bad_proof = Proof {
        a: BytesN::from_array(&env, &[1u8; 64]),
        b: BytesN::from_array(&env, &[2u8; 64]), // Wrong: should be 128
        c: BytesN::from_array(&env, &[3u8; 64]),
    };

    let result = verify_proof(&env, &vk, &bad_proof, &pub_inputs);
    assert_eq!(result, Err(Error::MalformedProofB));
}

#[test]
fn test_proof_c_wrong_length_rejected() {
    let env = Env::default();
    let vk = valid_vk(&env);
    let pub_inputs = valid_public_inputs(&env);

    // Proof with wrong C length (32 bytes instead of 64)
    let bad_proof = Proof {
        a: BytesN::from_array(&env, &[1u8; 64]),
        b: BytesN::from_array(&env, &[2u8; 128]),
        c: BytesN::from_array(&env, &[3u8; 32]), // Wrong: should be 64
    };

    let result = verify_proof(&env, &vk, &bad_proof, &pub_inputs);
    assert_eq!(result, Err(Error::MalformedProofC));
}

// ──────────────────────────────────────────────────────────────
// VK Structure Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_vk_alpha_g1_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    bad_vk.alpha_g1 = BytesN::from_array(&env, &[0xAAu8; 32]); // Wrong: should be 64

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkAlphaG1WrongLength));
}

#[test]
fn test_vk_beta_g2_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    bad_vk.beta_g2 = BytesN::from_array(&env, &[0xBBu8; 64]); // Wrong: should be 128

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkBetaG2WrongLength));
}

#[test]
fn test_vk_gamma_g2_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    bad_vk.gamma_g2 = BytesN::from_array(&env, &[0xCCu8; 64]); // Wrong: should be 128

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkGammaG2WrongLength));
}

#[test]
fn test_vk_delta_g2_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    bad_vk.delta_g2 = BytesN::from_array(&env, &[0xDDu8; 64]); // Wrong: should be 128

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkDeltaG2WrongLength));
}

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
fn test_vk_ic_point_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let pub_inputs = valid_public_inputs(&env);

    let mut bad_vk = valid_vk(&env);
    // IC vector with one point having wrong length
    let mut bad_ic = Vec::new(&env);
    for i in 0..8 {
        bad_ic.push_back(BytesN::from_array(&env, &[(i + 1) as u8; 64]));
    }
    // Last point has wrong length (32 instead of 64)
    bad_ic.push_back(BytesN::from_array(&env, &[9u8; 32]));
    bad_vk.gamma_abc_g1 = bad_ic;

    let result = verify_proof(&env, &bad_vk, &proof, &pub_inputs);
    assert_eq!(result, Err(Error::VkIcPointWrongLength));
}

// ──────────────────────────────────────────────────────────────
// Public Inputs Structure Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_public_input_pool_id_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let vk = valid_vk(&env);

    let mut bad_inputs = valid_public_inputs(&env);
    bad_inputs.pool_id = BytesN::from_array(&env, &[1u8; 16]); // Wrong: should be 32

    let result = verify_proof(&env, &vk, &proof, &bad_inputs);
    assert_eq!(result, Err(Error::PublicInputWrongLength));
}

#[test]
fn test_public_input_root_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let vk = valid_vk(&env);

    let mut bad_inputs = valid_public_inputs(&env);
    bad_inputs.root = BytesN::from_array(&env, &[2u8; 64]); // Wrong: should be 32

    let result = verify_proof(&env, &vk, &proof, &bad_inputs);
    assert_eq!(result, Err(Error::PublicInputWrongLength));
}

#[test]
fn test_public_input_nullifier_hash_wrong_length_rejected() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let vk = valid_vk(&env);

    let mut bad_inputs = valid_public_inputs(&env);
    bad_inputs.nullifier_hash = BytesN::from_array(&env, &[3u8; 16]); // Wrong: should be 32

    let result = verify_proof(&env, &vk, &proof, &bad_inputs);
    assert_eq!(result, Err(Error::PublicInputWrongLength));
}

// ──────────────────────────────────────────────────────────────
// Combined Malformed Payload Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_multiple_structural_errors_first_one_reported() {
    let env = Env::default();

    // Create a payload with multiple structural errors
    let bad_proof = Proof {
        a: BytesN::from_array(&env, &[1u8; 32]), // Wrong length
        b: BytesN::from_array(&env, &[2u8; 64]), // Wrong length
        c: BytesN::from_array(&env, &[3u8; 32]), // Wrong length
    };

    let mut bad_vk = valid_vk(&env);
    bad_vk.alpha_g1 = BytesN::from_array(&env, &[0xAAu8; 32]); // Wrong length

    let bad_inputs = valid_public_inputs(&env);

    // Should fail on first structural check (proof.a)
    let result = verify_proof(&env, &bad_vk, &bad_proof, &bad_inputs);
    assert_eq!(result, Err(Error::MalformedProofA));
}

#[test]
fn test_structural_guards_run_before_cryptographic_operations() {
    let env = Env::default();
    let vk = valid_vk(&env);
    let pub_inputs = valid_public_inputs(&env);

    // Proof with wrong structure (should fail structural check)
    // Even if the bytes were valid curve points, we should fail before deserialization
    let bad_proof = Proof {
        a: BytesN::from_array(&env, &[0xFFu8; 32]), // Wrong length
        b: BytesN::from_array(&env, &[0xFFu8; 128]),
        c: BytesN::from_array(&env, &[0xFFu8; 64]),
    };

    let result = verify_proof(&env, &vk, &bad_proof, &pub_inputs);
    // Should fail with structural error, not cryptographic error
    assert_eq!(result, Err(Error::MalformedProofA));
}

#[test]
fn test_valid_structure_passes_structural_guards() {
    let env = Env::default();
    let proof = valid_proof(&env);
    let vk = valid_vk(&env);
    let pub_inputs = valid_public_inputs(&env);

    // This will fail at pairing check (invalid points), but should pass structural guards
    let result = verify_proof(&env, &vk, &proof, &pub_inputs);
    
    // Should NOT be a structural error
    assert_ne!(result, Err(Error::MalformedProofA));
    assert_ne!(result, Err(Error::MalformedProofB));
    assert_ne!(result, Err(Error::MalformedProofC));
    assert_ne!(result, Err(Error::VkAlphaG1WrongLength));
    assert_ne!(result, Err(Error::VkBetaG2WrongLength));
    assert_ne!(result, Err(Error::VkGammaG2WrongLength));
    assert_ne!(result, Err(Error::VkDeltaG2WrongLength));
    assert_ne!(result, Err(Error::VkIcVectorWrongLength));
    assert_ne!(result, Err(Error::VkIcPointWrongLength));
    assert_ne!(result, Err(Error::PublicInputWrongLength));
}
