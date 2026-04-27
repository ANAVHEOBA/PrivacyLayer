// ============================================================
// circuits/lib/src/validation/fee.nr  (ZK-036)
// ============================================================
// Canonical fee validation rules.  These are the single source
// of truth shared between the circuit constraints and the SDK
// witness-preparation layer.
//
// Rule set
// --------
//  R1. fee <= amount          (prevent fee-only griefing)
//  R2. fee == 0 → relayer == 0  (no phantom relayer)
//  R3. fee >  0 → relayer != 0  (relayer must be set when fee is non-zero)
//
// All three rules are enforced both here (circuit side) and in
// the SDK (sdk/src/proof.ts – see `validateRelayerFeeEncoding`).
// ============================================================

/// Validate that fee does not exceed the withdrawal amount.
///
/// # Panics
/// Panics if `fee > amount` (both treated as unsigned 64-bit values).
pub fn validate_fee(fee: Field, amount: Field) {
    assert(fee as u64 <= amount as u64, "fee cannot exceed withdrawal amount");
}

/// Validate the canonical relayer/fee encoding rule.
///
/// # Encoding contract
/// - fee == 0  → relayer MUST be 0   (no fee, no relayer)
/// - fee >  0  → relayer MUST be != 0  (fee without a relayer is invalid)
///
/// # Panics
/// Panics when either encoding invariant is violated.
pub fn validate_relayer(relayer: Field, fee: Field) {
    if fee == 0 {
        assert(relayer == 0, "relayer must be zero address if fee is zero");
    } else {
        assert(relayer != 0, "relayer must be non-zero address if fee is non-zero");
    }
}

/// Combined convenience guard – call once in the spend circuit.
pub fn validate_fee_and_relayer(fee: Field, amount: Field, relayer: Field) {
    validate_fee(fee, amount);
    validate_relayer(relayer, fee);
}

// ============================================================
// circuits/lib/src/validation/fee_tests.nr  (ZK-036)
// ============================================================
// Noir test module for fee/relayer validation.
// Each test is self-contained and labelled so failures map
// directly to a reproduction case.
// ============================================================

#[cfg(test)]
mod tests {
    use super::{validate_fee, validate_relayer, validate_fee_and_relayer};

    // ------------------------------------------------------------------
    // validate_fee
    // ------------------------------------------------------------------

    #[test]
    fn fee_zero_is_valid() {
        validate_fee(0, 100);
    }

    #[test]
    fn fee_equals_amount_is_valid() {
        validate_fee(100, 100);
    }

    #[test]
    fn fee_less_than_amount_is_valid() {
        validate_fee(1, 100);
    }

    #[test(should_fail_with = "fee cannot exceed withdrawal amount")]
    fn fee_exceeds_amount_panics() {
        validate_fee(101, 100);
    }

    #[test(should_fail_with = "fee cannot exceed withdrawal amount")]
    fn fee_equals_max_field_panics_when_amount_is_small() {
        // Largest value that fits in u64 – must fail when amount is 0
        validate_fee(18446744073709551615, 0);
    }

    // ------------------------------------------------------------------
    // validate_relayer
    // ------------------------------------------------------------------

    #[test]
    fn zero_fee_zero_relayer_is_valid() {
        validate_relayer(0, 0);
    }

    #[test]
    fn nonzero_fee_nonzero_relayer_is_valid() {
        validate_relayer(0xdeadbeef, 10);
    }

    #[test(should_fail_with = "relayer must be zero address if fee is zero")]
    fn zero_fee_nonzero_relayer_panics() {
        validate_relayer(0xdeadbeef, 0);
    }

    #[test(should_fail_with = "relayer must be non-zero address if fee is non-zero")]
    fn nonzero_fee_zero_relayer_panics() {
        validate_relayer(0, 42);
    }

    // ------------------------------------------------------------------
    // validate_fee_and_relayer (combined)
    // ------------------------------------------------------------------

    #[test]
    fn combined_no_relayer_case() {
        // fee=0, relayer=0, amount=1000
        validate_fee_and_relayer(0, 1000, 0);
    }

    #[test]
    fn combined_with_relayer_case() {
        // fee=5, relayer=<address>, amount=100
        validate_fee_and_relayer(5, 100, 0xc0ffee);
    }

    #[test(should_fail_with = "fee cannot exceed withdrawal amount")]
    fn combined_fee_exceeds_amount_panics() {
        validate_fee_and_relayer(200, 100, 0xc0ffee);
    }

    #[test(should_fail_with = "relayer must be zero address if fee is zero")]
    fn combined_phantom_relayer_panics() {
        validate_fee_and_relayer(0, 100, 0xdeadbeef);
    }

    #[test(should_fail_with = "relayer must be non-zero address if fee is non-zero")]
    fn combined_orphan_fee_panics() {
        validate_fee_and_relayer(10, 100, 0);
    }
}
