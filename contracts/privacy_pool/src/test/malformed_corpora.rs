#![cfg(test)]

extern crate std;

use soroban_sdk::{Bytes, BytesN, Env};
use std::vec::Vec;
use crate::types::state::{Proof, PublicInputs, VerifyingKey};

pub fn malformed_g1_corpora(env: &Env) -> Vec<Bytes> {
    let mut corpora = Vec::new();

    let too_short = Bytes::from_slice(env, &[0u8; 32]);
    corpora.push(too_short);

    let too_long = Bytes::from_slice(env, &[0u8; 96]);
    corpora.push(too_long);

    let all_zeros = BytesN::<64>::from_array(env, &[0u8; 64]);
    corpora.push(all_zeros.into());

    let garbage = BytesN::<64>::from_array(env, &[0xFF; 64]);
    corpora.push(garbage.into());

    let mut x_overflow = [0u8; 64];
    x_overflow[0..32].copy_from_slice(&[0xFF; 32]); 
    x_overflow[32..64].copy_from_slice(&[0x01; 32]); 
    let overflow = BytesN::<64>::from_array(env, &x_overflow);
    corpora.push(overflow.into());

    let mut bad_y = [0u8; 64];
    bad_y[0..32].copy_from_slice(&[0x01; 32]); 
    bad_y[32..64].copy_from_slice(&[0xFF; 32]); 
    let bad_curve = BytesN::<64>::from_array(env, &bad_y);
    corpora.push(bad_curve.into());

    corpora
}

pub fn malformed_g2_corpora(env: &Env) -> Vec<Bytes> {
    let mut corpora = Vec::new();

    let too_short = Bytes::from_slice(env, &[0u8; 64]);
    corpora.push(too_short);

    let too_long = Bytes::from_slice(env, &[0u8; 192]);
    corpora.push(too_long);

    let all_zeros = BytesN::<128>::from_array(env, &[0u8; 128]);
    corpora.push(all_zeros.into());

    let garbage = BytesN::<128>::from_array(env, &[0xFF; 128]);
    corpora.push(garbage.into());

    let mut partial = [0u8; 128];
    partial[0..32].copy_from_slice(&[0x01; 32]);
    partial[32..64].copy_from_slice(&[0x02; 32]);
    partial[64..128].copy_from_slice(&[0xFF; 64]); 
    let partial_corrupt = BytesN::<128>::from_array(env, &partial);
    corpora.push(partial_corrupt.into());

    corpora
}

pub struct MalformedVKTestCase {
    pub label: &'static str,
    pub vk: VerifyingKey,
    pub expected_error_category: ErrorCategory,
}

#[derive(Debug, PartialEq, Eq)]
pub enum ErrorCategory {
    Structural,
    Cryptographic,
}

