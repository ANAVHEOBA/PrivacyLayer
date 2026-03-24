// ============================================================
// Deposit Logic
// ============================================================

use soroban_sdk::{token, Address, BytesN, Env, Vec};

use crate::crypto::merkle;
use crate::storage::config;
use crate::types::errors::Error;
use crate::types::events::emit_deposit;
use crate::types::state::{Denomination, DataKey};
use crate::utils::validation;

/// Execute a deposit into the shielded pool for a specific denomination.
///
/// # Arguments
/// - `from`        : depositor's Stellar address (must authorize)
/// - `denomination`: which fixed amount to deposit
/// - `commitment`  : 32-byte field element = Hash(nullifier, secret)
///
/// # Returns
/// `(leaf_index, merkle_root)` - store leaf_index with your note
///
/// # Errors
/// - `Error::NotInitialized` if contract not initialized
/// - `Error::PoolPaused` if pool is paused
/// - `Error::ZeroCommitment` if commitment is all zeros
/// - `Error::TreeFull` if pool is full (1,048,576 deposits)
/// - `Error::WrongAmount` if transferred amount doesn't match denomination
pub fn execute(
    env: Env,
    from: Address,
    denomination: Denomination,
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
    let amount = denomination.amount();
    let token_client = token::Client::new(&env, &pool_config.token);
    token_client.transfer(
        &from,
        &env.current_contract_address(),
        &amount,
    );

    // Add denomination to list if not already present
    add_denomination(&env, &denomination);

    // Insert commitment into Merkle tree for this denomination
    let denom_value = denomination.to_u32();
    let (leaf_index, new_root) = merkle::insert(&env, denom_value, commitment.clone())?;

    // Emit deposit event (no depositor address for privacy)
    emit_deposit(&env, commitment, leaf_index, new_root.clone(), denomination);

    Ok((leaf_index, new_root))
}

/// Add a denomination to the list of supported denominations if not already present
fn add_denomination(env: &Env, denomination: &Denomination) {
    let key = DataKey::Denominations;
    let mut denominations: Vec<Denomination> = env.storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    
    // Check if denomination is already in the list
    let mut found = false;
    for i in 0..denominations.len() {
        if denominations.get(i).unwrap() == *denomination {
            found = true;
            break;
        }
    }
    
    if !found {
        denominations.push_back(denomination.clone());
        env.storage().persistent().set(&key, &denominations);
    }
}
