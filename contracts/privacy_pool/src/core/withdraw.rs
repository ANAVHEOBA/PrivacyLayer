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
    env: Env,
    pool_id: PoolId,
    proof: Proof,
    pub_inputs: PublicInputs,
    recipient: Address,
    relayer: Option<Address>,
) -> Result<bool, Error> {
    let pool_config = config::load_pool_config(&env, &pool_id)?;
    validation::require_not_paused(&pool_config)?;

    let denomination_amount = pool_config.denomination.amount();

    validation::require_known_root(&env, &pool_id, &pub_inputs.root)?;
    validation::require_nullifier_unspent(&env, &pool_id, &pub_inputs.nullifier_hash)?;

    if pub_inputs.pool_id != pool_id.0 {
        return Err(Error::InvalidPoolId);
    }
    if pub_inputs.denomination != pool_config.denomination.encode_as_field(&env) {
        return Err(Error::InvalidDenomination);
    }

    let fee = validation::decode_and_validate_fee(&pub_inputs.fee, denomination_amount)?;

    address_decoder::verify_recipient_binding(&env, &recipient, &pub_inputs.recipient)?;
    address_decoder::verify_relayer_binding(&env, relayer.as_ref(), &pub_inputs.relayer)?;

    let vk = config::load_verifying_key(&env, &pool_id)?;
    let proof_valid = verifier::verify_proof(&env, &vk, &proof, &pub_inputs)?;
    if !proof_valid {
        return Err(Error::InvalidProof);
    }

    nullifier::mark_spent(&env, &pool_id, &pub_inputs.nullifier_hash);

    transfer_funds(
        &env,
        &pool_config.token,
        &recipient,
        relayer.as_ref(),
        denomination_amount,
        fee,
    );

    emit_withdraw(
        &env,
        pool_id,
        pub_inputs.nullifier_hash,
        recipient,
        relayer,
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