pub fn malformed_vk_corpora(env: &Env) -> Vec<MalformedVKTestCase> {
    let mut corpora = Vec::new();

    let alpha_g1 = BytesN::<64>::from_array(env, &[0xAA; 64]);
    let beta_g2 = BytesN::<128>::from_array(env, &[0xBB; 128]);
    let gamma_g2 = BytesN::<128>::from_array(env, &[0xCC; 128]);
    let delta_g2 = BytesN::<128>::from_array(env, &[0xDD; 128]);

    let mut ic_too_few = soroban_sdk::Vec::new(env);
    for i in 0..8 {
        let ic = BytesN::<64>::from_array(env, &[i as u8; 64]);
        ic_too_few.push_back(ic);
    }
    corpora.push(MalformedVKTestCase {
        label: "IC vector too short (8 points instead of 9)",
        vk: VerifyingKey {
            alpha_g1: alpha_g1.clone(),
            beta_g2: beta_g2.clone(),
            gamma_g2: gamma_g2.clone(),
            delta_g2: delta_g2.clone(),
            gamma_abc_g1: ic_too_few,
        },
        expected_error_category: ErrorCategory::Structural,
    });

    let mut ic_too_many = soroban_sdk::Vec::new(env);
    for i in 0..10 {
        let ic = BytesN::<64>::from_array(env, &[i as u8; 64]);
        ic_too_many.push_back(ic);
    }
    corpora.push(MalformedVKTestCase {
        label: "IC vector too long (10 points instead of 9)",
        vk: VerifyingKey {
            alpha_g1: alpha_g1.clone(),
            beta_g2: beta_g2.clone(),
            gamma_g2: gamma_g2.clone(),
            delta_g2: delta_g2.clone(),
            gamma_abc_g1: ic_too_many,
        },
        expected_error_category: ErrorCategory::Structural,
    });

    let ic_empty = soroban_sdk::Vec::new(env);
    corpora.push(MalformedVKTestCase {
        label: "IC vector empty",
        vk: VerifyingKey {
            alpha_g1: alpha_g1.clone(),
            beta_g2: beta_g2.clone(),
            gamma_g2: gamma_g2.clone(),
            delta_g2: delta_g2.clone(),
            gamma_abc_g1: ic_empty,
        },
        expected_error_category: ErrorCategory::Structural,
    });

    corpora.push(MalformedVKTestCase {
        label: "Alpha G1 is point at infinity (all zeros)",
        vk: VerifyingKey {
            alpha_g1: BytesN::<64>::from_array(env, &[0u8; 64]),
            beta_g2: beta_g2.clone(),
            gamma_g2: gamma_g2.clone(),
            delta_g2: delta_g2.clone(),
            gamma_abc_g1: valid_ic_vector(env),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    corpora.push(MalformedVKTestCase {
        label: "Beta G2 is point at infinity (all zeros)",
        vk: VerifyingKey {
            alpha_g1: alpha_g1.clone(),
            beta_g2: BytesN::<128>::from_array(env, &[0u8; 128]),
            gamma_g2: gamma_g2.clone(),
            delta_g2: delta_g2.clone(),
            gamma_abc_g1: valid_ic_vector(env),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    corpora
}

fn valid_ic_vector(env: &Env) -> soroban_sdk::Vec<BytesN<64>> {
    let mut ic = soroban_sdk::Vec::new(env);
    for i in 0..9 {
        let point = BytesN::<64>::from_array(env, &[(i + 1) as u8; 64]);
        ic.push_back(point);
    }
    ic
}

pub struct MalformedProofTestCase {
    pub label: &'static str,
    pub proof: Proof,
    pub expected_error_category: ErrorCategory,
}

pub fn malformed_proof_corpora(env: &Env) -> Vec<MalformedProofTestCase> {
    let mut corpora = Vec::new();

    corpora.push(MalformedProofTestCase {
        label: "All-zero proof (A, B, C at infinity)",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0u8; 64]),
            b: BytesN::<128>::from_array(env, &[0u8; 128]),
            c: BytesN::<64>::from_array(env, &[0u8; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    corpora.push(MalformedProofTestCase {
        label: "Random garbage in proof.A",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0xFF; 64]),
            b: BytesN::<128>::from_array(env, &[0x01; 128]),
            c: BytesN::<64>::from_array(env, &[0x02; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    corpora.push(MalformedProofTestCase {
        label: "Random garbage in proof.B",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0x01; 64]),
            b: BytesN::<128>::from_array(env, &[0xFF; 128]),
            c: BytesN::<64>::from_array(env, &[0x02; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    corpora.push(MalformedProofTestCase {
        label: "Random garbage in proof.C",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0x01; 64]),
            b: BytesN::<128>::from_array(env, &[0x02; 128]),
            c: BytesN::<64>::from_array(env, &[0xFF; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    corpora
}

pub fn valid_public_inputs(env: &Env) -> PublicInputs {
    PublicInputs {
        pool_id: BytesN::<32>::from_array(env, &[0x00; 32]),
        root: BytesN::<32>::from_array(env, &[0x01; 32]),
        nullifier_hash: BytesN::<32>::from_array(env, &[0x02; 32]),
        recipient: BytesN::<32>::from_array(env, &[0x03; 32]),
        amount: BytesN::<32>::from_array(env, &[0x04; 32]),
        relayer: BytesN::<32>::from_array(env, &[0x05; 32]),
        fee: BytesN::<32>::from_array(env, &[0x06; 32]),
        denomination: BytesN::<32>::from_array(env, &[0x07; 32]),
    }
}