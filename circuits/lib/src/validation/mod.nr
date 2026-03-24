// ============================================================
// Validation Utilities
// ============================================================
// Common validation functions used across circuits.
// ============================================================

/// Validate that fee does not exceed the withdrawal amount.
pub fn validate_fee(fee: Field, amount: Field) {
    // Use field comparison directly to avoid type conversion constraints
    assert(fee <= amount, "fee cannot exceed withdrawal amount");
}

/// Validate relayer address consistency with fee.
/// If fee is zero, relayer must be zero address.
pub fn validate_relayer(relayer: Field, fee: Field) {
    // Optimize: when fee == 0, relayer must be 0
    // This can be expressed as: fee * relayer == 0 AND (fee == 0 => relayer == 0)
    // But to keep it simple and maintain security, we'll use the original approach
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
