// ============================================================
// Admin Functions - Pool management
// ============================================================

use soroban_sdk::{token, Address, Env, String};

use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::{emit_emergency_withdraw, emit_pool_paused, emit_pool_unpaused, emit_vk_updated};
use crate::types::state::{PauseInfo, VerifyingKey};
use crate::utils::validation;

/// Pause the pool - blocks deposits and withdrawals.
/// Only callable by admin.
/// 
/// # Arguments
/// - `env` - Soroban environment
/// - `admin` - Admin address (must authorize)
/// - `pause_reason` - Human-readable reason for pause (for audit trail)
/// 
/// # Events
/// Emits `PoolPausedEvent` with admin, reason, and timestamp.
pub fn pause(env: Env, admin: Address, pause_reason: String) -> Result<(), Error> {
    admin.require_auth();
    
    let mut pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    // Check if already paused
    if pool_config.paused {
        return Ok(()); // Idempotent - already paused
    }

    // Get current timestamp
    let timestamp = env.ledger().timestamp();

    // Update pool state
    pool_config.paused = true;
    config::save(&env, &pool_config);

    // Save pause info for audit trail
    let pause_info = PauseInfo {
        pause_timestamp: timestamp,
        pause_reason: pause_reason.clone(),
        paused_by: admin.clone(),
    };
    config::save_pause_info(&env, &pause_info);
    
    emit_pool_paused(&env, admin, pause_reason, timestamp);
    Ok(())
}

/// Unpause the pool.
/// Only callable by admin.
/// 
/// # Events
/// Emits `PoolUnpausedEvent` with admin and timestamp.
pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
    admin.require_auth();
    
    let mut pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    // Check if already unpaused
    if !pool_config.paused {
        return Ok(()); // Idempotent - already unpaused
    }

    // Get current timestamp
    let timestamp = env.ledger().timestamp();

    // Update pool state
    pool_config.paused = false;
    config::save(&env, &pool_config);

    // Clear pause info
    config::clear_pause_info(&env);
    
    emit_pool_unpaused(&env, admin, timestamp);
    Ok(())
}

/// Check if the pool is currently paused.
/// Returns the paused state and pause info if paused.
pub fn is_paused(env: Env) -> Result<(bool, Option<PauseInfo>), Error> {
    let pool_config = config::load(&env)?;
    
    if pool_config.paused {
        let pause_info = config::load_pause_info(&env);
        Ok((true, Some(pause_info)))
    } else {
        Ok((false, None))
    }
}

/// Emergency withdraw - allows admin to recover funds during security incidents.
/// Pool MUST be paused before calling this function.
/// 
/// # Security Considerations
/// - This function bypasses all privacy guarantees
/// - Should only be used in genuine emergencies
/// - Emits event for transparency and audit
/// 
/// # Arguments
/// - `env` - Soroban environment
/// - `admin` - Admin address (must authorize)
/// - `recipient` - Address to receive the funds
/// - `amount` - Amount to withdraw (in stroops/microunits)
/// - `reason` - Human-readable reason for emergency withdrawal
/// 
/// # Errors
/// - `Error::UnauthorizedAdmin` if caller is not admin
/// - `Error::PoolNotPaused` if pool is not paused
/// - `Error::InvalidEmergencyAmount` if amount is 0
/// - `Error::EmergencyWithdrawExceedsBalance` if amount > contract balance
pub fn emergency_withdraw(
    env: Env,
    admin: Address,
    recipient: Address,
    amount: i128,
    reason: String,
) -> Result<(), Error> {
    admin.require_auth();
    
    let pool_config = config::load(&env)?;
    validation::require_admin(&admin, &pool_config)?;

    // Security check: pool must be paused
    if !pool_config.paused {
        return Err(Error::PoolNotPaused);
    }

    // Validate amount
    if amount <= 0 {
        return Err(Error::InvalidEmergencyAmount);
    }

    // Check contract balance
    let token_client = token::Client::new(&env, &pool_config.token);
    let contract_balance = token_client.balance(&env.current_contract_address());
    
    if amount > contract_balance {
        return Err(Error::EmergencyWithdrawExceedsBalance);
    }

    // Get timestamp for event
    let timestamp = env.ledger().timestamp();

    // Execute transfer
    token_client.transfer(
        &env.current_contract_address(),
        &recipient,
        &amount,
    );

    // Emit event for audit trail
    emit_emergency_withdraw(&env, admin, recipient, amount, timestamp, reason);

    Ok(())
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