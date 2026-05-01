// ============================================================
// Analytics Storage
// ============================================================
// Privacy-preserving analytics:
// - No user identifiers
// - No IP or cookie data
// - Aggregate counters only
// ============================================================

use soroban_sdk::{Env, Vec};

use crate::types::state::{
    AnalyticsBucket, AnalyticsSnapshot, AnalyticsState, DataKey, PerformanceMetricKind,
};

/// Keep one week of hourly buckets (168 points) in a fixed-size ring buffer.
pub const ANALYTICS_HISTORY_HOURS: u32 = 168;
/// Number of hourly points returned in dashboard snapshots.
pub const SNAPSHOT_WINDOW_HOURS: u32 = 24;

/// Initialize aggregate analytics storage.
pub fn initialize(env: &Env) {
    env.storage()
        .persistent()
        .set(&DataKey::AnalyticsState, &AnalyticsState::default());
}

fn now_hour(env: &Env) -> u64 {
    env.ledger().timestamp() / 3600
}

fn load_state(env: &Env) -> AnalyticsState {
    env.storage()
        .persistent()
        .get(&DataKey::AnalyticsState)
        .unwrap_or_default()
}

fn save_state(env: &Env, state: &AnalyticsState) {
    env.storage().persistent().set(&DataKey::AnalyticsState, state);
}

fn slot_for_hour(hour_epoch: u64) -> u32 {
    (hour_epoch % ANALYTICS_HISTORY_HOURS as u64) as u32
}

fn load_bucket_at_hour(env: &Env, hour_epoch: u64) -> AnalyticsBucket {
    let key = DataKey::AnalyticsBucket(slot_for_hour(hour_epoch));
    let maybe_bucket: Option<AnalyticsBucket> = env.storage().persistent().get(&key);
    match maybe_bucket {
        Some(bucket) if bucket.hour_epoch == hour_epoch => bucket,
        _ => AnalyticsBucket {
            hour_epoch,
            ..AnalyticsBucket::default()
        },
    }
}

fn save_bucket(env: &Env, bucket: &AnalyticsBucket) {
    let key = DataKey::AnalyticsBucket(slot_for_hour(bucket.hour_epoch));
    env.storage().persistent().set(&key, bucket);
}

pub fn record_page_view(env: &Env) {
    let mut state = load_state(env);
    state.page_views = state.page_views.saturating_add(1);
    save_state(env, &state);

    let mut bucket = load_bucket_at_hour(env, now_hour(env));
    bucket.page_views = bucket.page_views.saturating_add(1);
    save_bucket(env, &bucket);
}

pub fn record_deposit_success(env: &Env) {
    let mut state = load_state(env);
    state.successful_deposits = state.successful_deposits.saturating_add(1);
    save_state(env, &state);

    let mut bucket = load_bucket_at_hour(env, now_hour(env));
    bucket.deposits = bucket.deposits.saturating_add(1);
    save_bucket(env, &bucket);
}

pub fn record_withdraw_success(env: &Env) {
    let mut state = load_state(env);
    state.successful_withdrawals = state.successful_withdrawals.saturating_add(1);
    save_state(env, &state);

    let mut bucket = load_bucket_at_hour(env, now_hour(env));
    bucket.withdrawals = bucket.withdrawals.saturating_add(1);
    save_bucket(env, &bucket);
}

pub fn record_error(env: &Env) {
    let mut state = load_state(env);
    state.error_count = state.error_count.saturating_add(1);
    save_state(env, &state);

    let mut bucket = load_bucket_at_hour(env, now_hour(env));
    bucket.errors = bucket.errors.saturating_add(1);
    save_bucket(env, &bucket);
}

pub fn record_performance(env: &Env, kind: PerformanceMetricKind, duration_ms: u32) {
    let mut state = load_state(env);
    let duration = duration_ms as u64;
    match kind {
        PerformanceMetricKind::PageLoad => {
            state.performance.page_load_total_ms =
                state.performance.page_load_total_ms.saturating_add(duration);
            state.performance.page_load_samples =
                state.performance.page_load_samples.saturating_add(1);
        }
        PerformanceMetricKind::Deposit => {
            state.performance.deposit_total_ms =
                state.performance.deposit_total_ms.saturating_add(duration);
            state.performance.deposit_samples =
                state.performance.deposit_samples.saturating_add(1);
        }
        PerformanceMetricKind::Withdraw => {
            state.performance.withdraw_total_ms =
                state.performance.withdraw_total_ms.saturating_add(duration);
            state.performance.withdraw_samples =
                state.performance.withdraw_samples.saturating_add(1);
        }
    }
    save_state(env, &state);
}

pub fn withdrawal_count(env: &Env) -> u64 {
    load_state(env).successful_withdrawals
}

fn average(total: u64, samples: u64) -> u32 {
    if samples == 0 {
        0
    } else {
        (total / samples) as u32
    }
}

/// Build a public analytics snapshot for dashboard rendering.
pub fn snapshot(env: &Env, deposit_count: u32) -> AnalyticsSnapshot {
    let state = load_state(env);
    let total_ops = state
        .successful_deposits
        .saturating_add(state.successful_withdrawals)
        .saturating_add(state.error_count);

    let error_rate_bps = if total_ops == 0 {
        0
    } else {
        ((state.error_count.saturating_mul(10_000)) / total_ops) as u32
    };

    let mut trend = Vec::new(env);
    let current_hour = now_hour(env);
    let max = SNAPSHOT_WINDOW_HOURS.min(ANALYTICS_HISTORY_HOURS);
    for offset in (0..max).rev() {
        let hour = current_hour.saturating_sub(offset as u64);
        trend.push_back(load_bucket_at_hour(env, hour));
    }

    AnalyticsSnapshot {
        page_views: state.page_views,
        deposit_count,
        withdrawal_count: state.successful_withdrawals,
        error_count: state.error_count,
        error_rate_bps,
        avg_page_load_ms: average(
            state.performance.page_load_total_ms,
            state.performance.page_load_samples,
        ),
        avg_deposit_ms: average(
            state.performance.deposit_total_ms,
            state.performance.deposit_samples,
        ),
        avg_withdraw_ms: average(
            state.performance.withdraw_total_ms,
            state.performance.withdraw_samples,
        ),
        hourly_trend: trend,
    }
}
