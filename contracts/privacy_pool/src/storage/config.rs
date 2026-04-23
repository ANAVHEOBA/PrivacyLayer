// ============================================================
// Configuration Storage
// ============================================================
// Manages pool configuration and verifying key storage.
// ============================================================

use soroban_sdk::{contracttype, Env, Address, Symbol};

use crate::types::errors::Error;
use crate::types::state::{DataKey, PoolConfig, VerifyingKey};

/// Asset types supported by the privacy pool
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Asset {
    XLM,
    USDC,
}

/// Per-asset pool configuration
#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetPoolConfig {
    pub asset: Asset,
    pub token: Address,  // Token contract address (for USDC)
    pub denomination: i128,
    pub is_active: bool,
}

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

/// Get asset pool configuration
///
/// # Arguments
/// - `asset`: The asset type (XLM or USDC)
pub fn get_asset_pool_config(env: &Env, asset: &Asset) -> Option<AssetPoolConfig> {
    let key = DataKey::AssetPoolConfig(asset.clone());
    env.storage().persistent().get(&key)
}

/// Save asset pool configuration
///
/// # Arguments
/// - `asset`: The asset type (XLM or USDC)
/// - `config`: The asset pool configuration
pub fn save_asset_pool_config(env: &Env, asset: &Asset, config: &AssetPoolConfig) {
    let key = DataKey::AssetPoolConfig(asset.clone());
    env.storage().persistent().set(&key, config);
}

/// Check if an asset pool exists
pub fn asset_pool_exists(env: &Env, asset: &Asset) -> bool {
    let key = DataKey::AssetPoolConfig(asset.clone());
    env.storage().persistent().has(&key)
}
