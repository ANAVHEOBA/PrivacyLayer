/// Validate relayer address consistency with fee.
/// - If fee is zero, relayer must be zero address (no relayer).
/// - If fee is non-zero, relayer must be non-zero address.
pub fn validate_relayer(relayer: Field, fee: Field) {
    if fee == 0 {
        assert(relayer == 0, "relayer must be zero address if fee is zero");
    } else {
        assert(relayer != 0, "relayer must be non-zero address if fee is non-zero");
    }
}
