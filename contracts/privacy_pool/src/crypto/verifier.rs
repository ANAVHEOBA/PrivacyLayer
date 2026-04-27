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
/// # Returns
/// - `Ok(true)` if proof is valid
/// - `Ok(false)` if pairing check fails
/// - `Err(...)` on malformed proof/VK
pub fn verify_proof(
    env: &Env,
    vk: &VerifyingKey,
    proof: &Proof,
    pub_inputs: &PublicInputs,
) -> Result<bool, Error> {
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
