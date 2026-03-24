// ============================================================
// Configuration Storage
// ============================================================
// Manages pool configuration and verifying key storage.
// ============================================================

use soroban_sdk::Env;

use crate::types::errors::Error;
use crate::types::state::{DataKey, PoolConfig, PauseInfo, VerifyingKey};

/// Check if the pool has been initialized.
pub fn exists(env: &Env) -> bool {
    env.storage().persistent().has(&DataKey::Config)
}

/// Load the pool configuration.
///
/// # Errors
/// Returns `Error::NotInitialized` if config doesn't exist.
pub fn load(env: &Env) -> Result<PoolConfig, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::Config)
        .ok_or(Error::NotInitialized)
}

/// Save the pool configuration.
pub fn save(env: &Env, config: &PoolConfig) {
    env.storage().persistent().set(&DataKey::Config, config);
}

/// Load the verifying key.
///
/// # Errors
/// Returns `Error::NoVerifyingKey` if VK doesn't exist.
pub fn load_verifying_key(env: &Env) -> Result<VerifyingKey, Error> {
    env.storage()
        .persistent()
        .get(&DataKey::VerifyingKey)
        .ok_or(Error::NoVerifyingKey)
}

/// Save the verifying key.
pub fn save_verifying_key(env: &Env, vk: &VerifyingKey) {
    env.storage().persistent().set(&DataKey::VerifyingKey, vk);
}

// ──────────────────────────────────────────────────────────────
// Pause Info Storage
// ──────────────────────────────────────────────────────────────

/// Load the pause information.
/// Returns default (empty) PauseInfo if not set.
pub fn load_pause_info(env: &Env) -> PauseInfo {
    env.storage()
        .persistent()
        .get(&DataKey::PauseInfo)
        .unwrap_or_default()
}

/// Save the pause information.
pub fn save_pause_info(env: &Env, pause_info: &PauseInfo) {
    env.storage().persistent().set(&DataKey::PauseInfo, pause_info);
}

/// Clear the pause information (on unpause).
pub fn clear_pause_info(env: &Env) {
    env.storage().persistent().remove(&DataKey::PauseInfo);
}
