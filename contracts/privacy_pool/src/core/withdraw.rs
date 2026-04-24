// ============================================================
// Withdrawal Logic
// ============================================================

use soroban_sdk::{token, Address, Env};

use crate::crypto::verifier;
use crate::storage::{config, nullifier};
use crate::types::errors::Error;
use crate::types::events::emit_withdraw;
use crate::types::state::{PoolId, Proof, PublicInputs};
use crate::utils::{address_decoder, validation};

/// Execute a withdrawal from a specific shielded pool using a ZK proof.
pub fn execute(
    env: Env,
    pool_id: PoolId,
    proof: Proof,
    pub_inputs: PublicInputs,
) -> Result<bool, Error> {
    // Load and validate pool configuration
    let pool_config = config::load_pool_config(&env, &pool_id)?;
    validation::require_not_paused(&pool_config)?;

    let denomination_amount = pool_config.denomination.amount();

    // Step 1: Validate root is in pool history
    validation::require_known_root(&env, &pool_id, &pub_inputs.root)?;

    // Step 2: Check nullifier not already spent in this pool
    validation::require_nullifier_unspent(&env, &pool_id, &pub_inputs.nullifier_hash)?;

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
        pool_id,
        pub_inputs.nullifier_hash,
        recipient.clone(),
        relayer_opt.clone(),
        fee,
        denomination_amount,
    );

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
