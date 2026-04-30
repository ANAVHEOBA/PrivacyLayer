// ============================================================
// Withdrawal Logic
// ============================================================
// ZK-073: Relayer binding is unified through address_decoder's
// validate_relayer_fee_binding, which enforces the three-mode
// contract:
//   Mode 1: No relayer (relayer=0, fee=0)
//   Mode 2: Relayer + fee (relayer≠0, fee>0)
//   Mode 3: Malformed → REJECTED
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
        return Err(Error::InvalidPoolId);
    }
    if pub_inputs.denomination != pool_config.denomination.encode_as_field(&env) {
        return Err(Error::InvalidDenomination);
    }

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

    // Step 6: Decode addresses (ZK-073 unified relayer binding)
    let recipient = address_decoder::decode_address(&env, &pub_inputs.recipient);
    let relayer_opt = address_decoder::decode_optional_relayer(&env, &pub_inputs.relayer)?;

    // Step 6.5: ZK-073 — Validate relayer/fee binding at contract level
    // This catches orphan fees (fee>0 but no relayer) and phantom relayers
    // (relayer present but fee=0) that might bypass circuit checks.
    address_decoder::validate_relayer_fee_binding(&relayer_opt, fee)?;

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
    analytics::record_withdraw_success(&env);

    Ok(true)
}

/// Transfer funds from the pool to recipient and optional relayer.
fn transfer_funds(
    env: &Env,
    token_id: &Address,
    recipient: &Address,
    relayer_opt: Option<&Address>,
    amount: i128,
    fee: i128,
) {
    let token_client = token::Client::new(env, token_id);

    // Transfer fee to relayer first (if present — ZK-073 Mode 2)
    if let Some(relayer) = relayer_opt {
        // fee > 0 is guaranteed by validate_relayer_fee_binding
        token_client.transfer(&env::current_contract_address(), relayer, &fee);
    }
    // If no relayer (Mode 1), fee is guaranteed to be 0, so no fee transfer needed.

    // Transfer remaining amount to recipient
    let recipient_amount = amount - fee;
    token_client.transfer(&env::current_contract_address(), recipient, &recipient_amount);
}

// Re-export for convenience
use soroban_sdk::env::current_contract_address;

// ============================================================
// Tests — ZK-073 relayer binding regression tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Test: Mode 1 binding validation (no relayer, fee=0) — passes
    #[test]
    fn test_relayer_fee_binding_no_relayer_zero_fee() {
        let result = address_decoder::validate_relayer_fee_binding(&None, 0);
        assert!(result.is_ok());
    }

    /// Test: Mode 1 violation — no relayer but fee > 0 (orphan fee)
    #[test]
    fn test_relayer_fee_binding_no_relayer_nonzero_fee_rejected() {
        let result = address_decoder::validate_relayer_fee_binding(&None, 100);
        assert_eq!(result, Err(Error::InvalidRelayerFee));
    }

    /// Test: Mode 2 violation — relayer present but fee = 0 (phantom relayer)
    #[test]
    fn test_relayer_fee_binding_relayer_zero_fee_rejected() {
        let env = Env::default();
        let addr = Address::generate(&env);
        let result = address_decoder::validate_relayer_fee_binding(&Some(addr), 0);
        assert_eq!(result, Err(Error::InvalidRelayerFee));
    }

    /// Test: Mode 2 binding validation (relayer + fee) — passes
    #[test]
    fn test_relayer_fee_binding_relayer_nonzero_fee() {
        let env = Env::default();
        let addr = Address::generate(&env);
        let result = address_decoder::validate_relayer_fee_binding(&Some(addr), 50);
        assert!(result.is_ok());
    }
}
