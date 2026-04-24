/// Validate relayer address consistency with fee.
/// If fee is zero, relayer must be zero address.
pub fn validate_relayer(relayer: Field, fee: Field) {
    if fee == 0 {
        assert(relayer == 0, "relayer must be zero address if fee is zero");
    }
}
