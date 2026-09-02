pub fn validate_fee(fee: Field, amount: Field) {
    assert(fee as u64 <= amount as u64, "fee cannot exceed withdrawal amount");
}

pub fn validate_relayer(relayer: Field, fee: Field) {
    if fee == 0 {
        assert(relayer == 0, "relayer must be zero address if fee is zero");
    } else {
        assert(relayer != 0, "relayer must be non-zero address if fee is non-zero");
    }
}

pub fn validate_fee_and_relayer(fee: Field, amount: Field, relayer: Field) {
    validate_fee(fee, amount);
    validate_relayer(relayer, fee);
}

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
        validate_fee(18446744073709551615, 0);
    }

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

    #[test]
    fn combined_no_relayer_case() {
        validate_fee_and_relayer(0, 1000, 0);
    }

    #[test]
    fn combined_with_relayer_case() {
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
