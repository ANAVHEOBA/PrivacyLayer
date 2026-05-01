// ============================================================
// Validation Utilities
// ============================================================
// Common validation functions used across the contract.
// ============================================================

use soroban_sdk::{Address, BytesN, Env};

use crate::crypto::merkle;
use crate::storage::nullifier;
use crate::types::errors::Error;
use crate::types::state::{Config, PoolConfig, PoolId};

/// Validate that the pool is not paused.
pub fn require_not_paused(config: &PoolConfig) -> Result<(), Error> {
    if config.paused {
        Err(Error::PoolPaused)
    } else {
        Ok(())
    }
}

/// Validate that the caller is the global admin.
pub fn require_admin(caller: &Address, config: &Config) -> Result<(), Error> {
    if caller != &config.admin {
        Err(Error::UnauthorizedAdmin)
    } else {
        Ok(())
    }
}

/// Validate that the commitment is not zero.
pub fn require_non_zero_commitment(env: &Env, commitment: &BytesN<32>) -> Result<(), Error> {
    let zero = BytesN::from_array(env, &[0u8; 32]);
    if *commitment == zero {
        Err(Error::ZeroCommitment)
    } else {
        Ok(())
    }
}

/// Validate that the root is in the historical root buffer of a specific pool.
pub fn require_known_root(env: &Env, pool_id: &PoolId, root: &BytesN<32>) -> Result<(), Error> {
    if !merkle::is_known_root(env, pool_id, root) {
        Err(Error::UnknownRoot)
    } else {
        Ok(())
    }
}

/// Validate that the nullifier has not been spent in a specific pool.
pub fn require_nullifier_unspent(env: &Env, pool_id: &PoolId, nullifier_hash: &BytesN<32>) -> Result<(), Error> {
    if nullifier::is_spent(env, pool_id, nullifier_hash) {
        Err(Error::NullifierAlreadySpent)
    } else {
        Ok(())
    }
}

/// Decode and validate the fee from public inputs.
///
/// # Returns
/// The fee as i128
///
/// # Errors
/// Returns `Error::FeeExceedsAmount` if fee > denomination_amount
pub fn decode_and_validate_fee(
    fee_bytes: &BytesN<32>,
    denomination_amount: i128,
) -> Result<i128, Error> {
    // Fee is encoded as a big-endian field element in 32 bytes.
    // Take the last 16 bytes to decode as i128.
    let fee_array: [u8; 16] = fee_bytes.to_array()[16..]
        .try_into()
        .expect("last 16 bytes of 32-byte field element is always 16 bytes");
    
    let fee = i128::from_be_bytes(fee_array);
    
    if fee > denomination_amount {
        Err(Error::FeeExceedsAmount)
    } else {
        Ok(fee)
    }
}
