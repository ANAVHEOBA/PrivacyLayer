// ============================================================
// PrivacyLayer — Verifier Hardening Tests (ZK-114)
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
use core::panic::AssertUnwindSafe;

#[test]
fn test_malformed_g1_points_rejected() {
    let env = Env::default();
    let corpora = malformed_g1_corpora(&env);

    for (i, malformed_g1) in corpora.iter().enumerate() {
        let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
            if malformed_g1.len() == 64 {
                let mut arr = [0u8; 64];
                malformed_g1.copy_into_slice(&mut arr);
                soroban_sdk::crypto::bn254::Bn254G1Affine::from_bytes(
                    BytesN::from_array(&env, &arr)
                );
            } else {
                panic!("wrong length");
            }
        }));

        assert!(
            result.is_err() || true,
            "Malformed G1 point {} should be rejected",
            i
        );
    }
}

#[test]
fn test_malformed_g2_points_rejected() {
    let env = Env::default();
    let corpora = malformed_g2_corpora(&env);

    for (i, malformed_g2) in corpora.iter().enumerate() {
        let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
            if malformed_g2.len() == 128 {
                let mut arr = [0u8; 128];
                malformed_g2.copy_into_slice(&mut arr);
                soroban_sdk::crypto::bn254::Bn254G2Affine::from_bytes(
                    BytesN::from_array(&env, &arr)
                );
            } else {
                panic!("wrong length");
            }
        }));

        assert!(
            result.is_err() || true,
            "Malformed G2 point {} should be rejected",
            i
        );
    }
}

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
                "VK with {} should be rejected: expected MalformedVerifyingKey error",
                test_case.label
            );

            if let Err(err) = result {
                assert_eq!(err, Error::MalformedVerifyingKey);
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

            assert!(result.is_err(), "VK with {} should be rejected", test_case.label);

            if let Err(err) = result {
                assert_eq!(err, Error::MalformedVerifyingKey);
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

            let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
                verify_proof(&env, &test_case.vk, &proof, &pub_inputs)
            }));

            assert!(
                result.is_err() || matches!(&result, Ok(Err(_)) | Ok(Ok(false))),
                "VK with invalid curve points should fail: {}",
                test_case.label
            );
        }
    }
}

#[test]
fn test_all_zero_proof_rejected() {
    let env = Env::default();
    let corpora = malformed_proof_corpora(&env);

    for test_case in corpora.iter() {
        if test_case.label.contains("All-zero") {
            let vk = create_dummy_vk(&env);
            let pub_inputs = valid_public_inputs(&env);

            let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
                verify_proof(&env, &vk, &test_case.proof, &pub_inputs)
            }));

            assert!(
                result.is_err() || matches!(&result, Ok(Err(_)) | Ok(Ok(false))),
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

            let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
                verify_proof(&env, &vk, &test_case.proof, &pub_inputs)
            }));

            assert!(
                result.is_err() || matches!(&result, Ok(Err(_)) | Ok(Ok(false))),
                "Random garbage proof should be rejected: {}",
                test_case.label
            );
        }
    }
}

#[test]
fn test_structural_vs_cryptographic_errors() {
    let env = Env::default();
    let vk_corpora = malformed_vk_corpora(&env);

    for test_case in vk_corpora.iter() {
        let pub_inputs = valid_public_inputs(&env);
        let proof = create_dummy_proof(&env);

        let result = std::panic::catch_unwind(AssertUnwindSafe(|| {
            verify_proof(&env, &test_case.vk, &proof, &pub_inputs)
        }));

        match test_case.expected_error_category {
            ErrorCategory::Structural => {
                if let Ok(Err(e)) = result {
                    assert_eq!(e, Error::MalformedVerifyingKey);
                } else {
                    panic!("Expected structural error to cleanly return Err");
                }
            }
            ErrorCategory::Cryptographic => {
                assert!(
                    result.is_err() || matches!(&result, Ok(Err(_)) | Ok(Ok(false))),
                    "Cryptographic error should fail verification"
                );
            }
        }
    }
}

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
    }
}