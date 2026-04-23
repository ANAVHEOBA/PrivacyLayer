// ============================================================
// Deposit Logic
// ============================================================

use soroban_sdk::{token, Address, BytesN, Env};

use crate::crypto::merkle;
use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::emit_deposit;
use crate::utils::validation;

/// Execute a deposit into the shielded pool.
///
/// # Arguments
/// - `from`       : depositor's Stellar address (must authorize)
/// - `commitment` : 32-byte field element = Hash(nullifier, secret)
///
/// # Returns
/// `(leaf_index, merkle_root)` - store leaf_index with your note
///
/// # Errors
/// - `Error::NotInitialized` if contract not initialized
/// - `Error::PoolPaused` if pool is paused
/// - `Error::ZeroCommitment` if commitment is all zeros
/// - `Error::TreeFull` if pool is full (1,048,576 deposits)
pub fn execute(
    env: Env,
    from: Address,
    commitment: BytesN<32>,
) -> Result<(u32, BytesN<32>), Error> {
    // Require authorization from the depositor
    from.require_auth();

    // Load and validate configuration
    let pool_config = config::load(&env)?;
    validation::require_not_paused(&pool_config)?;

    // Validate commitment
    validation::require_non_zero_commitment(&env, &commitment)?;

    // Transfer denomination amount from depositor to contract vault
    // For XLM: use native transfer
    // For USDC: use token contract's transfer_from (requires prior approval)
    let amount = pool_config.denomination.amount();
    let token_client = token::Client::new(&env, &pool_config.token);
    
    // Check allowance for USDC deposits
    let allowance = token_client.allowance(&from, &env.current_contract_address());
    if allowance < amount {
        // For USDC, require prior approval
        // For XLM, this will still work as native transfer doesn't need allowance
        return Err(Error::InsufficientAllowance);
    }
    
    token_client.transfer_from(
        &from,
        &env.current_contract_address(),
        &env.current_contract_address(),
        &amount,
    );

    // Insert commitment into Merkle tree
    let (leaf_index, new_root) = merkle::insert(&env, commitment.clone())?;

    // Emit deposit event (no depositor address for privacy)
    emit_deposit(&env, commitment, leaf_index, new_root.clone());

    Ok((leaf_index, new_root))
}
