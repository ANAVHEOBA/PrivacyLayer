// ============================================================
// Validation Utilities
// ============================================================
// Common validation functions used across circuits.
// ============================================================

/// Validate that fee does not exceed the withdrawal amount.
pub fn validate_fee(fee: Field, amount: Field) {
    assert(fee as u64 <= amount as u64, "fee cannot exceed withdrawal amount");
}

/// Validate relayer address consistency with fee.
/// If fee is zero, relayer must be zero address.
pub fn validate_relayer(relayer: Field, fee: Field) {
    if fee == 0 {
        assert(relayer == 0, "relayer must be zero address if fee is zero");
    }
}

/// Validate commitment matches the computed value.
pub fn validate_commitment(computed: Field, expected: Field) {
    assert(computed == expected, "commitment mismatch: invalid nullifier/secret pair");
}

/// Validate nullifier hash matches the computed value.
pub fn validate_nullifier_hash(computed: Field, expected: Field) {
    assert(computed == expected, "nullifier_hash mismatch: invalid nullifier or wrong root");
}

// Test helper utilities (shared across all circuit test suites)
pub mod test_helpers;
