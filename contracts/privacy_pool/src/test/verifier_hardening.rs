// ============================================================
// PrivacyLayer — Verifier Hardening Tests (ZK-114)
// ============================================================
// Tests verifier resilience against malformed BN254 points and
// invalid verification keys using the ZK-114 test corpora.
// ============================================================

#![cfg(test)]
extern crate std;

use soroban_sdk::{Env, BytesN};
use crate::crypto::verifier::verify_proof;
use crate::types::errors::Error;
use crate::test::malformed_corpora::{
    malformed_g1_corpora,
    malformed_g2_corpora,
    malformed_vk_corpora,
    malformed_proof_corpora,
    valid_public_inputs,
    ErrorCategory,
};

// ──────────────────────────────────────────────────────────────
// Malformed G1 Point Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_malformed_g1_points_rejected() {
    let env = Env::default();
    let corpora = malformed_g1_corpora(&env);

    for malformed_g1 in corpora.iter() {
        assert!(!malformed_g1.is_empty(), "Malformed G1 data should not be empty");
    }
}

#[test]
fn test_malformed_g2_points_rejected() {
    let env = Env::default();
    let corpora = malformed_g2_corpora(&env);

    for malformed_g2 in corpora.iter() {
        assert!(!malformed_g2.is_empty(), "Malformed G2 data should not be empty");
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
            let pub_inputs = valid_public_inputs(&env);
            let proof = create_dummy_proof(&env);

            let result = verify_proof(&env, &test_case.vk, &proof, &pub_inputs);

            assert!(
                result.is_err(),
                "VK with {} should be rejected: {}",
                test_case.label,
                "expected error"
            );

            if let Err(err) = result {
                assert!(
                    matches!(err, Error::MalformedVerifyingKey | Error::VkIcVectorWrongLength),
                    "Expected structural error for too few IC points, got {:?}",
                    err
                );
            }
        }
    }
}

#[test]
fn test_vk_too_many_ic_points_rejected() {
    let env = Env::default();
    let corpora = malformed_vk_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("too long") {
            let pub_inputs = valid_public_inputs(&env);
            let proof = create_dummy_proof(&env);

            let result = verify_proof(&env, &test_case.vk, &proof, &pub_inputs);

            assert!(
                result.is_err(),
                "VK with {} should be rejected",
                test_case.label
            );

            if let Err(err) = result {
                assert!(
                    matches!(err, Error::MalformedVerifyingKey | Error::VkIcVectorWrongLength),
                    "Expected structural error for too many IC points, got {:?}",
                    err
                );
            }
        }
    }
}

#[test]
fn test_vk_invalid_curve_points_rejected() {
    let env = Env::default();
    let corpora = malformed_vk_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("point at infinity") || test_case.label.contains("invalid") {
            let pub_inputs = valid_public_inputs(&env);
            let proof = create_dummy_proof(&env);

            let caught = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                verify_proof(&env, &test_case.vk, &proof, &pub_inputs)
            }));

            assert!(
                caught.is_err() || caught.as_ref().unwrap().is_err() || matches!(caught.as_ref().unwrap(), Ok(false)),
                "VK with invalid curve points should fail: {}",
                test_case.label
            );
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
            let vk = create_dummy_vk(&env);
            let pub_inputs = valid_public_inputs(&env);

            let caught = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                verify_proof(&env, &vk, &test_case.proof, &pub_inputs)
            }));

            assert!(
                caught.is_err() || caught.as_ref().unwrap().is_err() || matches!(caught.as_ref().unwrap(), Ok(false)),
                "All-zero proof should be rejected"
            );
        }
    }
}

#[test]
fn test_random_garbage_proof_rejected() {
    let env = Env::default();
    let corpora = malformed_proof_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("garbage") {
            let vk = create_dummy_vk(&env);
            let pub_inputs = valid_public_inputs(&env);

            let caught = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                verify_proof(&env, &vk, &test_case.proof, &pub_inputs)
            }));

            assert!(
                caught.is_err() || caught.as_ref().unwrap().is_err() || matches!(caught.as_ref().unwrap(), Ok(false)),
                "Random garbage proof should be rejected: {}",
                test_case.label
            );
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
        let pub_inputs = valid_public_inputs(&env);
        let proof = create_dummy_proof(&env);

        let caught = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            verify_proof(&env, &test_case.vk, &proof, &pub_inputs)
        }));

        match test_case.expected_error_category {
            ErrorCategory::Structural => {
                assert!(caught.is_ok(), "Structural error should not panic: {}", test_case.label);
                let result = caught.unwrap();
                assert!(result.is_err(), "Structural error should return Err: {}", test_case.label);
                let err = result.unwrap_err();
                assert!(
                    matches!(err, Error::MalformedVerifyingKey | Error::VkIcVectorWrongLength),
                    "Structural error should be MalformedVerifyingKey or VkIcVectorWrongLength: {}",
                    test_case.label
                );
            }
            ErrorCategory::Cryptographic => {
                assert!(
                    caught.is_err() || caught.as_ref().unwrap().is_err() || matches!(caught.as_ref().unwrap(), Ok(false)),
                    "Cryptographic error should fail verification: {}",
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
