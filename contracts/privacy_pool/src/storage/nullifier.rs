// ============================================================
// Nullifier Storage
// ============================================================
// Manages nullifier spent status to prevent double-spends.
// ============================================================

use soroban_sdk::{BytesN, Env};

use crate::types::state::{DataKey, PoolId};

/// Check if a nullifier has been spent in a specific pool.
pub fn is_spent(env: &Env, pool_id: &PoolId, nullifier_hash: &BytesN<32>) -> bool {
    let key = DataKey::Nullifier(pool_id.clone(), nullifier_hash.clone());
    env.storage().persistent().has(&key)
}

/// Mark a nullifier as spent in a specific pool.
pub fn mark_spent(env: &Env, pool_id: &PoolId, nullifier_hash: &BytesN<32>) {
    let key = DataKey::Nullifier(pool_id.clone(), nullifier_hash.clone());
    env.storage().persistent().set(&key, &true);
}
