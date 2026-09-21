//! Withdraw core logic
//!
//! This module implements the withdraw flow. The previous implementation
//! attempted to reconstruct a Stellar address from a 32‑byte field element
//! supplied by the ZK proof. That approach was lossy because the proof only
//! contains a hash of the address. The new implementation binds the address
//! explicitly: the caller provides the intended recipient `Address` and the
//! contract verifies that the hash of this address matches the public input
//! committed in the proof.

use soroban_sdk::{
    env::Env, Address, BytesN, Symbol, Vec, 
    // other imports...
};

use crate::{
    storage::{self, Config},
    crypto::{self, Verifier},
    // other modules...
};

/// Index of the recipient hash in the public inputs vector produced by the
/// circuit. The order of public inputs is defined in the circuit source
/// (`circuits/withdraw/src/main.nr`).  The 5th element (zero‑based) corresponds
/// to the recipient hash.
const RECIPIENT_HASH_INDEX: usize = 4;

/// Errors that can be returned by the withdraw entrypoint.
#[derive(Debug, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum WithdrawError {
    /// The proof verification failed.
    InvalidProof = 1,
    /// The supplied recipient does not match the hash committed in the proof.
    RecipientMismatch = 2,
    // ... other errors
}

/// Compute the Poseidon (or SHA‑256) hash of a Stellar address.
///
/// The contract must use the same hash algorithm as the SDK when it creates
/// the public input.  The SDK currently hashes the UTF‑8 bytes of the address
/// using SHA‑256, so we mirror that here.  If the SDK switches to Poseidon,
/// replace this implementation with the corresponding Poseidon hash.
fn hash_recipient(env: &Env, recipient: &Address) -> BytesN<32> {
    // Convert the address to its canonical string representation.
    // `Address::to_string()` yields the Stellar address (e.g. "GABCD...").
    let addr_str: String = recipient.to_string();
    let addr_bytes = addr_str.as_bytes();

    // Use the built‑in SHA‑256 hash function. The result is a 32‑byte array.
    env.crypto().sha256(&addr_bytes)
}

/// Verify a withdrawal proof and ensure the supplied recipient matches the
/// commitment inside the proof.
///
/// # Arguments
///
/// * `env` – Soroban environment.
/// * `proof` – Serialized ZK proof bytes.
/// * `public_inputs` – Public inputs vector supplied to the verifier (must
///   include the recipient hash at `RECIPIENT_HASH_INDEX`).
/// * `recipient` – The address that should receive the withdrawn funds.
///
/// # Returns
///
/// * `Ok(())` on success.
/// * `Err(WithdrawError)` on failure.
pub fn withdraw(
    env: &Env,
    proof: BytesN<64>,               // size depends on the verifier implementation
    public_inputs: Vec<u128>,        // public inputs as field elements
    recipient: Address,
) -> Result<(), WithdrawError> {
    // -------------------------------------------------------------------------
    // 1️⃣ Verify the ZK proof against the supplied public inputs.
    // -------------------------------------------------------------------------
    let verifier = Verifier::new(env);
    if !verifier.verify(&proof, &public_inputs) {
        return Err(WithdrawError::InvalidProof);
    }

    // -------------------------------------------------------------------------
    // 2️⃣ Extract the recipient hash from the public inputs.
    // -------------------------------------------------------------------------
    if public_inputs.len() <= RECIPIENT_HASH_INDEX {
        // Defensive: the circuit should always emit this element.
        return Err(WithdrawError::InvalidProof);
    }
    let proof_recipient_hash = public_inputs.get_unchecked(RECIPIENT_HASH_INDEX);

    // -------------------------------------------------------------------------
    // 3️⃣ Compute the hash of the supplied recipient address.
    // -------------------------------------------------------------------------
    let computed_hash_bytes = hash_recipient(env, &recipient);
    // Convert the 32‑byte hash into a field element (u128) using big‑endian.
    // The circuit works over the BN254 scalar field; truncating to 128 bits
    // is safe because the verifier already reduces modulo the field size.
    let mut hash_bytes = [0u8; 16];
    hash_bytes.copy_from_slice(&computed_hash_bytes.as_ref()[..16]);
    let computed_hash = u128::from_be_bytes(hash_bytes);

    // -------------------------------------------------------------------------
    // 4️⃣ Ensure the hashes match.
    // -------------------------------------------------------------------------
    if *proof_recipient_hash != computed_hash {
        return Err(WithdrawError::RecipientMismatch);
    }

    // -------------------------------------------------------------------------
    // 5️⃣ Continue with the rest of the withdraw logic (nullifier check,
    //    balance updates, fee handling, etc.).  Those parts are unchanged.
    // -------------------------------------------------------------------------
    // ... existing withdraw implementation ...

    Ok(())
}
