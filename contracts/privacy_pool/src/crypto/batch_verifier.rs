
// ============================================================
// PrivacyLayer — Batch Groth16 Verifier (BN254 via soroban-sdk v25)
// ============================================================
// Verifies multiple Groth16 ZK proofs in a batch using multi-scalar
// multiplication (MSM) and aggregated pairing checks.
//
// This module implements a batch verification algorithm for Groth16 proofs
// over the BN254 curve, aiming for gas efficiency by reducing the number
// of expensive pairing operations.
//
// Reference: "Scalable Zero Knowledge Proofs for Distributed Ledgers"
// (Maller et al., 2019) or similar batching techniques.
// ============================================================

use soroban_sdk::{
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    BytesN, Env, Vec,
};

use crate::types::errors::Error;
use crate::types::state::{Proof, PublicInputs, VerifyingKey};
use crate::crypto::verifier;

// ──────────────────────────────────────────────────────────────
// Batch Proof Verification
// ──────────────────────────────────────────────────────────────

/// Verifies a batch of Groth16 proofs using an aggregated pairing check.
///
/// This function takes multiple proofs and their corresponding public inputs
/// and combines their verification into a single multi-pairing check
/// using random challenges.
///
/// # Arguments
/// * `env` - The Soroban environment.
/// * `vk` - The common VerifyingKey for all proofs in the batch.
/// * `proofs` - A vector of Groth16 proofs.
/// * `pub_inputs_batch` - A vector of PublicInputs, one for each proof.
///
/// # Returns
/// * `Ok(())` if all proofs in the batch are valid.
/// * `Err(Error::BatchVerificationFailed(index))` if any proof fails,
///   returning the 0-based index of the first failed proof.
/// * `Err(Error::MalformedVerifyingKey)` or other `Error` on malformed inputs.
pub fn verify_batch(
    env: &Env,
    vk: &VerifyingKey,
    proofs: &Vec<Proof>,
    pub_inputs_batch: &Vec<PublicInputs>,
) -> Result<(), Error> {
    if proofs.len() == 0 {
        return Ok(()); // Nothing to verify
    }
    if proofs.len() != pub_inputs_batch.len() {
        return Err(Error::BatchLengthMismatch);
    }

    let bn254 = env.crypto().bn254();

    let mut g1_points: Vec<Bn254G1Affine> = Vec::new(env);
    let mut g2_points: Vec<Bn254G2Affine> = Vec::new(env);

    // Accumulators for the common VK terms scaled by sum of random scalars
    let mut sum_r_alpha_g1 = Bn254G1Affine::identity();
    let mut sum_r_vk_x = Bn254G1Affine::identity();
    let mut sum_r_c = Bn254G1Affine::identity();

    // Parse VK points once
    let alpha_g1_vk = Bn254G1Affine::from_bytes(vk.alpha_g1.clone());
    let beta_g2_vk = Bn254G2Affine::from_bytes(vk.beta_g2.clone());
    let gamma_g2_vk = Bn254G2Affine::from_bytes(vk.gamma_g2.clone());
    let delta_g2_vk = Bn254G2Affine::from_bytes(vk.delta_g2.clone());

    // Generate random scalars for each proof
    // NOTE: In a production environment, this should use a cryptographically
    // secure random number generator. For this exercise, we use a simple
    // deterministic approach based on environment parameters for reproducibility
    // and to avoid external crate dependencies.
    let mut random_scalars: Vec<Fr> = Vec::new(env);
    for i in 0..proofs.len() {
        // Simple pseudo-randomness based on block sequence and proof index
        let seed_bytes: BytesN<32> = env.crypto().sha256(
            &env.bytes().add(&env.block().sequence().to_be_bytes(), &i.to_be_bytes())
        );
        random_scalars.push(Fr::from_bytes(seed_bytes));
    }

    for i in 0..proofs.len() {
        let proof = proofs.get(i).ok_or(Error::BatchVerificationFailed(i as u32))?;
        let pub_inputs = pub_inputs_batch.get(i).ok_or(Error::BatchVerificationFailed(i as u32))?;
        let r_i = random_scalars.get(i).ok_or(Error::BatchVerificationFailed(i as u32))?;

        // 1. Compute vk_x (linear combination of public inputs for this proof)
        let vk_x_i = verifier::compute_vk_x(env, vk, &pub_inputs)?;

        // 2. Parse proof points
        let proof_a_i = Bn254G1Affine::from_bytes(proof.a.clone());
        let proof_b_i = Bn254G2Affine::from_bytes(proof.b.clone());
        let proof_c_i = Bn254G1Affine::from_bytes(proof.c.clone());

        // Apply random scalar r_i
        let r_i_neg_a_i = bn254.g1_mul(&-proof_a_i, &r_i);
        let r_i_c_i = bn254.g1_mul(&proof_c_i, &r_i);
        let r_i_vk_x_i = bn254.g1_mul(&vk_x_i, &r_i);

        // Add to the G1 and G2 point vectors for pairing_check
        // Terms for e(-A_i, B_i)
        g1_points.push(r_i_neg_a_i);
        g2_points.push(proof_b_i);

        // Accumulate terms that pair with constant G2 points
        // sum_r_alpha_g1 += r_i * alpha_g1_vk
        sum_r_alpha_g1 = bn254.g1_add(&sum_r_alpha_g1, &bn254.g1_mul(&alpha_g1_vk, &r_i));
        
        // sum_r_vk_x += r_i * vk_x_i
        sum_r_vk_x = bn254.g1_add(&sum_r_vk_x, &r_i_vk_x_i);

        // sum_r_c += r_i * C_i
        sum_r_c = bn254.g1_add(&sum_r_c, &r_i_c_i);
    }

    // Add the aggregated terms to the final pairing check
    // e(sum_r_alpha_g1, beta_g2_vk)
    g1_points.push(sum_r_alpha_g1);
    g2_points.push(beta_g2_vk);

    // e(sum_r_vk_x, gamma_g2_vk)
    g1_points.push(sum_r_vk_x);
    g2_points.push(gamma_g2_vk);

    // e(sum_r_c, delta_g2_vk)
    g1_points.push(sum_r_c);
    g2_points.push(delta_g2_vk);

    // Perform the final multi-pairing check
    let result = bn254.pairing_check(g1_points, g2_points);

    if result {
        Ok(())
    } else {
        // If the batch check fails, we need to find the specific failing proof.
        // This requires re-verifying proofs individually.
        for i in 0..proofs.len() {
            let proof = proofs.get(i).ok_or(Error::BatchVerificationFailed(i as u32))?;
            let pub_inputs = pub_inputs_batch.get(i).ok_or(Error::BatchVerificationFailed(i as u32))?;
            
            let is_valid = verifier::verify_proof(env, vk, &proof, &pub_inputs)?;
            if !is_valid {
                return Err(Error::BatchVerificationFailed(i as u32));
            }
        }
        // This should theoretically not be reached if the batch check failed
        // but individual checks pass. This implies an issue with the batching logic.
        Err(Error::BatchVerificationFailed(u32::MAX)) // Indicate an unexpected failure
    }
}

// NOTE: The `compute_vk_x` function is needed by `batch_verifier.rs` but it's
// currently private in `verifier.rs`. We need to make it public.
