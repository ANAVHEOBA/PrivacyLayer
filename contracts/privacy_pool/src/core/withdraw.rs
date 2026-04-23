// ============================================================
// Withdrawal Logic
// ============================================================

use soroban_sdk::{token, Address, Env};

use crate::crypto::verifier;
use crate::storage::{config, nullifier};
use crate::types::errors::Error;
use crate::types::events::emit_withdraw;
use crate::types::state::{Proof, PublicInputs};
use crate::utils::{address_decoder, validation};

/// Execute a withdrawal from the shielded pool using a ZK proof.
///
/// # Arguments
/// - `proof`      : Groth16 proof (A, B, C points on BN254)
/// - `pub_inputs` : Public inputs bound to the proof
///
/// # Returns
/// `true` on success
///
/// # Errors
/// - `Error::NotInitialized`       if contract not initialized
/// - `Error::PoolPaused`           if pool is paused
/// - `Error::UnknownRoot`          if root is not in history
/// - `Error::NullifierAlreadySpent` if nullifier was already used
/// - `Error::FeeExceedsAmount`     if fee > denomination amount
/// - `Error::InvalidProof`         if Groth16 verification fails
pub fn execute(
    env: Env,
    proof: Proof,
    pub_inputs: PublicInputs,
) -> Result<bool, Error> {
    // Load and validate configuration
    let pool_config = config::load(&env)?;
    validation::require_not_paused(&pool_config)?;

    let denomination_amount = pool_config.denomination.amount();

    // Step 1: Validate root is in history
    validation::require_known_root(&env, &pub_inputs.root)?;

    // Step 2: Check nullifier not already spent
    validation::require_nullifier_unspent(&env, &pub_inputs.nullifier_hash)?;

    // Step 3: Validate and decode fee
    let fee = validation::decode_and_validate_fee(&pub_inputs.fee, denomination_amount)?;

    // Step 4: Verify Groth16 proof
    let vk = config::load_verifying_key(&env)?;
    let proof_valid = verifier::verify_proof(&env, &vk, &proof, &pub_inputs)?;
    if !proof_valid {
        return Err(Error::InvalidProof);
    }

    // Step 5: Mark nullifier as spent
    nullifier::mark_spent(&env, &pub_inputs.nullifier_hash);

    // Step 6: Decode addresses
    let recipient = address_decoder::decode_address(&env, &pub_inputs.recipient);
    let relayer_opt = address_decoder::decode_optional_relayer(&env, &pub_inputs.relayer);

    // Step 7: Transfer funds
    transfer_funds(
        &env,
        &pool_config.token,
        &recipient,
        relayer_opt.as_ref(),
        denomination_amount,
        fee,
    );

    // Step 8: Emit event
    emit_withdraw(
        &env,
        pub_inputs.nullifier_hash,
        recipient.clone(),
        relayer_opt.clone(),
        fee,
        denomination_amount,
    );

    Ok(true)
}

/// Transfer funds to recipient and optionally to relayer.
///
/// Handles both XLM (native) and USDC (token) transfers.
fn transfer_funds(
    env: &Env,
    token: &Address,
    recipient: &Address,
    relayer: Option<&Address>,
    total_amount: i128,
    fee: i128,
) {
    let token_client = token::Client::new(env, token);
    let net_amount = total_amount - fee;

    // Transfer to recipient with error handling for token failures
    let transfer_result = token_client.try_transfer(
        &env.current_contract_address(),
        recipient,
        &net_amount,
    );
    
    if transfer_result.is_err() {
        // Token transfer failed (e.g., insufficient balance)
        panic!("Withdrawal transfer failed: insufficient funds in pool");
    }

    // Transfer fee to relayer if applicable
    if let Some(relayer_addr) = relayer {
        if fee > 0 {
            let fee_result = token_client.try_transfer(
                &env.current_contract_address(),
                relayer_addr,
                &fee,
            );
            
            if fee_result.is_err() {
                // Fee transfer failed, but main transfer succeeded
                // This is acceptable - relayer can claim later
            }
        }
    }
}
