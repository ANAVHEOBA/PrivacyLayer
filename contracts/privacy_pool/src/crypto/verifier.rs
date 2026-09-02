// ============================================================
// PrivacyLayer — Groth16 Verifier (BN254 via soroban-sdk v25)
// ============================================================
// Verifies Groth16 ZK proofs using the soroban-sdk v25 bn254 module:
//   - env.crypto().bn254().g1_add()
//   - env.crypto().bn254().g1_mul()
//   - env.crypto().bn254().pairing_check()
//
// The Groth16 pairing-check equation:
//   e(-A, B) * e(alpha, beta) * e(L, gamma) * e(C, delta) == 1
//
// Where L = IC[0] + sum(pub_input[i] * IC[i+1])
//
// Reference: https://eprint.iacr.org/2016/260.pdf (Groth16 paper)
// ============================================================

use soroban_sdk::{
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine, Fr},
    BytesN, Env, Vec,
};

use crate::types::errors::Error;
use crate::types::state::{Proof, PublicInputs, SchemaVersion, VerifyingKey};

// ──────────────────────────────────────────────────────────────
// Structural Guards (ZK-075)
// ──────────────────────────────────────────────────────────────

/// Expected byte lengths for BN254 curve points
const G1_POINT_BYTE_LENGTH: u32 = 64;
const G2_POINT_BYTE_LENGTH: u32 = 128;
const FIELD_ELEMENT_BYTE_LENGTH: u32 = 32;
const EXPECTED_PUBLIC_INPUT_COUNT: u32 = 8;
const EXPECTED_IC_VECTOR_LENGTH: u32 = EXPECTED_PUBLIC_INPUT_COUNT + 1; // IC[0] + 8 inputs

/// Validates proof structure before deserialization (ZK-075).
///
/// Checks byte lengths of all proof components to fail fast on malformed payloads
/// before touching elliptic curve operations.
///
/// # Errors
/// - `MalformedProofA` if proof.a is not 64 bytes
/// - `MalformedProofB` if proof.b is not 128 bytes
/// - `MalformedProofC` if proof.c is not 64 bytes
pub(crate) fn validate_proof_structure(proof: &Proof) -> Result<(), Error> {
    if proof.a.len() != G1_POINT_BYTE_LENGTH {
        return Err(Error::MalformedProofA);
    }

    if proof.b.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::MalformedProofB);
    }

    if proof.c.len() != G1_POINT_BYTE_LENGTH {
        return Err(Error::MalformedProofC);
    }

    Ok(())
}

pub(crate) fn validate_vk_structure(vk: &VerifyingKey) -> Result<(), Error> {
    if vk.alpha_g1.len() != G1_POINT_BYTE_LENGTH {
        return Err(Error::VkAlphaG1WrongLength);
    }

    if vk.beta_g2.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::VkBetaG2WrongLength);
    }

    if vk.gamma_g2.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::VkGammaG2WrongLength);
    }

    if vk.delta_g2.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::VkDeltaG2WrongLength);
    }

    if vk.gamma_abc_g1.len() != EXPECTED_IC_VECTOR_LENGTH {
        return Err(Error::VkIcVectorWrongLength);
    }

    for i in 0..vk.gamma_abc_g1.len() {
        let ic_point = vk.gamma_abc_g1.get(i).ok_or(Error::MalformedVerifyingKey)?;
        if ic_point.len() != G1_POINT_BYTE_LENGTH {
            return Err(Error::VkIcPointWrongLength);
        }
    }

    Ok(())
}

pub(crate) fn validate_public_inputs_structure(pub_inputs: &PublicInputs) -> Result<(), Error> {
    let inputs: [&BytesN<32>; 8] = [
        &pub_inputs.pool_id,
        &pub_inputs.root,
        &pub_inputs.nullifier_hash,
        &pub_inputs.recipient,
        &pub_inputs.amount,
        &pub_inputs.relayer,
        &pub_inputs.fee,
        &pub_inputs.denomination,
    ];

    for input in inputs.iter() {
        if input.len() != FIELD_ELEMENT_BYTE_LENGTH {
            return Err(Error::PublicInputWrongLength);
        }
    }

    Ok(())
}

pub(crate) fn validate_vk_metadata(env: &Env, vk: &VerifyingKey, expected_circuit_id: &str) -> Result<(), Error> {
    if vk.circuit_id != soroban_sdk::String::from_str(env, expected_circuit_id) {
        return Err(Error::CircuitIdMismatch);
    }

    if vk.public_input_count != EXPECTED_PUBLIC_INPUT_COUNT {
        return Err(Error::PublicInputCountMismatch);
    }

    let expected_ic_len = vk.public_input_count + 1;
    if vk.gamma_abc_g1.len() != expected_ic_len {
        return Err(Error::VkIcVectorWrongLength);
    }

    Ok(())
}

