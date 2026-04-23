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
use crate::types::state::{PoolId};

// ──────────────────────────────────────────────────────────────
// Deposit Events
// ──────────────────────────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DepositEvent {
    pub pool_id: PoolId,
    pub commitment: BytesN<32>,
    pub leaf_index: u32,
    pub root: BytesN<32>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawEvent {
    pub pool_id: PoolId,
    pub nullifier_hash: BytesN<32>,
    pub recipient: Address,
    pub relayer: Option<Address>,
    pub fee: i128,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolPausedEvent {
    pub admin: Address,
    pub pool_id: PoolId,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolUnpausedEvent {
    pub admin: Address,
    pub pool_id: PoolId,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VkUpdatedEvent {
    pub admin: Address,
    pub pool_id: PoolId,
}

/// Emitted when a commitment is successfully inserted into the shielded pool.
pub fn emit_deposit(
    env: &Env,
    pool_id: PoolId,
    commitment: BytesN<32>,
    leaf_index: u32,
    root: BytesN<32>,
) {
    DepositEvent {
        pool_id,
        commitment,
        leaf_index,
        root,
    }.publish(env);
}

// ──────────────────────────────────────────────────────────────
// Withdrawal Events
// ──────────────────────────────────────────────────────────────

/// Emitted when a withdrawal is successfully processed.
pub fn emit_withdraw(
    env: &Env,
    pool_id: PoolId,
    nullifier_hash: BytesN<32>,
    recipient: Address,
    relayer: Option<Address>,
    fee: i128,
    amount: i128,
) {
    WithdrawEvent {
        pool_id,
        nullifier_hash,
        recipient,
        relayer,
        fee,
        amount,
    }.publish(env);
}

// ──────────────────────────────────────────────────────────────
// Admin Events
// ──────────────────────────────────────────────────────────────

/// Emitted when the pool is paused by the admin.
pub fn emit_pool_paused(env: &Env, admin: Address, pool_id: PoolId) {
    PoolPausedEvent { admin, pool_id }.publish(env);
}

/// Emitted when the pool is unpaused by the admin.
pub fn emit_pool_unpaused(env: &Env, admin: Address, pool_id: PoolId) {
    PoolUnpausedEvent { admin, pool_id }.publish(env);
}

/// Emitted when the verifying key is updated by the admin.
pub fn emit_vk_updated(env: &Env, admin: Address, pool_id: PoolId) {
    VkUpdatedEvent { admin, pool_id }.publish(env);
}
