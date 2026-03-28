// ============================================================
// Admin Functions - Pool management
// ============================================================

use soroban_sdk::{token, Address, Env, String};

use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::{emit_pool_paused, emit_pool_unpaused, emit_vk_updated};
use crate::types::state::VerifyingKey;
use crate::utils::validation;

/// Pause the pool - blocks deposits and withdrawals.
/// Only callable by admin.
/// Records the pause timestamp and reason for audit trail.
pub fn pause(env: Env, admin: Address, reason: String) -> Result<(), Error> {
    admin.require_auth();

    let mut pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    let pause_timestamp = env.ledger().sequence() as u64;
    pool_config.paused = true;
    pool_config.pause_timestamp = pause_timestamp;
    pool_config.pause_reason = reason.clone();
    config::save(&env, &pool_config);

    emit_pool_paused(&env, admin, pause_timestamp, reason);
    Ok(())
}

/// Unpause the pool.
/// Only callable by admin.
pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
    admin.require_auth();

    let mut pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    pool_config.paused = false;
    config::save(&env, &pool_config);

    let unpause_timestamp = env.ledger().sequence() as u64;
    emit_pool_unpaused(&env, admin, unpause_timestamp);
    Ok(())
}

/// Emergency withdrawal - allows admin to recover funds when pool is paused.
/// Only callable by admin when pool is paused.
/// Transfers the entire token balance to the admin.
pub fn emergency_withdraw(env: Env, admin: Address) -> Result<i128, Error> {
    admin.require_auth();

    let pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    // Only allow emergency withdraw when pool is paused
    if !pool_config.paused {
        return Err(Error::PoolNotPaused);
    }

    let token_client = token::Client::new(&env, &pool_config.token);
    let balance = token_client.balance(&env.current_contract_address());

    if balance <= 0 {
        return Err(Error::NoFundsToWithdraw);
    }

    // Transfer entire balance to admin
    token_client.transfer(
        &env.current_contract_address(),
        &admin,
        &balance,
    );

    Ok(balance)
}

/// Update the Groth16 verifying key.
/// Only callable by admin. Critical operation - used for circuit upgrades.
pub fn set_verifying_key(
    env: Env,
    admin: Address,
    new_vk: VerifyingKey,
) -> Result<(), Error> {
    admin.require_auth();

    let pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    config::save_verifying_key(&env, &new_vk);

    emit_vk_updated(&env, admin);
    Ok(())
}
