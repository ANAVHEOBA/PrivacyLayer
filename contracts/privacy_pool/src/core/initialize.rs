// ============================================================
// Initialization Logic
// ============================================================

use soroban_sdk::{Address, Env};

use crate::crypto::merkle;
use crate::storage::config;
use crate::types::errors::Error;
use crate::types::state::{Denomination, PoolConfig, VerifyingKey};

use crate::types::state::{Config, Denomination, PoolConfig, PoolId, VerifyingKey};

/// Initialize the global privacy pool contract.
pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
    if config::is_initialized(&env) {
        return Err(Error::AlreadyInitialized);
    }

    let global_config = Config { admin };
    config::save_global_config(&env, &global_config);

    Ok(())
}

/// Create a new shielded pool for a specific token and denomination.
pub fn create_pool(
    env: Env,
    pool_id: PoolId,
    token: Address,
    denomination: Denomination,
    vk: VerifyingKey,
) -> Result<(), Error> {
    // Only global admin can create pools
    let global_config = config::load_global_config(&env)?;
    global_config.admin.require_auth();

    // Check if pool already exists
    if config::load_pool_config(&env, &pool_id).is_ok() {
        return Err(Error::AlreadyInitialized);
    }

    let pool_config = PoolConfig {
        token,
        denomination,
        tree_depth: merkle::TREE_DEPTH,
        root_history_size: merkle::ROOT_HISTORY_SIZE,
        paused: false,
    };

    config::save_pool_config(&env, &pool_id, &pool_config);
    config::save_verifying_key(&env, &pool_id, &vk);

    Ok(())
}
