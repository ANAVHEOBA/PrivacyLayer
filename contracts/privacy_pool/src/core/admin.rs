// ============================================================
// Admin Operations
// ============================================================

use soroban_sdk::{Address, Env};

use crate::storage::config;
use crate::types::errors::Error;
use crate::types::state::VerifyingKey;
use crate::utils::validation;

/// Pause the pool.
pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
    admin.require_auth();
    let mut pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;
    pool_config.paused = true;
    config::save(&env, &pool_config);
    Ok(())
}

/// Unpause the pool.
pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
    admin.require_auth();
    let mut pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;
    pool_config.paused = false;
    config::save(&env, &pool_config);
    Ok(())
}

/// Update the verifying key.
pub fn set_verifying_key(env: Env, admin: Address, vk: VerifyingKey) -> Result<(), Error> {
    admin.require_auth();
    let pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;
    config::save_verifying_key(&env, &vk);
    Ok(())
}
