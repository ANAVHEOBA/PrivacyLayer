//! Main contract definition.

#![no_std]

use soroban_sdk::{contractimpl, Env, Symbol};

mod core;
mod crypto;
mod storage;
mod test;
mod utils;

// Export the contract's public interface.
pub struct Contract;

#[contractimpl]
impl Contract {
    // Existing entrypoints (initialize, deposit, etc.) ...

    /// Withdraw funds from the pool.
    ///
    /// Parameters:
    /// * `proof` – Serialized ZK proof.
    /// * `public_inputs` – Public inputs vector (including recipient hash).
    /// * `recipient` – The Stellar address that should receive the funds.
    pub fn withdraw(
        env: Env,
        proof: soroban_sdk::BytesN<64>,
        public_inputs: soroban_sdk::Vec<u128>,
        recipient: soroban_sdk::Address,
    ) -> Result<(), u32> {
        // Map contract‑level errors to `u32` error codes expected by the SDK.
        super::core::withdraw::withdraw(&env, proof, public_inputs, recipient)
            .map_err(|e| e as u32)
    }
}
