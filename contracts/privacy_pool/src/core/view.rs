// ============================================================
// View Functions - Read-only queries
// ============================================================

use soroban_sdk::{BytesN, Env};

use crate::crypto::merkle;
use crate::storage::{analytics, config, nullifier};
use crate::types::errors::Error;
use crate::types::state::{AnalyticsSnapshot, PerformanceMetricKind, PoolConfig};

/// Returns the current Merkle root (most recent).
pub fn get_root(env: Env) -> Result<BytesN<32>, Error> {
    merkle::current_root(&env).ok_or(Error::NotInitialized)
}

/// Returns the total number of deposits (= next leaf index).
pub fn deposit_count(env: Env) -> u32 {
    merkle::get_tree_state(&env).next_index
}

/// Returns the total number of successful withdrawals.
pub fn withdraw_count(env: Env) -> u64 {
    analytics::withdrawal_count(&env)
}

/// Check if a root is in the historical root buffer.
pub fn is_known_root(env: Env, root: BytesN<32>) -> bool {
    merkle::is_known_root(&env, &root)
}

/// Check if a nullifier has been spent.
pub fn is_spent(env: Env, nullifier_hash: BytesN<32>) -> bool {
    nullifier::is_spent(&env, &nullifier_hash)
}

/// Returns the pool configuration.
pub fn get_config(env: Env) -> Result<PoolConfig, Error> {
    config::load(&env)
}

/// Record an aggregate page view event (no identifiers).
pub fn record_page_view(env: Env) -> Result<(), Error> {
    config::load(&env)?;
    analytics::record_page_view(&env);
    Ok(())
}

/// Record an aggregate error event (no identifiers).
pub fn record_error(env: Env) -> Result<(), Error> {
    config::load(&env)?;
    analytics::record_error(&env);
    Ok(())
}

/// Record aggregate client-side performance measurement (no identifiers).
pub fn record_performance(
    env: Env,
    kind: PerformanceMetricKind,
    duration_ms: u32,
) -> Result<(), Error> {
    config::load(&env)?;
    analytics::record_performance(&env, kind, duration_ms);
    Ok(())
}

/// Returns aggregate analytics snapshot for public dashboards.
pub fn analytics_snapshot(env: Env) -> Result<AnalyticsSnapshot, Error> {
    config::load(&env)?;
    let deposits = merkle::get_tree_state(&env).next_index;
    Ok(analytics::snapshot(&env, deposits))
}
