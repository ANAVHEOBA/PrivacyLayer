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
use crate::types::state::{Proof, PublicInputs, VerifyingKey};

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
fn validate_proof_structure(proof: &Proof) -> Result<(), Error> {
    // Validate G1 point A (64 bytes)
    if proof.a.len() != G1_POINT_BYTE_LENGTH {
        return Err(Error::MalformedProofA);
    }

    // Validate G2 point B (128 bytes)
    if proof.b.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::MalformedProofB);
    }

    // Validate G1 point C (64 bytes)
    if proof.c.len() != G1_POINT_BYTE_LENGTH {
        return Err(Error::MalformedProofC);
    }

    Ok(())
}

/// Validates verifying key structure before deserialization (ZK-075).
///
/// Checks byte lengths and vector counts to fail fast on malformed VKs
/// before touching elliptic curve operations.
///
/// # Errors
/// - `VkAlphaG1WrongLength` if alpha_g1 is not 64 bytes
/// - `VkBetaG2WrongLength` if beta_g2 is not 128 bytes
/// - `VkGammaG2WrongLength` if gamma_g2 is not 128 bytes
/// - `VkDeltaG2WrongLength` if delta_g2 is not 128 bytes
/// - `VkIcVectorWrongLength` if gamma_abc_g1 doesn't have exactly 9 elements
/// - `VkIcPointWrongLength` if any IC point is not 64 bytes
fn validate_vk_structure(vk: &VerifyingKey) -> Result<(), Error> {
    // Validate G1 point alpha (64 bytes)
    if vk.alpha_g1.len() != G1_POINT_BYTE_LENGTH {
        return Err(Error::VkAlphaG1WrongLength);
    }

    // Validate G2 point beta (128 bytes)
    if vk.beta_g2.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::VkBetaG2WrongLength);
    }

    // Validate G2 point gamma (128 bytes)
    if vk.gamma_g2.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::VkGammaG2WrongLength);
    }

    // Validate G2 point delta (128 bytes)
    if vk.delta_g2.len() != G2_POINT_BYTE_LENGTH {
        return Err(Error::VkDeltaG2WrongLength);
    }

    // Validate IC vector length (must be exactly 9: IC[0] + 8 public inputs)
    if vk.gamma_abc_g1.len() != EXPECTED_IC_VECTOR_LENGTH {
        return Err(Error::VkIcVectorWrongLength);
    }

    // Validate each IC point is 64 bytes
    for i in 0..vk.gamma_abc_g1.len() {
        let ic_point = vk.gamma_abc_g1.get(i).ok_or(Error::MalformedVerifyingKey)?;
        if ic_point.len() != G1_POINT_BYTE_LENGTH {
            return Err(Error::VkIcPointWrongLength);
        }
    }

    Ok(())
}

