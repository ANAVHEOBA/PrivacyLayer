// ============================================================
// PrivacyLayer — Contract Events
// ============================================================
// All events emitted by the privacy pool contract.
// Follows soroban-sdk event pattern recommended by SDF.
//
// Events intentionally reveal MINIMAL information to preserve privacy:
//   - Deposits: emit only commitment + leaf_index (no depositor address)
//   - Withdrawals: emit only nullifier_hash + recipient (no link to deposit)
// ============================================================

use soroban_sdk::{contractevent, Address, BytesN, Env};

// ──────────────────────────────────────────────────────────────
// Deposit Events
// ──────────────────────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositEvent {
    pub commitment: BytesN<32>,
    pub leaf_index: u32,
    pub root: BytesN<32>,
    pub denomination: Denomination,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawEvent {
    pub nullifier_hash: BytesN<32>,
    pub recipient: Address,
    pub relayer: Option<Address>,
    pub fee: i128,
    pub amount: i128,
    pub denomination: Denomination,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolPausedEvent {
    pub admin: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolUnpausedEvent {
    pub admin: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VkUpdatedEvent {
    pub admin: Address,
}

/// Emitted when a commitment is successfully inserted into the shielded pool.
///
/// The SDK client uses this event to sync the local Merkle tree,
/// which is required to generate Merkle inclusion proofs for withdrawal.
///
/// # Privacy notes
/// - `commitment` is public (required to build the Merkle tree)
/// - The depositor address is NOT included (would break privacy)
/// - The amount is NOT included (fixed denomination, trivially known)
pub fn emit_deposit(
    env: &Env,
    commitment: BytesN<32>,
    leaf_index: u32,
    root: BytesN<32>,
    denomination: Denomination,
) {
    DepositEvent {
        commitment,
        leaf_index,
        root,
        denomination,
    }.publish(env);
}

// ──────────────────────────────────────────────────────────────
// Withdrawal Events
// ──────────────────────────────────────────────────────────────

/// Emitted when a withdrawal is successfully processed.
///
/// # Privacy notes
/// - `nullifier_hash` is public (required to detect double-spends off-chain)
/// - `recipient` is public (the funds go there — unavoidable)
/// - `relayer` is public (earned fee — unavoidable)
/// - NOTE: There is no on-chain link between this nullifier_hash
///   and any specific deposit commitment
pub fn emit_withdraw(
    env: &Env,
    nullifier_hash: BytesN<32>,
    recipient: Address,
    relayer: Option<Address>,
    fee: i128,
    amount: i128,
    denomination: Denomination,
) {
    WithdrawEvent {
        nullifier_hash,
        recipient,
        relayer,
        fee,
        amount,
        denomination,
    }.publish(env);
}

// ──────────────────────────────────────────────────────────────
// Admin Events
// ──────────────────────────────────────────────────────────────

/// Emitted when the pool is paused by the admin.
pub fn emit_pool_paused(env: &Env, admin: Address) {
    PoolPausedEvent { admin }.publish(env);
}

/// Emitted when the pool is unpaused by the admin.
pub fn emit_pool_unpaused(env: &Env, admin: Address) {
    PoolUnpausedEvent { admin }.publish(env);
}

/// Emitted when the verifying key is updated by the admin.
/// This is a critical operation — must be carefully audited.
pub fn emit_vk_updated(env: &Env, admin: Address) {
    VkUpdatedEvent { admin }.publish(env);
}
