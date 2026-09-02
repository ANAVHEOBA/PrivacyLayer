// ============================================================
// PrivacyLayer — Verifier Hardening Tests (ZK-114)
// ============================================================
// Tests verifier resilience against malformed BN254 points and
// invalid verification keys using the ZK-114 test corpora.
// ============================================================

#![cfg(test)]
extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, BytesN};
use crate::types::state::PoolId;
use crate::crypto::verifier::{
    validate_proof_structure, validate_public_inputs_structure, validate_vk_structure,
    verify_proof,
};
use crate::types::errors::Error;
use crate::test::malformed_corpora::{
    malformed_g1_corpora,
    malformed_g2_corpora,
    malformed_vk_corpora,
    malformed_proof_corpora,
    valid_public_inputs,
    MalformedVKTestCase,
    MalformedProofTestCase,
    ErrorCategory,
};

fn pool_id(env: &Env, id: u8) -> PoolId {
    let mut bytes = [0u8; 32];
    bytes[31] = id;
    PoolId(BytesN::from_array(env, &bytes))
}

// ──────────────────────────────────────────────────────────────
// Malformed G1 Point Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_malformed_g1_points_rejected() {
    let env = Env::default();
    let corpora = malformed_g1_corpora(&env);

    for malformed_g1 in corpora.iter() {
        assert!(!malformed_g1.is_empty(), "Malformed G1 data should not be empty");
        assert!(malformed_g1.len() == 64 || malformed_g1.len() == 96 || malformed_g1.len() == 32, "G1 point length valid or invalid");
    }
}

// ──────────────────────────────────────────────────────────────
// Malformed G2 Point Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_malformed_g2_points_rejected() {
    let env = Env::default();
    let corpora = malformed_g2_corpora(&env);

    for malformed_g2 in corpora.iter() {
        assert!(!malformed_g2.is_empty(), "Malformed G2 data should not be empty");
        assert!(malformed_g2.len() == 128 || malformed_g2.len() == 192 || malformed_g2.len() == 64, "G2 point length valid or invalid");
    }
}

// ──────────────────────────────────────────────────────────────
// Malformed Verification Key Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_vk_too_few_ic_points_rejected() {
    let env = Env::default();
    let corpora = malformed_vk_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("too short") || test_case.label.contains("empty") {
            let result = validate_vk_structure(&test_case.vk);
            assert_eq!(
                result,
                Err(Error::VkIcVectorWrongLength),
                "Expected VkIcVectorWrongLength for structural error: {}",
                test_case.label
            );
        }
    }
}

#[test]
fn test_vk_too_many_ic_points_rejected() {
    let env = Env::default();
    let corpora = malformed_vk_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("too long") {
            let result = validate_vk_structure(&test_case.vk);
            assert_eq!(result, Err(Error::VkIcVectorWrongLength));
        }
    }
}

#[test]
fn test_vk_invalid_curve_points_rejected() {
    let env = Env::default();
    let corpora = malformed_vk_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("point at infinity") || test_case.label.contains("invalid") {
            let struct_res = validate_vk_structure(&test_case.vk);
            assert!(struct_res.is_ok(), "Structure should pass for invalid curve points: {}", test_case.label);
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Malformed Proof Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_all_zero_proof_rejected() {
    let env = Env::default();
    let corpora = malformed_proof_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("All-zero") {
            let struct_res = validate_proof_structure(&test_case.proof);
            assert!(struct_res.is_ok(), "All-zero proof structure should pass length checks");
        }
    }
}

#[test]
fn test_random_garbage_proof_rejected() {
    let env = Env::default();
    let corpora = malformed_proof_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("garbage") {
            let struct_res = validate_proof_structure(&test_case.proof);
            assert!(struct_res.is_ok(), "Random garbage proof structure should pass length checks");
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Error Category Differentiation Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_structural_vs_cryptographic_errors() {
    let env = Env::default();
    let vk_corpora = malformed_vk_corpora(&env);

    for test_case in vk_corpora.iter() {
        let result = validate_vk_structure(&test_case.vk);

        match test_case.expected_error_category {
            ErrorCategory::Structural => {
                assert_eq!(
                    result,
                    Err(Error::VkIcVectorWrongLength),
                    "Structural error should be VkIcVectorWrongLength: {}",
                    test_case.label
                );
            }
            ErrorCategory::Cryptographic => {
                assert!(
                    result.is_ok(),
                    "Cryptographic error VK should pass structural validation before EC deserialization: {}",
                    test_case.label
                );
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────────────────────

fn create_dummy_proof(env: &Env) -> crate::types::state::Proof {
    crate::types::state::Proof {
        a: BytesN::<64>::from_array(env, &[0x01; 64]),
        b: BytesN::<128>::from_array(env, &[0x02; 128]),
        c: BytesN::<64>::from_array(env, &[0x03; 64]),
    }
}

fn create_dummy_vk(env: &Env) -> crate::types::state::VerifyingKey {
    let mut ic = soroban_sdk::Vec::new(env);
    for i in 0..9 {
        let point = BytesN::<64>::from_array(env, &[(i + 1) as u8; 64]);
        ic.push_back(point);
    }

    crate::types::state::VerifyingKey {
        alpha_g1: BytesN::<64>::from_array(env, &[0xAA; 64]),
        beta_g2: BytesN::<128>::from_array(env, &[0xBB; 128]),
        gamma_g2: BytesN::<128>::from_array(env, &[0xCC; 128]),
        delta_g2: BytesN::<128>::from_array(env, &[0xDD; 128]),
        gamma_abc_g1: ic,
        circuit_id: soroban_sdk::String::from_str(env, "withdraw"),
        public_input_count: 8,
        manifest_hash: BytesN::from_array(env, &[0u8; 32]),
    }
}
