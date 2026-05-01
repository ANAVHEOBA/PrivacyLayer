// ============================================================
// View Functions - Read-only queries
// ============================================================

use soroban_sdk::{BytesN, Env};

use crate::crypto::merkle;
use crate::storage::{analytics, config, nullifier};
use crate::types::errors::Error;
use crate::types::state::{AnalyticsSnapshot, PerformanceMetricKind, PoolConfig, PoolId};

/// Returns the current Merkle root (most recent) for a specific pool.
pub fn get_root(env: Env, pool_id: PoolId) -> Result<BytesN<32>, Error> {
    merkle::current_root(&env, &pool_id).ok_or(Error::PoolNotFound)
}

/// Check if a root is in the historical root buffer of a specific pool.
pub fn is_known_root(env: Env, pool_id: PoolId, root: BytesN<32>) -> bool {
    merkle::is_known_root(&env, &pool_id, &root)
}

/// Returns the total number of deposits for a specific pool.
pub fn deposit_count(env: Env, pool_id: PoolId) -> Result<u32, Error> {
    // If pool exists, return its next_index
    config::load_pool_config(&env, &pool_id)?;
    Ok(merkle::get_tree_state(&env, &pool_id).next_index)
}

/// Returns the total number of successful withdrawals.
pub fn withdraw_count(env: Env) -> u64 {
    analytics::withdrawal_count(&env)
}


/// Check if a nullifier has been spent in a specific pool.
pub fn is_spent(env: Env, pool_id: PoolId, nullifier_hash: BytesN<32>) -> bool {
    nullifier::is_spent(&env, &pool_id, &nullifier_hash)
}

/// Returns the configuration for a specific pool.
pub fn get_pool_config(env: Env, pool_id: PoolId) -> Result<PoolConfig, Error> {
    config::load_pool_config(&env, &pool_id)
}

/// Returns the verifying key for a specific pool (ZK-074).
pub fn get_verifying_key(env: Env, pool_id: PoolId) -> Result<crate::types::state::VerifyingKey, Error> {
    config::load_verifying_key(&env, &pool_id)
}

/// Returns the global contract configuration.
pub fn get_global_config(env: Env) -> Result<crate::types::state::Config, Error> {
    config::load_global_config(&env)
}

/// Record an aggregate page view event (no identifiers).
pub fn record_page_view(env: Env) -> Result<(), Error> {
    config::load_global_config(&env)?;
    analytics::record_page_view(&env);
    Ok(())
}

/// Record an aggregate error event (no identifiers).
pub fn record_error(env: Env) -> Result<(), Error> {
    config::load_global_config(&env)?;
    analytics::record_error(&env);
    Ok(())
}

/// Record aggregate client-side performance measurement (no identifiers).
pub fn record_performance(
    env: Env,
    kind: PerformanceMetricKind,
    duration_ms: u32,
) -> Result<(), Error> {
    config::load_global_config(&env)?;
    analytics::record_performance(&env, kind, duration_ms);
    Ok(())
}

/// Returns global aggregate analytics snapshot for public dashboards.
pub fn analytics_snapshot(env: Env) -> Result<AnalyticsSnapshot, Error> {
    config::load_global_config(&env)?;
    // Use aggregate withdrawals for now as a placeholder for global deposits
    let withdrawals = analytics::withdrawal_count(&env);
    Ok(analytics::snapshot(&env, withdrawals as u32))
}