fn compute_vk_x(
    env: &Env,
    vk: &VerifyingKey,
    pub_inputs: &PublicInputs,
) -> Result<Bn254G1Affine, Error> {
    if vk.gamma_abc_g1.len() != EXPECTED_IC_VECTOR_LENGTH {
        return Err(Error::VkIcVectorWrongLength);
    }

    if vk.public_input_count != EXPECTED_PUBLIC_INPUT_COUNT {
        return Err(Error::PublicInputCountMismatch);
    }

    let bn254 = env.crypto().bn254();

    let ic0_bytes: BytesN<64> = vk.gamma_abc_g1.get(0).ok_or(Error::MalformedVerifyingKey)?;
    let mut acc = Bn254G1Affine::from_bytes(ic0_bytes);

    let inputs: [&BytesN<32>; 8] = [
        &pub_inputs.pool_id,
        &pub_inputs.root,
        &pub_inputs.nullifier_hash,
        &pub_inputs.recipient,
        &pub_inputs.amount,
        &pub_inputs.relayer,
        &pub_inputs.fee,
        &pub_inputs.denomination,
    ];

    let mut i: u32 = 0;
    while i < 8 {
        let input_bytes = inputs[i as usize];
        let ic_bytes: BytesN<64> = vk.gamma_abc_g1
            .get(i + 1)
            .ok_or(Error::MalformedVerifyingKey)?;
        let ic_point = Bn254G1Affine::from_bytes(ic_bytes);
        let scalar = Fr::from_bytes((*input_bytes).clone());
        let term = bn254.g1_mul(&ic_point, &scalar);
        acc = bn254.g1_add(&acc, &term);
        i += 1;
    }

    Ok(acc)
}

/// Verify a Groth16 proof using Protocol 25 BN254 pairing check.
pub fn verify_proof(
    env: &Env,
    vk: &VerifyingKey,
    proof: &Proof,
    pub_inputs: &PublicInputs,
) -> Result<bool, Error> {
    validate_proof_structure(proof)?;
    validate_vk_structure(vk)?;
    validate_public_inputs_structure(pub_inputs)?;
    validate_vk_metadata(env, vk, "withdraw")?;

    let bn254 = env.crypto().bn254();
    let vk_x = compute_vk_x(env, vk, pub_inputs)?;

    let proof_a = Bn254G1Affine::from_bytes(proof.a.clone());
    let proof_b = Bn254G2Affine::from_bytes(proof.b.clone());
    let proof_c = Bn254G1Affine::from_bytes(proof.c.clone());

    let alpha_g1 = Bn254G1Affine::from_bytes(vk.alpha_g1.clone());
    let beta_g2 = Bn254G2Affine::from_bytes(vk.beta_g2.clone());
    let gamma_g2 = Bn254G2Affine::from_bytes(vk.gamma_g2.clone());
    let delta_g2 = Bn254G2Affine::from_bytes(vk.delta_g2.clone());

    let neg_a = -proof_a;

    let g1_points: Vec<Bn254G1Affine> = Vec::from_array(
        env,
        [neg_a, alpha_g1, vk_x, proof_c],
    );
    let g2_points: Vec<Bn254G2Affine> = Vec::from_array(
        env,
        [proof_b, beta_g2, gamma_g2, delta_g2],
    );

    let result = bn254.pairing_check(g1_points, g2_points);

    Ok(result)
}

// ──────────────────────────────────────────────────────────────
// Schema Version Validation
// ──────────────────────────────────────────────────────────────

/// Validates that the proof schema version matches the expected version.
///
/// This function ensures that proofs are generated with a compatible schema version,
/// preventing runtime errors from schema mismatches at the verifier boundary.
///
/// # Arguments
/// * `proof_schema` - The schema version from the proof
/// * `expected_version_str` - The expected schema version string (e.g., "1.0.0")
///
/// # Returns
/// * `Ok(())` if the schema versions are compatible
/// * `Err(Error::InvalidSchemaVersion)` if the expected version string is malformed
/// * `Err(Error::SchemaVersionMismatch)` if the versions are incompatible
///
/// # Compatibility Rules
/// Schema versions are compatible if:
/// - Major versions match exactly
/// - Minor versions match exactly
/// - Patch versions can differ (backward compatible bug fixes)
#[allow(dead_code)]
pub fn validate_schema_version(
    proof_schema: &SchemaVersion,
    expected_version_str: &str,
) -> Result<(), Error> {
    // Parse the expected version string
    let expected = SchemaVersion::from_string(expected_version_str)
        .map_err(|_| Error::InvalidSchemaVersion)?;

    // Check compatibility using semantic versioning rules
    if !proof_schema.is_compatible_with(&expected) {
        return Err(Error::SchemaVersionMismatch);
    }

    Ok(())
}
