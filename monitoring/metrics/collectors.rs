// ============================================================
// PrivacyLayer — Metrics Collectors
// ============================================================
// Collectors for gathering metrics from various components.
// ============================================================

use soroban_sdk::{Address, BytesN, Env};
use crate::types::errors::Error;
use crate::types::state::{Proof, PublicInputs};
use super::types::*;

/// Metrics collector trait
pub trait MetricsCollector {
    fn collect(&self, env: &Env) -> Vec<Metric>;
}

/// Deposit operation metrics collector
pub struct DepositMetricsCollector;

impl DepositMetricsCollector {
    /// Record a successful deposit
    pub fn record_success(
        env: &Env,
        timer: &PerformanceTimer,
        leaf_index: u32,
        amount: i128,
    ) {
        let latency = timer.elapsed_seconds(env);
        
        // In production, these would be emitted as events or stored
        // For now, we emit a diagnostic event
        soroban_sdk::log!(
            env,
            "METRIC: operation=deposit, status=success, latency={}s, leaf_index={}, amount={}",
            latency, leaf_index, amount
        );
    }
    
    /// Record a failed deposit
    pub fn record_failure(env: &Env, timer: &PerformanceTimer, error: Error) {
        let latency = timer.elapsed_seconds(env);
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=deposit, status=failure, latency={}s, error={:?}",
            latency, error
        );
    }
}

/// Withdraw operation metrics collector
pub struct WithdrawMetricsCollector;

impl WithdrawMetricsCollector {
    /// Record a successful withdrawal
    pub fn record_success(
        env: &Env,
        timer: &PerformanceTimer,
        fee: i128,
        amount: i128,
    ) {
        let latency = timer.elapsed_seconds(env);
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=withdraw, status=success, latency={}s, fee={}, amount={}",
            latency, fee, amount
        );
    }
    
    /// Record a failed withdrawal
    pub fn record_failure(env: &Env, timer: &PerformanceTimer, error: Error) {
        let latency = timer.elapsed_seconds(env);
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=withdraw, status=failure, latency={}s, error={:?}",
            latency, error
        );
    }
}

/// ZK Proof metrics collector
pub struct ZkProofMetricsCollector;

impl ZkProofMetricsCollector {
    /// Record proof verification result
    pub fn record_verification(
        env: &Env,
        verification_time_ms: u64,
        success: bool,
    ) {
        let status = if success { "success" } else { "failure" };
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=zk_verify, status={}, time_ms={}",
            status, verification_time_ms
        );
    }
}

/// Merkle tree metrics collector
pub struct MerkleMetricsCollector;

impl MerkleMetricsCollector {
    /// Record merkle insert operation
    pub fn record_insert(
        env: &Env,
        insert_time_ms: u64,
        leaf_index: u32,
        tree_depth: u32,
    ) {
        soroban_sdk::log!(
            env,
            "METRIC: operation=merkle_insert, time_ms={}, leaf_index={}, depth={}",
            insert_time_ms, leaf_index, tree_depth
        );
    }
    
    /// Record root validation
    pub fn record_root_validation(env: &Env, is_known: bool) {
        let status = if is_known { "known" } else { "unknown" };
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=root_validation, status={}",
            status
        );
    }
}

/// Pool state metrics collector
pub struct PoolStateMetricsCollector;

impl PoolStateMetricsCollector {
    /// Record pool state
    pub fn record_state(
        env: &Env,
        balance: i128,
        leaves_count: u32,
        is_paused: bool,
    ) {
        soroban_sdk::log!(
            env,
            "METRIC: pool_state balance={} leaves={} paused={}",
            balance, leaves_count, is_paused
        );
    }
}

/// Admin operation metrics collector
pub struct AdminMetricsCollector;

impl AdminMetricsCollector {
    /// Record admin operation
    pub fn record_operation(env: &Env, operation: &str, success: bool) {
        let status = if success { "success" } else { "failure" };
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=admin, action={}, status={}",
            operation, status
        );
    }
    
    /// Record unauthorized access attempt
    pub fn record_unauthorized(env: &Env, operation: &str) {
        soroban_sdk::log!(
            env,
            "METRIC: operation=unauthorized_access, action={}",
            operation
        );
    }
}

/// Security metrics collector
pub struct SecurityMetricsCollector;

impl SecurityMetricsCollector {
    /// Record nullifier check
    pub fn record_nullifier_check(env: &Env, is_spent: bool) {
        let status = if is_spent { "spent" } else { "unspent" };
        
        soroban_sdk::log!(
            env,
            "METRIC: operation=nullifier_check, status={}",
            status
        );
    }
    
    /// Record double spend attempt
    pub fn record_double_spend_attempt(env: &Env) {
        soroban_sdk::log!(
            env,
            "METRIC: operation=double_spend_attempt, count=1"
        );
    }
}