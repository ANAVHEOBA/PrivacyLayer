/// Validate that fee does not exceed the withdrawal amount.
pub fn validate_fee(fee: Field, amount: Field) {
    assert(fee as u64 <= amount as u64, "fee cannot exceed withdrawal amount");
}
