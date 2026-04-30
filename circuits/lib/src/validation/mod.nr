// ============================================================
// Validation Utilities
// ============================================================
// Common validation functions used across circuits.
//
// ZK-073: The relayer binding contract is defined in fee.nr and
// re-exported through relayer.nr.  All call sites should use
// validate_relayer (from either module — they are identical).
// ============================================================

pub mod commitment;
pub mod denomination;
pub mod fee;
pub mod nullifier;
pub mod relayer;

// Test helper utilities (shared across all circuit test suites)
pub mod test_helpers;

/// Validate that fee does not exceed the withdrawal amount.
pub fn validate_fee(fee_value: Field, amount: Field) {
    fee::validate_fee(fee_value, amount);
}

/// Validate relayer address consistency with fee.
/// Delegates to the canonical implementation in fee.nr (ZK-073).
///
/// Encoding contract:
///   - fee == 0  → relayer MUST be 0   (no relayer)
///   - fee >  0  → relayer MUST be != 0 (relayer required when fee present)
pub fn validate_relayer(relayer_value: Field, fee_value: Field) {
    fee::validate_relayer(relayer_value, fee_value);
}

/// Validate that a non-zero relayer is not malformed (ZK-073).
pub fn validate_relayer_not_malformed(relayer_value: Field) {
    relayer::validate_relayer_not_malformed(relayer_value);
}

/// Validate commitment matches the computed value.
pub fn validate_commitment(computed: Field, expected: Field) {
    commitment::validate_commitment(computed, expected);
}

/// Validate nullifier hash matches the computed value.
pub fn validate_nullifier_hash(computed: Field, expected: Field) {
    nullifier::validate_nullifier_hash(computed, expected);
}

pub fn validate_denomination(amount: Field, denomination: Field) {
    denomination::validate_denomination(amount, denomination);
}
