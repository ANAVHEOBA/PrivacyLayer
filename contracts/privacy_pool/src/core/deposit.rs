// ============================================================
// Deposit Logic
// ============================================================

use soroban_sdk::{token, Address, BytesN, Env};

use crate::crypto::merkle;
use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::emit_deposit;
use crate::utils::validation;

use crate::types::state::{PoolId};

/// Execute a deposit into a specific shielded pool.
pub fn execute(
    env: Env,
    pool_id: PoolId,
    from: Address,
    commitment: BytesN<32>,
) -> Result<(u32, BytesN<32>), Error> {
    // Require authorization from the depositor
    from.require_auth();

    // Load and validate pool configuration
    let pool_config = config::load_pool_config(&env, &pool_id)?;
    validation::require_not_paused(&pool_config)?;

    // Validate commitment
    validation::require_non_zero_commitment(&env, &commitment)?;

    // Transfer denomination amount from depositor to contract vault
    let amount = pool_config.denomination.amount();
    let token_client = token::Client::new(&env, &pool_config.token);
    token_client.transfer(
        &from,
        &env.current_contract_address(),
        &amount,
    );

    // Insert commitment into Merkle tree for this pool
    let (leaf_index, new_root) = merkle::insert(&env, &pool_id, commitment.clone())?;

    // Emit deposit event (no depositor address for privacy)
    emit_deposit(&env, pool_id, commitment, leaf_index, new_root.clone());

    Ok((leaf_index, new_root))
}
