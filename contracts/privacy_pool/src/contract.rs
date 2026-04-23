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

    /// Initialize the global privacy pool contract.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        initialize::initialize(env, admin)
    }

    /// Create a new shielded pool for a specific token and denomination.
    pub fn create_pool(
        env: Env,
        pool_id: PoolId,
        token: Address,
        denomination: Denomination,
        vk: VerifyingKey,
    ) -> Result<(), Error> {
        initialize::create_pool(env, pool_id, token, denomination, vk)
    }

    // ──────────────────────────────────────────────────────────
    // Core Operations
    // ──────────────────────────────────────────────────────────

    /// Deposit into a specific shielded pool.
    pub fn deposit(
        env: Env,
        pool_id: PoolId,
        from: Address,
        commitment: BytesN<32>,
    ) -> Result<(u32, BytesN<32>), Error> {
        deposit::execute(env, pool_id, from, commitment)
    }

    /// Withdraw from a specific shielded pool using a ZK proof.
    pub fn withdraw(
        env: Env,
        pool_id: PoolId,
        proof: Proof,
        pub_inputs: PublicInputs,
    ) -> Result<bool, Error> {
        withdraw::execute(env, pool_id, proof, pub_inputs)
    }

    // ──────────────────────────────────────────────────────────
    // View Functions
    // ──────────────────────────────────────────────────────────

    /// Returns the current Merkle root for a specific pool.
    pub fn get_root(env: Env, pool_id: PoolId) -> Result<BytesN<32>, Error> {
        view::get_root(env, pool_id)
    }

    /// Returns the total number of deposits for a specific pool.
    pub fn deposit_count(env: Env, pool_id: PoolId) -> Result<u32, Error> {
        view::deposit_count(env, pool_id)
    }

    /// Check if a root is in the historical root buffer of a specific pool.
    pub fn is_known_root(env: Env, pool_id: PoolId, root: BytesN<32>) -> bool {
        view::is_known_root(env, pool_id, root)
    }

    /// Check if a nullifier has been spent in a specific pool.
    pub fn is_spent(env: Env, pool_id: PoolId, nullifier_hash: BytesN<32>) -> bool {
        view::is_spent(env, pool_id, nullifier_hash)
    }

    /// Returns the configuration for a specific pool.
    pub fn get_pool_config(env: Env, pool_id: PoolId) -> Result<PoolConfig, Error> {
        view::get_pool_config(env, pool_id)
    }

    /// Returns the global contract configuration.
    pub fn get_global_config(env: Env) -> Result<crate::types::state::Config, Error> {
        view::get_global_config(env)
    }

    // ──────────────────────────────────────────────────────────
    // Admin Functions
    // ──────────────────────────────────────────────────────────

    /// Pause a specific pool (admin only).
    pub fn pause(env: Env, admin: Address, pool_id: PoolId) -> Result<(), Error> {
        admin::pause(env, admin, pool_id)
    }

    /// Unpause a specific pool (admin only).
    pub fn unpause(env: Env, admin: Address, pool_id: PoolId) -> Result<(), Error> {
        admin::unpause(env, admin, pool_id)
    }

    /// Update the Groth16 verifying key for a specific pool (admin only).
    pub fn set_verifying_key(
        env: Env,
        admin: Address,
        pool_id: PoolId,
        new_vk: VerifyingKey,
    ) -> Result<(), Error> {
        admin::set_verifying_key(env, admin, pool_id, new_vk)
    }
}
