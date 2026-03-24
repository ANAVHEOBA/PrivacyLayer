// ============================================================
// View Functions - Read-only queries
// ============================================================

use soroban_sdk::{BytesN, Env, Vec};

use crate::crypto::merkle;
use crate::storage::{config, nullifier};
use crate::types::errors::Error;
use crate::types::state::{PoolConfig, Denomination, DataKey};

/// Returns the current Merkle root for a denomination (most recent).
pub fn get_root_by_denomination(env: Env, denomination: Denomination) -> Result<BytesN<32>, Error> {
    let denom_value = denomination.to_u32();
    merkle::current_root(&env, denom_value).ok_or(Error::NotInitialized)
}

/// Returns the total number of deposits for a denomination (= next leaf index).
pub fn deposit_count_by_denomination(env: Env, denomination: Denomination) -> u32 {
    let denom_value = denomination.to_u32();
    merkle::get_tree_state(&env, denom_value).next_index
}

/// Check if a root is in the historical root buffer for a denomination.
pub fn is_known_root_for_denomination(env: Env, root: BytesN<32>, denomination: Denomination) -> bool {
    let denom_value = denomination.to_u32();
    merkle::is_known_root(&env, denom_value, &root)
}

/// Check if a nullifier has been spent.
pub fn is_spent(env: Env, nullifier_hash: BytesN<32>) -> bool {
    nullifier::is_spent(&env, &nullifier_hash)
}

/// Returns the pool configuration.
pub fn get_config(env: Env) -> Result<PoolConfig, Error> {
    config::load(&env)
}

/// Returns all supported denominations.
pub fn get_all_denominations(env: Env) -> Vec<Denomination> {
    env.storage()
        .persistent()
        .get(&DataKey::Denominations)
        .unwrap_or_else(|| Vec::new(&env))
}
