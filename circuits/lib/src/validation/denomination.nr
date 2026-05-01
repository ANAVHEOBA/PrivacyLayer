// ============================================================
// Denomination Validation (ZK-030)
// ============================================================
// Validates that withdrawal amounts match the fixed denomination
// of the pool. This prevents amount manipulation and ensures
// consistency between note commitments and withdrawal proofs.
// ============================================================

use crate::constants;

/// Validate that the withdrawal amount matches the expected denomination.
///
/// This function enforces the fixed-denomination pool model by ensuring
/// that the amount being withdrawn exactly matches the pool's denomination.
/// Any deviation will cause the circuit to fail.
///
/// # Arguments
/// - `amount`: The withdrawal amount being claimed
/// - `expected_denomination`: The fixed denomination of the pool
///
/// # Panics
/// Panics if `amount != expected_denomination`
pub fn validate_denomination(amount: Field, expected_denomination: Field) {
    assert(amount == expected_denomination, "denomination mismatch: withdrawal amount does not match pool denomination");
}

mod tests {
    use super::validate_denomination;
    use crate::constants::{DENOMINATION_100_XLM, DENOMINATION_1000_XLM, DEFAULT_DENOMINATION};

    /// Test that valid denomination passes validation
    #[test]
    fn test_valid_denomination() {
        validate_denomination(DENOMINATION_100_XLM, DENOMINATION_100_XLM);
    }

    /// Test that mismatched denomination fails validation
    #[test(should_fail_with = "denomination mismatch: withdrawal amount does not match pool denomination")]
    fn test_mismatched_denomination_fails() {
        validate_denomination(DENOMINATION_100_XLM, DENOMINATION_1000_XLM);
    }

    /// Test that zero amount fails against non-zero denomination
    #[test(should_fail_with = "denomination mismatch: withdrawal amount does not match pool denomination")]
    fn test_zero_amount_fails() {
        validate_denomination(0, DEFAULT_DENOMINATION);
    }

    /// Test that arbitrary amount fails against fixed denomination
    #[test(should_fail_with = "denomination mismatch: withdrawal amount does not match pool denomination")]
    fn test_arbitrary_amount_fails() {
        validate_denomination(123456789, DEFAULT_DENOMINATION);
    }
}
