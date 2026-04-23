// ============================================================
// Initialization Logic
// ============================================================

use soroban_sdk::{Address, Env};

use crate::crypto::merkle;
use crate::storage::{analytics, config};
use crate::types::errors::Error;
use crate::types::state::{Denomination, PoolConfig, VerifyingKey};

/// Initialize the privacy pool with configuration.
///
/// # Arguments
/// - `admin`       : address that can pause/update the pool
/// - `token`       : token contract (use Stellar native XLM or USDC SAC)
/// - `denomination`: fixed deposit/withdrawal amount
/// - `vk`          : Groth16 verifying key for the withdrawal circuit
///
/// # Errors
/// - `Error::AlreadyInitialized` if called more than once
pub fn execute(
    env: Env,
    admin: Address,
    token: Address,
    denomination: Denomination,
    vk: VerifyingKey,
) -> Result<(), Error> {
    // Check if already initialized
    if config::exists(&env) {
        return Err(Error::AlreadyInitialized);
    }

    // Create pool configuration
    let pool_config = PoolConfig {
        admin,
        token,
        denomination,
        tree_depth: merkle::TREE_DEPTH,
        root_history_size: merkle::ROOT_HISTORY_SIZE,
        paused: false,
    };

    // Save configuration and verifying key
    config::save(&env, &pool_config);
    config::save_verifying_key(&env, &vk);
    analytics::initialize(&env);

    Ok(())
}
