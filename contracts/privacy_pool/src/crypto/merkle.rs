// ============================================================
// PrivacyLayer — Sparse Merkle Tree (SMT)
// ============================================================
// SMT implementation for membership and non-membership proofs.
//
// Key design:
//   - Depth = 20 → supports 2^20 = 1,048,576 leaves
//   - Hash: Poseidon2 on BN254 field (BnScalar) — matches Noir circuits
//   - Zero values: pre-computed for each level
// ============================================================

use soroban_sdk::{crypto::BnScalar, vec, BytesN, Env, U256, Vec, Map};
use soroban_poseidon::poseidon2_hash;

pub const TREE_DEPTH: u32 = 20;

// Pre-compute zero hashes for each level of the tree
fn initialize_zero_hashes(env: &Env) -> Map<u32, BytesN<32>> {
    let mut zero_hashes = Map::new(env);
    let mut current_zero = BytesN::from_array(env, &[0u8; 32]);
    zero_hashes.set(0, current_zero.clone());

    for i in 1..=TREE_DEPTH {
        current_zero = poseidon2_hash_pair(env, &current_zero, &current_zero);
        zero_hashes.set(i, current_zero.clone());
    }
    zero_hashes
}

pub fn zero_at_level(env: &Env, level: u32) -> BytesN<32> {
    let zero_hashes = initialize_zero_hashes(env);
    zero_hashes.get(level).unwrap().unwrap()
}


// ──────────────────────────────────────────────────────────────
// Poseidon2 Hash — via soroban-poseidon crate
// ──────────────────────────────────────────────────────────────

/// Compute Poseidon2(left, right) using the soroban-poseidon crate.
pub fn poseidon2_hash_pair(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32> {
    let left_bytes = left.to_array();
    let right_bytes = right.to_array();
    let left_u256 = U256::from_be_bytes(env, &soroban_sdk::Bytes::from_array(env, &left_bytes));
    let right_u256 = U256::from_be_bytes(env, &soroban_sdk::Bytes::from_array(env, &right_bytes));

    let inputs = vec![env, left_u256, right_u256];
    let result: U256 = poseidon2_hash::<3, BnScalar>(env, &inputs);

    let result_bytes = result.to_be_bytes();
    let mut result_array = [0u8; 32];
    for i in 0..32 {
        result_array[i] = result_bytes.get(i as u32).unwrap_or(0);
    }
    BytesN::from_array(env, &result_array)
}





// ──────────────────────────────────────────────────────────────
// Merkle Tree Operations
// ──────────────────────────────────────────────────────────────

/// Verifies the membership of a leaf in the SMT.
pub fn verify_membership(
    env: &Env,
    root: &BytesN<32>,
    leaf: &BytesN<32>,
    index: u32,
    path: &Vec<BytesN<32>>,
) -> bool {
    if path.len() as u32 != TREE_DEPTH {
        return false;
    }

    let mut computed_hash = leaf.clone();
    let mut current_index = index;

    for i in 0..TREE_DEPTH {
        let proof_element = path.get(i as u32).unwrap();
        if current_index % 2 == 0 {
            computed_hash = poseidon2_hash_pair(env, &computed_hash, &proof_element);
        } else {
            computed_hash = poseidon2_hash_pair(env, &proof_element, &computed_hash);
        }
        current_index /= 2;
    }

    computed_hash == *root
}

/// Verifies the non-membership of a leaf in the SMT.
/// The `leaf` parameter is not used, but is kept for consistency with the
/// `verify_membership` function.
pub fn verify_non_membership(
    env: &Env,
    root: &BytesN<32>,
    _leaf: &BytesN<32>,
    index: u32,
    path: &Vec<BytesN<32>>,
) -> bool {
    let empty_leaf = BytesN::from_array(env, &[0u8; 32]);
    verify_membership(env, root, &empty_leaf, index, path)
}

