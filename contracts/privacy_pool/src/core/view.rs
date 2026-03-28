// ============================================================
// View Functions - Read-only queries
// ============================================================

use soroban_sdk::{BytesN, Env};

use crate::crypto::merkle;
use crate::storage::{config, nullifier};
use crate::types::errors::Error;
use crate::types::state::PoolConfig;

/// Returns the current Merkle root (most recent).
pub fn get_root(env: Env) -> Result<BytesN<32>, Error> {
    merkle::current_root(&env).ok_or(Error::NotInitialized)
}

/// Returns the total number of deposits (= next leaf index).
pub fn deposit_count(env: Env) -> u32 {
    merkle::get_tree_state(&env).next_index
}

/// Check if a root is in the historical root buffer.
pub fn is_known_root(env: Env, root: BytesN<32>) -> bool {
    merkle::is_known_root(&env, &root)
}

/// Check if a nullifier has been spent.
pub fn is_spent(env: Env, nullifier_hash: BytesN<32>) -> bool {
    nullifier::is_spent(&env, &nullifier_hash)
}

/// Check if the pool is currently paused.
pub fn is_paused(env: Env) -> bool {
    match config::load(&env) {
        Ok(cfg) => cfg.paused,
        Err(_) => false,
    }
}

/// Returns the pool configuration.
pub fn get_config(env: Env) -> Result<PoolConfig, Error> {
    config::load(&env)
}
