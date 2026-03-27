// ============================================================
// Batch Operations
// ============================================================

use soroban_sdk::{token, Address, BytesN, Env, Vec};

use crate::crypto::merkle;
use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::emit_deposit;
use crate::utils::validation;

/// Execute multiple deposits in a single transaction.
///
/// This is highly gas-efficient due to pre-computed zero values
/// and reduced authentication overhead.
///
/// # Arguments
/// - `from`        : depositor's Stellar address (must authorize)
/// - `commitments` : list of 32-byte commitments to insert
///
/// # Returns
/// `Vec<(leaf_index, merkle_root)>`
///
/// # Errors
/// - `Error::PoolPaused` if pool is paused
/// - `Error::TreeFull` if pool reaches capacity
pub fn execute_batch(
    env: Env,
    from: Address,
    commitments: Vec<BytesN<32>>,
) -> Result<Vec<(u32, BytesN<32>)>, Error> {
    // 1. Single authorization for the entire batch
    from.require_auth();

    // 2. Load and validate configuration
    let pool_config = config::load(&env)?;
    validation::require_not_paused(&pool_config)?;

    let num_deposits = commitments.len();
    if num_deposits == 0 {
        return Ok(Vec::new(&env));
    }

    // 3. Batch transfer funds (amount * count)
    let unit_amount = pool_config.denomination.amount();
    let total_amount = unit_amount.checked_mul(num_deposits as i128).ok_or(Error::FeeExceedsAmount)?;
    
    let token_client = token::Client::new(&env, &pool_config.token);
    token_client.transfer(
        &from,
        &env.current_contract_address(),
        &total_amount,
    );

    // 4. Sequentially insert into Merkle tree
    let mut results = Vec::new(&env);
    for commitment in commitments.iter() {
        validation::require_non_zero_commitment(&env, &commitment)?;
        
        let (leaf_index, new_root) = merkle::insert(&env, commitment.clone())?;
        
        // Emit individual events for indexers
        emit_deposit(&env, commitment, leaf_index, new_root.clone());
        
        results.push_back((leaf_index, new_root));
    }

    Ok(results)
}