/// Validates public inputs structure before deserialization (ZK-075).
///
/// Checks that all public input fields are exactly 32 bytes (field elements).
///
/// # Errors
/// - `PublicInputWrongLength` if any public input is not 32 bytes
fn validate_public_inputs_structure(pub_inputs: &PublicInputs) -> Result<(), Error> {
    // All public inputs must be 32-byte field elements
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

// ──────────────────────────────────────────────────────────────
// Public Input Linear Combination
// ──────────────────────────────────────────────────────────────

/// Compute vk_x = IC[0] + sum(pub_input[i] * IC[i+1])
///
/// This is the linear combination of public inputs with the
/// verifying key IC points (Groth16 "vk_x" calculation).
fn compute_vk_x(
    env: &Env,
    vk: &VerifyingKey,
    pub_inputs: &PublicInputs,
) -> Result<Bn254G1Affine, Error> {
    // The VK must have exactly 9 IC points: IC[0] + 8 public inputs
    // [pool_id, root, nullifier_hash, recipient, amount, relayer, fee, denomination]
    if vk.gamma_abc_g1.len() != 9 {
        return Err(Error::MalformedVerifyingKey);
    }

    let bn254 = env.crypto().bn254();

    // Start with IC[0]
    let ic0_bytes: BytesN<64> = vk.gamma_abc_g1.get(0).ok_or(Error::MalformedVerifyingKey)?;
    let mut acc = Bn254G1Affine::from_bytes(ic0_bytes);

    // Public inputs as 32-byte field elements → Fr scalars
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

    for (i, input_bytes) in inputs.iter().enumerate() {
        let ic_bytes: BytesN<64> = vk.gamma_abc_g1
            .get((i + 1) as u32)
            .ok_or(Error::MalformedVerifyingKey)?;
        let ic_point = Bn254G1Affine::from_bytes(ic_bytes);

        // Convert 32-byte public input to Fr scalar
        let scalar = Fr::from_bytes((*input_bytes).clone());

        // acc += input[i] * IC[i+1]
        let term = bn254.g1_mul(&ic_point, &scalar);
        acc = bn254.g1_add(&acc, &term);
    }

    Ok(acc)
}

// ──────────────────────────────────────────────────────────────
// Groth16 Proof Verification
// ──────────────────────────────────────────────────────────────

/// Verify a Groth16 proof using Protocol 25 BN254 pairing check.
///
/// Performs: e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
///
/// ZK-075: Validates structural invariants (byte lengths, vector counts) before
/// deserialization to fail fast on malformed payloads.
///
/// # Returns
/// - `Ok(true)` if proof is valid
/// - `Ok(false)` if pairing check fails
/// - `Err(...)` on malformed proof/VK/public inputs (structural errors)
pub fn verify_proof(
    env: &Env,
    vk: &VerifyingKey,
    proof: &Proof,
    pub_inputs: &PublicInputs,
) -> Result<bool, Error> {
    // Step 0: Structural validation before deserialization (ZK-075)
    validate_proof_structure(proof)?;
    validate_vk_structure(vk)?;
    validate_public_inputs_structure(pub_inputs)?;
    let bn254 = env.crypto().bn254();

    // Step 1: Compute vk_x (linear combination of public inputs)
    let vk_x = compute_vk_x(env, vk, pub_inputs)?;

    // Step 2: Build G1 and G2 point vectors for multi-pairing check
    //
    // Groth16 check: e(A, B) == e(alpha, beta) * e(vk_x, gamma) * e(C, delta)
    // Rearranged:    e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
    //
    // pairing_check takes Vec<G1> and Vec<G2>, checks product of pairings == 1

    // Parse proof points
    let proof_a = Bn254G1Affine::from_bytes(proof.a.clone());
    let proof_b = Bn254G2Affine::from_bytes(proof.b.clone());
    let proof_c = Bn254G1Affine::from_bytes(proof.c.clone());

    // Parse VK points
    let alpha_g1 = Bn254G1Affine::from_bytes(vk.alpha_g1.clone());
    let beta_g2 = Bn254G2Affine::from_bytes(vk.beta_g2.clone());
    let gamma_g2 = Bn254G2Affine::from_bytes(vk.gamma_g2.clone());
    let delta_g2 = Bn254G2Affine::from_bytes(vk.delta_g2.clone());

    // Negate A (flip to other side of equation)
    let neg_a = -proof_a;

    // Build pairing input vectors
    // G1: [-A,       alpha,   vk_x,    C      ]
    // G2: [ B,       beta,    gamma,   delta   ]
    let g1_points: Vec<Bn254G1Affine> = Vec::from_array(
        env,
        [neg_a, alpha_g1, vk_x, proof_c],
    );
    let g2_points: Vec<Bn254G2Affine> = Vec::from_array(
        env,
        [proof_b, beta_g2, gamma_g2, delta_g2],
    );

    // Step 3: Multi-pairing check
    // Returns true if: e(g1[0],g2[0]) * e(g1[1],g2[1]) * ... == 1 in GT
    let result = bn254.pairing_check(g1_points, g2_points);

    Ok(result)
}

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verifier_schema_parity() {
        // ZK-087: Ensure the contract verifier's expectations match the 
        // authoritative machine-readable schema artifact.
        let schema_json = include_str!("../../../../artifacts/zk/v1/verifier_schema.json");
        
        // Count public input names in schema
        let input_count = schema_json.matches("\"name\":").count();
        
        // Verifier expects IC[0] + all public inputs
        let expected_ic_total = input_count + 1;
        
        // This pins the verifier to the schema
        assert_eq!(expected_ic_total, 9, "Schema must define exactly 8 public inputs (plus IC[0])");
    }

    #[test]
    fn test_public_input_order() {
        let schema_json = include_str!("../../../../artifacts/zk/v1/verifier_schema.json");
        
        // Names must appear in this order in the JSON
        let expected_order = [
            "pool_id",
            "root",
            "nullifier_hash",
            "recipient",
            "amount",
            "relayer",
            "fee",
            "denomination"
        ];
        
        let mut last_pos = 0;
        for name in expected_order {
            let search_str = concat!("\"name\": \"", stringify!(name), "\"");
            let pos = schema_json.find(search_str)
                .expect(concat!("Field ", stringify!(name), " missing from schema"));
            assert!(pos > last_pos, concat!("Field ", stringify!(name), " out of order in schema"));
            last_pos = pos;
        }
    }
}
