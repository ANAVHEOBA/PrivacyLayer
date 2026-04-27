/**
 * Malformed BN254 Point and VK Test Corpora (ZK-114)
 *
 * This module provides test fixtures for verifier hardening against:
 * - Malformed G1/G2 points (bad curve encodings, non-canonical forms)
 * - Invalid verification keys (wrong IC vector lengths, corrupt points)
 * - Structural corruption vs. cryptographic invalidity
 *
 * Usage: Import corpora in Soroban-side and SDK-side validation tests.
 */

#[cfg(test)]
extern crate std;

use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Bytes, BytesN, Env, Vec};
use crate::types::state::{Proof, PublicInputs, VerifyingKey};

// ──────────────────────────────────────────────────────────────
// Malformed G1 Point Corpora
// ──────────────────────────────────────────────────────────────

/// G1 points should be 64 bytes (two 32-byte field elements: x, y)
pub fn malformed_g1_corpora(env: &Env) -> Vec<Bytes> {
    let mut corpora = Vec::new(env);

    // Case 1: Too short (32 bytes instead of 64)
    let too_short = BytesN::<64>::from_array(env, &[0u8; 64]);
    corpora.push_back(too_short.to_bytes());

    // Case 2: Too long (96 bytes)
    let too_long = Bytes::from_array(env, &[0u8; 96]);
    corpora.push_back(too_long);

    // Case 3: All zeros (point at infinity, may be invalid depending on encoding)
    let all_zeros = BytesN::<64>::from_array(env, &[0u8; 64]);
    corpora.push_back(all_zeros.to_bytes());

    // Case 4: Random garbage (not on curve)
    let garbage = BytesN::<64>::from_array(env, &[0xFF; 64]);
    corpora.push_back(garbage.to_bytes());

    // Case 5: X-coordinate out of field range (>= p)
    let mut x_overflow = [0u8; 64];
    x_overflow[0..32].copy_from_slice(&[0xFF; 32]); // x > p
    x_overflow[32..64].copy_from_slice(&[0x01; 32]); // y = 1
    let overflow = BytesN::<64>::from_array(env, &x_overflow);
    corpora.push_back(overflow.to_bytes());

    // Case 6: Y-coordinate doesn't satisfy curve equation y² = x³ + ax + b
    let mut bad_y = [0u8; 64];
    bad_y[0..32].copy_from_slice(&[0x01; 32]); // x = 1
    bad_y[32..64].copy_from_slice(&[0xFF; 32]); // y = invalid
    let bad_curve = BytesN::<64>::from_array(env, &bad_y);
    corpora.push_back(bad_curve.to_bytes());

    corpora
}

// ──────────────────────────────────────────────────────────────
// Malformed G2 Point Corpora
// ──────────────────────────────────────────────────────────────

/// G2 points should be 128 bytes (four 32-byte field elements: x1, x2, y1, y2)
pub fn malformed_g2_corpora(env: &Env) -> Vec<Bytes> {
    let mut corpora = Vec::new(env);

    // Case 1: Too short (64 bytes instead of 128)
    let too_short = BytesN::<128>::from_array(env, &[0u8; 128]);
    corpora.push_back(too_short.to_bytes());

    // Case 2: Too long (192 bytes)
    let too_long = Bytes::from_array(env, &[0u8; 192]);
    corpora.push_back(too_long);

    // Case 3: All zeros
    let all_zeros = BytesN::<128>::from_array(env, &[0u8; 128]);
    corpora.push_back(all_zeros.to_bytes());

    // Case 4: Random garbage
    let garbage = BytesN::<128>::from_array(env, &[0xFF; 128]);
    corpora.push_back(garbage.to_bytes());

    // Case 5: Partial corruption (first 64 bytes valid-looking, rest garbage)
    let mut partial = [0u8; 128];
    partial[0..32].copy_from_slice(&[0x01; 32]);
    partial[32..64].copy_from_slice(&[0x02; 32]);
    partial[64..128].copy_from_slice(&[0xFF; 64]); // corrupt y-coordinates
    let partial_corrupt = BytesN::<128>::from_array(env, &partial);
    corpora.push_back(partial_corrupt.to_bytes());

    corpora
}

// ──────────────────────────────────────────────────────────────
// Malformed Verification Key Corpora
// ──────────────────────────────────────────────────────────────

pub struct MalformedVKTestCase {
    pub label: &'static str,
    pub vk: VerifyingKey,
    pub expected_error_category: ErrorCategory,
}

pub enum ErrorCategory {
    /// Structural error: wrong field lengths, missing IC points
    Structural,
    /// Cryptographic error: valid structure but invalid curve points
    Cryptographic,
}

pub fn malformed_vk_corpora(env: &Env) -> std::vec::Vec<MalformedVKTestCase> {
    let mut corpora = std::vec::Vec::new();

    // Create base valid-looking points
    let alpha_g1 = BytesN::<64>::from_array(env, &[0xAA; 64]);
    let beta_g2 = BytesN::<128>::from_array(env, &[0xBB; 128]);
    let gamma_g2 = BytesN::<128>::from_array(env, &[0xCC; 128]);
    let delta_g2 = BytesN::<128>::from_array(env, &[0xDD; 128]);

    // Case 1: Too few IC points (8 instead of 9)
    let mut ic_too_few = Vec::new(env);
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

    // Case 2: Too many IC points (10 instead of 9)
    let mut ic_too_many = Vec::new(env);
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

    // Case 3: Empty IC vector
    let ic_empty: Vec<BytesN<64>> = Vec::new(env);
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

    // Case 4: All-zero alpha_g1 (invalid point)
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

    // Case 5: All-zero beta_g2 (invalid point)
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

fn valid_ic_vector(env: &Env) -> Vec<BytesN<64>> {
    let mut ic = Vec::new(env);
    for i in 0..9 {
        let point = BytesN::<64>::from_array(env, &[(i + 1) as u8; 64]);
        ic.push_back(point);
    }
    ic
}

// ──────────────────────────────────────────────────────────────
// Malformed Proof Corpora
// ──────────────────────────────────────────────────────────────

pub struct MalformedProofTestCase {
    pub label: &'static str,
    pub proof: Proof,
    pub expected_error_category: ErrorCategory,
}

pub fn malformed_proof_corpora(env: &Env) -> std::vec::Vec<MalformedProofTestCase> {
    let mut corpora = std::vec::Vec::new();

    // Case 1: All-zero proof (point at infinity)
    corpora.push(MalformedProofTestCase {
        label: "All-zero proof (A, B, C at infinity)",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0u8; 64]),
            b: BytesN::<128>::from_array(env, &[0u8; 128]),
            c: BytesN::<64>::from_array(env, &[0u8; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    // Case 2: Random garbage in A
    corpora.push(MalformedProofTestCase {
        label: "Random garbage in proof.A",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0xFF; 64]),
            b: BytesN::<128>::from_array(env, &[0x01; 128]),
            c: BytesN::<64>::from_array(env, &[0x02; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    // Case 3: Random garbage in B
    corpora.push(MalformedProofTestCase {
        label: "Random garbage in proof.B",
        proof: Proof {
            a: BytesN::<64>::from_array(env, &[0x01; 64]),
            b: BytesN::<128>::from_array(env, &[0xFF; 128]),
            c: BytesN::<64>::from_array(env, &[0x02; 64]),
        },
        expected_error_category: ErrorCategory::Cryptographic,
    });

    // Case 4: Random garbage in C
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

// ──────────────────────────────────────────────────────────────
// Helper: Build valid public inputs for testing
// ──────────────────────────────────────────────────────────────

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
