// ============================================================
// View Functions - Read-only queries
// ============================================================

use soroban_sdk::{BytesN, Env};

use crate::crypto::merkle;
use crate::storage::{config, nullifier};
use crate::types::errors::Error;
use crate::types::state::PoolConfig;

use crate::types::state::{Config, PoolConfig, PoolId};

/// Returns the current Merkle root (most recent) for a specific pool.
pub fn get_root(env: Env, pool_id: PoolId) -> Result<BytesN<32>, Error> {
    merkle::current_root(&env, &pool_id).ok_or(Error::PoolNotFound)
}

/// Returns the total number of deposits for a specific pool.
pub fn deposit_count(env: Env, pool_id: PoolId) -> Result<u32, Error> {
    // If pool exists, return its next_index
    config::load_pool_config(&env, &pool_id)?;
    Ok(merkle::get_tree_state(&env, &pool_id).next_index)
}

/// Check if a root is in the historical root buffer of a specific pool.
pub fn is_known_root(env: Env, pool_id: PoolId, root: BytesN<32>) -> bool {
    merkle::is_known_root(&env, &pool_id, &root)
}

/// Check if a nullifier has been spent in a specific pool.
pub fn is_spent(env: Env, pool_id: PoolId, nullifier_hash: BytesN<32>) -> bool {
    nullifier::is_spent(&env, &pool_id, &nullifier_hash)
}

/// Returns the configuration for a specific pool.
pub fn get_pool_config(env: Env, pool_id: PoolId) -> Result<PoolConfig, Error> {
    config::load_pool_config(&env, &pool_id)
}

/// Returns the global contract configuration.
pub fn get_global_config(env: Env) -> Result<Config, Error> {
    config::load_global_config(&env)
}
