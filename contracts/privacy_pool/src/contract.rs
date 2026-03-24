// ============================================================
// Contract Interface - Public API
// ============================================================
// This module defines the contract struct and delegates to core modules.
// Keeps the interface clean and focused on orchestration.
// ============================================================

use soroban_sdk::{contract, contractimpl, Address, BytesN, Env};

use crate::core::{admin, deposit, initialize, view, withdraw};
use crate::types::errors::Error;
use crate::types::state::{Denomination, PoolConfig, Proof, PublicInputs, VerifyingKey};

#[contract]
pub struct PrivacyPool;

#[contractimpl]
impl PrivacyPool {
    // ──────────────────────────────────────────────────────────
    // Initialization
    // ──────────────────────────────────────────────────────────

    /// Initialize the privacy pool.
    ///
    /// Must be called once before any deposits or withdrawals.
    /// Sets the admin, token, denomination, and verifying key.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        denomination: Denomination,
        vk: VerifyingKey,
    ) -> Result<(), Error> {
        initialize::execute(env, admin, token, denomination, vk)
    }

    // ──────────────────────────────────────────────────────────
    // Core Operations
    // ──────────────────────────────────────────────────────────

    /// Deposit into the shielded pool.
    ///
    /// Transfers denomination amount and inserts commitment into Merkle tree.
    pub fn deposit(
        env: Env,
        from: Address,
        commitment: BytesN<32>,
    ) -> Result<(u32, BytesN<32>), Error> {
        deposit::execute(env, from, commitment)
    }

    /// Withdraw from the shielded pool using a ZK proof.
    ///
    /// Verifies proof and transfers funds to recipient.
    pub fn withdraw(
        env: Env,
        proof: Proof,
        pub_inputs: PublicInputs,
    ) -> Result<bool, Error> {
        withdraw::execute(env, proof, pub_inputs)
    }

    // ──────────────────────────────────────────────────────────
    // View Functions
    // ──────────────────────────────────────────────────────────

    /// Returns the current Merkle root (most recent).
    pub fn get_root(env: Env) -> Result<BytesN<32>, Error> {
        view::get_root(env)
    }

    /// Returns the total number of deposits.
    pub fn deposit_count(env: Env) -> u32 {
        view::deposit_count(env)
    }

    /// Check if a root is in the historical root buffer.
    pub fn is_known_root(env: Env, root: BytesN<32>) -> bool {
        view::is_known_root(env, root)
    }

    /// Check if a nullifier has been spent.
    pub fn is_spent(env: Env, nullifier_hash: BytesN<32>) -> bool {
        view::is_spent(env, nullifier_hash)
    }

    /// Returns the pool configuration.
    pub fn get_config_view(env: Env) -> Result<PoolConfig, Error> {
        view::get_config(env)
    }

    // ──────────────────────────────────────────────────────────
    // Admin Functions
    // ──────────────────────────────────────────────────────────

    /// Pause the pool (admin only).
    /// Stores pause reason and timestamp for audit trail.
    pub fn pause(env: Env, admin: Address, pause_reason: soroban_sdk::String) -> Result<(), Error> {
        admin::pause(env, admin, pause_reason)
    }

    /// Unpause the pool (admin only).
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin::unpause(env, admin)
    }

    /// Check if the pool is paused.
    /// Returns (is_paused, Option<PauseInfo>) with audit trail.
    pub fn is_paused(env: Env) -> Result<(bool, Option<crate::types::state::PauseInfo>), Error> {
        admin::is_paused(env)
    }

    /// Emergency withdraw - admin can recover funds during security incidents.
    /// Pool MUST be paused before calling.
    pub fn emergency_withdraw(
        env: Env,
        admin: Address,
        recipient: Address,
        amount: i128,
        reason: soroban_sdk::String,
    ) -> Result<(), Error> {
        admin::emergency_withdraw(env, admin, recipient, amount, reason)
    }

    /// Update the Groth16 verifying key (admin only).
    pub fn set_verifying_key(
        env: Env,
        admin: Address,
        new_vk: VerifyingKey,
    ) -> Result<(), Error> {
        admin::set_verifying_key(env, admin, new_vk)
    }
}
