// ============================================================
// Configuration Storage
// ============================================================
// Manages pool configuration and verifying key storage.
// ============================================================

use soroban_sdk::Env;

use crate::types::errors::Error;
use crate::types::state::{Config, DataKey, PoolConfig, PoolId, VerifyingKey};

/// Check if the contract has been initialized.
pub fn is_initialized(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Config)
}

/// Load the global contract configuration.
pub fn load_global_config(env: &Env) -> Result<Config, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Config)
        .ok_or(Error::NotInitialized)
}

/// Save the global contract configuration.
pub fn save_global_config(env: &Env, config: &Config) {
    env.storage().persistent().set(&DataKey::Config, config);
}

/// Load the pool configuration for a specific pool.
pub fn load_pool_config(env: &Env, pool_id: &PoolId) -> Result<PoolConfig, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::PoolConfig(pool_id.clone()))
        .ok_or(Error::PoolNotFound)
}

/// Save the pool configuration for a specific pool.
pub fn save_pool_config(env: &Env, pool_id: &PoolId, config: &PoolConfig) {
    env.storage()
        .persistent()
        .set(&DataKey::PoolConfig(pool_id.clone()), config);
}

/// Load the verifying key for a specific pool.
pub fn load_verifying_key(env: &Env, pool_id: &PoolId) -> Result<VerifyingKey, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::VerifyingKey(pool_id.clone()))
        .ok_or(Error::NoVerifyingKey)
}

/// Save the verifying key for a specific pool.
pub fn save_verifying_key(env: &Env, pool_id: &PoolId, vk: &VerifyingKey) {
    env.storage()
        .persistent()
        .set(&DataKey::VerifyingKey(pool_id.clone()), vk);
}
