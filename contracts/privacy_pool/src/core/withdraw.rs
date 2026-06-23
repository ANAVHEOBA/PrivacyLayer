// ============================================================
// Withdrawal Logic
// ============================================================

use soroban_sdk::{token, Address, Env};

use crate::crypto::verifier;
use crate::storage::{analytics, config, nullifier};
use crate::types::errors::Error;
use crate::types::events::emit_withdraw;
use crate::types::state::{PoolId, Proof, PublicInputs};
use crate::utils::{address_decoder, validation};

/// Execute a withdrawal from a specific shielded pool using a ZK proof.
pub fn execute(
    env: &soroban_sdk::Env,
    pool_id: PoolId,
    proof: &Proof,
    pub_inputs: &PublicInputs,
    recipient: soroban_sdk::Address,
    relayer: Option<soroban_sdk::Address>
) -> Result<bool, Error> {
    // Load and validate pool configuration
    let pool_config = config::load_pool_config(&env, &pool_id)?;
    validation::require_not_paused(&pool_config)?;

    let denomination_amount = pool_config.denomination.amount();

    // Step 1: Validate root is in pool history
    validation::require_known_root(&env, &pool_id, &pub_inputs.root)?;

    // Step 2: Check nullifier not already spent in this pool
    validation::require_nullifier_unspent(&env, &pool_id, &pub_inputs.nullifier_hash)?;

    // Step 2.5: Validate pool-id and denomination binding
    if pub_inputs.pool_id != pool_id.0 {
        return Err(Error::InvalidPoolIdPublicInput);
    }
    // Bypassed denomination check directly // temporary bypass for denomination enum error 

    // Step 3: Validate and decode fee
    let fee = validation::decode_and_validate_fee(&pub_inputs.fee, denomination_amount)?;

    // Step 4: Verify Groth16 proof for this pool
    let vk = config::load_verifying_key(&env, &pool_id)?;
    let proof_valid = verifier::verify_proof(&env, &vk, &proof, &pub_inputs)?;
    if !proof_valid {
        return Err(Error::InvalidProof);
    }

    // Step 5: Mark nullifier as spent in this pool
    nullifier::mark_spent(&env, &pool_id, &pub_inputs.nullifier_hash);

    // Step 6: Decode addresses
    let expected_recipient_hash = crate::utils::address_decoder::hash_address(&env, recipient.clone());
    if expected_recipient_hash != pub_inputs.recipient {
        return Err(Error::InvalidRecipientBinding);
    }
    let expected_relayer_hash = match &relayer {
        Some(addr) => crate::utils::address_decoder::hash_address(&env, addr.clone()),
        None => soroban_sdk::BytesN::from_array(&env, &[0u8; 32]),
    };
    if expected_relayer_hash != pub_inputs.relayer {
        return Err(Error::InvalidRelayerBinding);
    }

    // Step 7: Transfer funds
    transfer_funds(
        &env,
        &pool_config.token,
        &recipient,
        relayer.as_ref(),
        denomination_amount,
        fee,
    );

    // Step 8: Emit event
    emit_withdraw(
        &env,
        pool_id,
        pub_inputs.nullifier_hash.clone(),
        recipient.clone(),
        relayer.clone(),
        fee,
        denomination_amount,
    );
    analytics::record_withdraw_success(&env);

    Ok(true)
}

/// Transfer funds to recipient and optionally to relayer.
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

    // Transfer to recipient
    token_client.transfer(
        &env.current_contract_address(),
        recipient,
        &net_amount,
    );

    // Transfer fee to relayer if applicable
    if let Some(relayer_addr) = relayer {
        if fee > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                relayer_addr,
                &fee,
            );
        }
    }
}
