# ZK-113: Event & Analytics Privacy Boundary

## Overview

This document defines the privacy boundary for contract events and analytics storage in PrivacyLayer. As ZK features grow, we must ensure that no linkable metadata leaks through events or aggregate telemetry.

## Privacy Principles

1. **No User Identifiers**: Events and analytics never contain addresses that can link deposits to withdrawals
2. **Aggregate Only**: Analytics storage contains only counters and averages, never per-user data
3. **One-Way Hashes**: Only nullifier_hash (not raw nullifier) appears in events
4. **Fixed Denominations**: Amount fields are fixed, preventing amount-based correlation

## Event Schema

### DepositEvent

**Fields:**
- `pool_id`: Pool identifier (public)
- `commitment`: Merkle leaf commitment (public once deposited)
- `leaf_index`: Tree position (public)
- `root`: Merkle root after insertion (public)

**Privacy Analysis:**
✅ Safe: No depositor address emitted  
✅ Safe: No note material (nullifier, secret) emitted  
✅ Safe: Commitment is public after deposit  

### WithdrawEvent

**Fields:**
- `pool_id`: Pool identifier (public)
- `nullifier_hash`: Poseidon2(nullifier, pool_id) - prevents double-spend
- `recipient`: Withdrawal destination address (public)
- `relayer`: Optional relayer address (public)
- `fee`: Relayer fee (public, fixed denomination)
- `amount`: Withdrawal amount (public, fixed denomination)

**Privacy Analysis:**
✅ Safe: Only nullifier_hash, not raw nullifier  
✅ Safe: No proof data (a, b, c points) emitted  
✅ Safe: No secret or note material emitted  
✅ Safe: No link to original deposit commitment  

## Analytics Storage

### AnalyticsState (Global Aggregates)

**Fields:**
- `page_views`: Total page views (counter)
- `successful_deposits`: Total deposits (counter)
- `successful_withdrawals`: Total withdrawals (counter)
- `error_count`: Total errors (counter)
- `performance`: Average timing metrics

**Privacy Analysis:**
✅ Safe: No user identifiers  
✅ Safe: No nullifiers or commitments  
✅ Safe: Only aggregate counters  

### AnalyticsBucket (Hourly Trends)

**Fields:**
- `hour_epoch`: Hour timestamp (public)
- `page_views`: Hourly page views (counter)
- `deposits`: Hourly deposits (counter)
- `withdrawals`: Hourly withdrawals (counter)
- `errors`: Hourly errors (counter)

**Privacy Analysis:**
✅ Safe: No user-level granularity  
✅ Safe: 1-hour bucket prevents timing attacks  
✅ Safe: Ring buffer limits history to 168 hours (1 week)  

## Forbidden ZK Data Classes

The following data types are **EXPLICITLY FORBIDDEN** from events and analytics:

### Never Emit:
- ❌ `nullifier` (raw) - would enable double-spend and tracking
- ❌ `secret` - core privacy secret, NEVER expose
- ❌ `proof` (a, b, c points) - cryptographic material
- ❌ `verification_key` - VK material
- ❌ `merkle_path` - tree traversal data
- ❌ `note_backup` - serialized note with secrets
- ❌ `depositor_address` - links user to deposit
- ❌ `witness_data` - circuit inputs

### Allowed (Public):
- ✅ `nullifier_hash` - one-way hash, prevents double-spend
- ✅ `commitment` - public once in tree
- ✅ `root` - public tree state
- ✅ `recipient` - public withdrawal destination
- ✅ `amount` - fixed denomination (already known)
- ✅ `fee` - public relayer compensation
- ✅ `pool_id` - public pool identifier
- ✅ `leaf_index` - public tree position
- ✅ Aggregate counters - safe for dashboards

## Privacy Tests

See `contracts/privacy_pool/src/privacy_audit_test.rs` for automated tests that verify:

1. `test_deposit_event_no_depositor_address` - Deposit events lack depositor
2. `test_withdraw_event_no_note_material` - Withdraw events lack secrets
3. `test_analytics_state_no_user_identifiers` - Analytics are aggregate-only
4. `test_events_forbidden_zk_data_classes` - Explicit forbidden/allowed field validation
5. `test_no_linkable_metadata_in_events` - No cross-event linkage

## Dashboard Safety

The `AnalyticsSnapshot` returned by the contract is **safe for public dashboard exposure**:

```rust
pub struct AnalyticsSnapshot {
    pub page_views: u64,              // ✅ Aggregate counter
    pub deposit_count: u32,           // ✅ Aggregate counter
    pub withdrawal_count: u64,        // ✅ Aggregate counter
    pub error_count: u64,             // ✅ Aggregate counter
    pub error_rate_bps: u32,          // ✅ Derived metric (0-100%)
    pub avg_page_load_ms: u32,        // ✅ Average timing
    pub avg_deposit_ms: u32,          // ✅ Average timing
    pub avg_withdraw_ms: u32,         // ✅ Average timing
    pub hourly_trend: Vec<AnalyticsBucket>,  // ✅ Hourly aggregates
}
```

## Audit Trail

- **Issue**: ZK-113
- **Date**: 2026-04-27
- **Reviewer**: AI-assisted privacy audit
- **Status**: ✅ Events and analytics verified as aggregate-only
- **Tests**: `privacy_audit_test.rs` (7 test cases)
- **Guard**: Automated tests prevent accidental addition of linkable fields
