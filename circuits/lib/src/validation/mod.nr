// ============================================================
// Validation Utilities
// ============================================================
// Common validation functions used across circuits.
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
/// If fee is zero, relayer must be zero address.
pub fn validate_relayer(relayer_value: Field, fee_value: Field) {
    relayer::validate_relayer(relayer_value, fee_value);
}

/// Validate commitment matches the computed value.
pub fn validate_commitment(computed: Field, expected: Field) {
    commitment::validate_commitment(computed, expected);
}

/// Validate nullifier hash matches the computed value.
pub fn validate_nullifier_hash(computed: Field, expected: Field) {
    nullifier::validate_nullifier_hash(computed, expected);
}
