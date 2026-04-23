// ============================================================
// Admin Functions - Pool management
// ============================================================

use soroban_sdk::{Address, Env};

use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::{emit_pool_paused, emit_pool_unpaused, emit_vk_updated};
use crate::types::state::VerifyingKey;
use crate::utils::validation;

use crate::types::state::{PoolId, VerifyingKey};
use crate::utils::validation;

/// Pause a specific pool - blocks deposits and withdrawals.
/// Only callable by global admin.
pub fn pause(env: Env, admin: Address, pool_id: PoolId) -> Result<(), Error> {
    admin.require_auth();
    
    let global_config = config::load_global_config(&env)?;
    validation::require_admin(&admin, &global_config)?;

    let mut pool_config = config::load_pool_config(&env, &pool_id)?;
    pool_config.paused = true;
    config::save_pool_config(&env, &pool_id, &pool_config);
    
    emit_pool_paused(&env, admin, pool_id);
    Ok(())
}

/// Unpause a specific pool.
/// Only callable by global admin.
pub fn unpause(env: Env, admin: Address, pool_id: PoolId) -> Result<(), Error> {
    admin.require_auth();
    
    let global_config = config::load_global_config(&env)?;
    validation::require_admin(&admin, &global_config)?;

    let mut pool_config = config::load_pool_config(&env, &pool_id)?;
    pool_config.paused = false;
    config::save_pool_config(&env, &pool_id, &pool_config);
    
    emit_pool_unpaused(&env, admin, pool_id);
    Ok(())
}

/// Update the Groth16 verifying key for a specific pool.
/// Only callable by global admin. Critical operation - used for circuit upgrades.
pub fn set_verifying_key(
    env: Env,
    admin: Address,
    pool_id: PoolId,
    new_vk: VerifyingKey,
) -> Result<(), Error> {
    admin.require_auth();
    
    let global_config = config::load_global_config(&env)?;
    validation::require_admin(&admin, &global_config)?;

    config::save_verifying_key(&env, &pool_id, &new_vk);
    
    emit_vk_updated(&env, admin, pool_id);
    Ok(())
}
