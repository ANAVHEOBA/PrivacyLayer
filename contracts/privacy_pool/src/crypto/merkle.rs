// ============================================================
// PrivacyLayer — Incremental Merkle Tree (Soroban)
// ============================================================
// Append-only incremental Merkle tree using Poseidon2 hashing
// via the `soroban-poseidon` crate (stellar/rs-soroban-poseidon).
//
// Key design:
//   - Depth = 20 → supports 2^20 = 1,048,576 deposits
//   - Root history = 30 → withdrawal proofs valid for 30 recent roots
//   - Hash: Poseidon2 on BN254 field (BnScalar) — matches Noir circuits
//   - Zero values: computed as Poseidon2(0, 0) chain
//
// Inspired by Tornado Cash MerkleTreeWithHistory.sol (MIT license).
// ============================================================

use soroban_sdk::{crypto::BnScalar, vec, BytesN, Env, U256};
use soroban_poseidon::poseidon2_hash;

use crate::types::errors::Error;
use crate::types::state::{DataKey, PoolId, TreeState};

/// Tree depth — 20 levels = 2^20 = 1,048,576 leaves
pub const TREE_DEPTH: u32 = 20;
/// Number of historical roots to keep for valid proofs
pub const ROOT_HISTORY_SIZE: u32 = 30;

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

/// Compute the zero value at a given tree level on-the-fly.
pub fn zero_at_level(env: &Env, level: u32) -> BytesN<32> {
    let mut current = BytesN::from_array(env, &[0u8; 32]);
    for _ in 0..=level {
        current = poseidon2_hash_pair(env, &current.clone(), &current.clone());
    }
    current
}

// ──────────────────────────────────────────────────────────────
// Storage Accessors
// ──────────────────────────────────────────────────────────────

pub fn get_tree_state(env: &Env, pool_id: &PoolId) -> TreeState {
    env.storage()
        .persistent()
        .get(&DataKey::TreeState(pool_id.clone()))
        .unwrap_or_default()
}

pub fn save_tree_state(env: &Env, pool_id: &PoolId, state: &TreeState) {
    env.storage()
        .persistent()
        .set(&DataKey::TreeState(pool_id.clone()), state);
}

pub fn get_root(env: &Env, pool_id: &PoolId, index: u32) -> Option<BytesN<32>> {
    env.storage()
        .persistent()
        .get(&DataKey::Root(pool_id.clone(), index % ROOT_HISTORY_SIZE))
}

pub fn save_root(env: &Env, pool_id: &PoolId, index: u32, root: BytesN<32>) {
    env.storage()
        .persistent()
        .set(&DataKey::Root(pool_id.clone(), index % ROOT_HISTORY_SIZE), &root);
}

pub fn get_filled_subtree(env: &Env, pool_id: &PoolId, level: u32) -> BytesN<32> {
    env.storage()
        .persistent()
        .get(&DataKey::FilledSubtree(pool_id.clone(), level))
        .unwrap_or_else(|| zero_at_level(env, level))
}

pub fn save_filled_subtree(env: &Env, pool_id: &PoolId, level: u32, hash: BytesN<32>) {
    env.storage()
        .persistent()
        .set(&DataKey::FilledSubtree(pool_id.clone(), level), &hash);
}

// ──────────────────────────────────────────────────────────────
// Merkle Tree Operations
// ──────────────────────────────────────────────────────────────

/// Insert a commitment into the incremental Merkle tree for a specific pool. O(depth).
pub fn insert(env: &Env, pool_id: &PoolId, commitment: BytesN<32>) -> Result<(u32, BytesN<32>), Error> {
    let mut state = get_tree_state(env, pool_id);

    let max_leaves = 1u32 << TREE_DEPTH;
    if state.next_index >= max_leaves {
        return Err(Error::TreeFull);
    }

    let leaf_index = state.next_index;
    let mut current_index = leaf_index;
    let mut current_hash = commitment.clone();

    for level in 0..TREE_DEPTH {
        let left: BytesN<32>;
        let right: BytesN<32>;

        if current_index % 2 == 0 {
            left = current_hash.clone();
            right = zero_at_level(env, level);
            save_filled_subtree(env, pool_id, level, current_hash.clone());
        } else {
            left = get_filled_subtree(env, pool_id, level);
            right = current_hash.clone();
        }

        current_hash = poseidon2_hash_pair(env, &left, &right);
        current_index /= 2;
    }

    let new_root = current_hash;
    let new_root_index = state.current_root_index.wrapping_add(1) % ROOT_HISTORY_SIZE;
    save_root(env, pool_id, new_root_index, new_root.clone());

    state.current_root_index = new_root_index;
    state.next_index = leaf_index + 1;
    save_tree_state(env, pool_id, &state);

    Ok((leaf_index, new_root))
}

/// Check if a given root is in the historical root buffer of a specific pool.
pub fn is_known_root(env: &Env, pool_id: &PoolId, root: &BytesN<32>) -> bool {
    let state = get_tree_state(env, pool_id);

    if state.next_index == 0 {
        return false;
    }

    let mut index = state.current_root_index;
    for _ in 0..ROOT_HISTORY_SIZE {
        if let Some(stored_root) = get_root(env, pool_id, index) {
            if stored_root == *root {
                return true;
            }
        }
        if index == 0 {
            index = ROOT_HISTORY_SIZE - 1;
        } else {
            index -= 1;
        }
    }

    false
}

/// Returns the current (most recent) Merkle root for a specific pool.
pub fn current_root(env: &Env, pool_id: &PoolId) -> Option<BytesN<32>> {
    let state = get_tree_state(env, pool_id);
    if state.next_index == 0 {
        return None;
    }
    get_root(env, pool_id, state.current_root_index)
}
