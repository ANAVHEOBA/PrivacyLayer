// ============================================================
// PrivacyLayer — Metric Types
// ============================================================
// Core metric types and definitions for monitoring system.
// ============================================================

use soroban_sdk::{Address, BytesN, Env};
use crate::types::errors::Error;

/// Metric name constants
pub mod metric_names {
    // Deposit Metrics
    pub const DEPOSIT_COUNT: &str = "privacypool_deposit_count_total";
    pub const DEPOSIT_LATENCY: &str = "privacypool_deposit_latency_seconds";
    pub const DEPOSIT_ERRORS: &str = "privacypool_deposit_errors_total";
    pub const DEPOSIT_GAS_USED: &str = "privacypool_deposit_gas_used";
    pub const DEPOSIT_AMOUNT: &str = "privacypool_deposit_amount_total";
    
    // Withdraw Metrics
    pub const WITHDRAW_COUNT: &str = "privacypool_withdraw_count_total";
    pub const WITHDRAW_LATENCY: &str = "privacypool_withdraw_latency_seconds";
    pub const WITHDRAW_ERRORS: &str = "privacypool_withdraw_errors_total";
    pub const WITHDRAW_GAS_USED: &str = "privacypool_withdraw_gas_used";
    pub const WITHDRAW_AMOUNT: &str = "privacypool_withdraw_amount_total";
    pub const WITHDRAW_FEE: &str = "privacypool_withdraw_fee_total";
    
    // ZK Proof Metrics
    pub const ZK_PROOF_VERIFICATION_TIME: &str = "privacypool_zk_proof_verification_seconds";
    pub const ZK_PROOF_SUCCESS_RATE: &str = "privacypool_zk_proof_success_rate";
    pub const ZK_PROOF_FAILURES: &str = "privacypool_zk_proof_failures_total";
    
    // Merkle Tree Metrics
    pub const MERKLE_INSERT_LATENCY: &str = "privacypool_merkle_insert_latency_seconds";
    pub const MERKLE_TREE_DEPTH: &str = "privacypool_merkle_tree_depth";
    pub const MERKLE_LEAVES_COUNT: &str = "privacypool_merkle_leaves_count";
    pub const MERKLE_ROOT_UPDATES: &str = "privacypool_merkle_root_updates_total";
    pub const MERKLE_ROOT_HISTORY_SIZE: &str = "privacypool_merkle_root_history_size";
    
    // Nullifier Metrics
    pub const NULLIFIER_CHECKS: &str = "privacypool_nullifier_checks_total";
    pub const NULLIFIER_SPENT_COUNT: &str = "privacypool_nullifier_spent_count";
    pub const NULLIFIER_DOUBLE_SPEND_ATTEMPTS: &str = "privacypool_nullifier_double_spend_attempts_total";
    
    // Pool State Metrics
    pub const POOL_BALANCE: &str = "privacypool_balance";
    pub const POOL_PAUSED: &str = "privacypool_paused";
    pub const POOL_DENOMINATION: &str = "privacypool_denomination";
    
    // System Health Metrics
    pub const CONTRACT_CALL_DURATION: &str = "privacypool_contract_call_duration_seconds";
    pub const STORAGE_READ_OPS: &str = "privacypool_storage_read_ops_total";
    pub const STORAGE_WRITE_OPS: &str = "privacypool_storage_write_ops_total";
    pub const EVENT_EMISSIONS: &str = "privacypool_events_emitted_total";
    
    // Security Metrics
    pub const ADMIN_OPERATIONS: &str = "privacypool_admin_operations_total";
    pub const UNAUTHORIZED_ACCESS_ATTEMPTS: &str = "privacypool_unauthorized_access_attempts_total";
    pub const ROOT_VALIDATION_FAILURES: &str = "privacypool_root_validation_failures_total";
}

/// Labels for metrics
pub mod labels {
    pub const OPERATION: &str = "operation";
    pub const STATUS: &str = "status";
    pub const ERROR_TYPE: &str = "error_type";
    pub const DENOMINATION: &str = "denomination";
    pub const ADMIN_ACTION: &str = "admin_action";
    pub const COMPONENT: &str = "component";
}

/// Metric value types
#[derive(Clone, Debug)]
pub enum MetricValue {
    Counter(u64),
    Gauge(f64),
    Histogram(f64),
}

/// A single metric measurement
#[derive(Clone, Debug)]
pub struct Metric {
    pub name: &'static str,
    pub value: MetricValue,
    pub labels: Vec<(&'static str, String)>,
    pub timestamp: u64,
}

/// Performance timing tracker
#[derive(Clone, Debug)]
pub struct PerformanceTimer {
    pub start_time: u64,
    pub operation: &'static str,
}

impl PerformanceTimer {
    pub fn new(env: &Env, operation: &'static str) -> Self {
        Self {
            start_time: env.ledger().timestamp(),
            operation,
        }
    }
    
    pub fn elapsed_ms(&self, env: &Env) -> u64 {
        let now = env.ledger().timestamp();
        if now >= self.start_time {
            (now - self.start_time) * 1000
        } else {
            0
        }
    }
    
    pub fn elapsed_seconds(&self, env: &Env) -> f64 {
        self.elapsed_ms(env) as f64 / 1000.0
    }
}

/// Operation result for metrics
#[derive(Clone, Debug)]
pub enum OperationResult {
    Success,
    Failure(Error),
}

/// Metrics snapshot for aggregation
#[derive(Clone, Debug, Default)]
pub struct MetricsSnapshot {
    // Counters
    pub deposit_count: u64,
    pub withdraw_count: u64,
    pub deposit_errors: u64,
    pub withdraw_errors: u64,
    pub zk_proof_failures: u64,
    pub double_spend_attempts: u64,
    pub unauthorized_access_attempts: u64,
    
    // Gauges
    pub current_balance: i128,
    pub merkle_leaves: u32,
    pub is_paused: bool,
    
    // Histograms (simplified as recent values)
    pub recent_deposit_latencies_ms: Vec<u64>,
    pub recent_withdraw_latencies_ms: Vec<u64>,
    pub recent_zk_verification_times_ms: Vec<u64>,
}