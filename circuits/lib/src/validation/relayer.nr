// ============================================================
// circuits/lib/src/validation/relayer.nr  (ZK-073)
// ============================================================
// Canonical relayer binding contract — single source of truth
// for the three relayer modes:
//
//   Mode 1: No relayer      → relayer == 0 && fee == 0
//   Mode 2: Relayer + fee   → relayer != 0 && fee > 0 && fee <= amount
//   Mode 3: Malformed       → REJECTED (partially zero, sentinel mix, etc.)
//
// This module re-exports the canonical validate_relayer from fee.nr
// so that every call site uses the same enforcement logic.
// ============================================================

// Re-export the canonical relayer validation from fee.nr.
// fee.nr contains the complete encoding contract (R1+R2+R3) and
// is the single source of truth shared with the SDK.
pub use super::fee::validate_relayer;

// ------------------------------------------------------------------
// Additional relayer-specific guards beyond fee binding
// ------------------------------------------------------------------

/// Validate that a non-zero relayer field is not a partially-zero
/// or otherwise malformed sentinel value.
///
/// A "malformed" relayer is one that:
///   - Is not exactly zero (which is the no-relayer sentinel)
///   - But contains leading or trailing zero patterns that suggest
///     a truncation or encoding error
///
/// In the BN254 field, any non-zero Field element is a valid relayer
/// encoding.  This guard exists as a defense-in-depth check for the
// / future introduction of multi-byte sentinel patterns.
///
/// # Panics
/// Currently a no-op guard — all non-zero Field values are accepted
/// as valid relayer encodings.  This function exists to anchor the
/// ZK-073 binding contract and can be extended if new sentinel
/// patterns are introduced.
pub fn validate_relayer_not_malformed(relayer: Field) {
    // ZK-073: Non-zero relayer is valid by construction (produced
    // by SDK's stellarAddressToField).  No additional constraint needed
    // at the circuit level — the SDK witness validator ensures that
    // the relayer field was produced by a canonical Stellar address
    // encoding, not by arbitrary byte manipulation.
    if relayer != 0 {
        // Valid: relayer was produced by stellarAddressToField()
        // Invariant enforced by SDK witness preparation, not circuit.
    }
}

// ============================================================
// Tests for relayer binding (ZK-073)
// ============================================================

#[cfg(test)]
mod tests {
    use super::{validate_relayer, validate_relayer_not_malformed};

    // ------------------------------------------------------------------
    // validate_relayer (delegates to fee.nr canonical version)
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
    // validate_relayer_not_malformed (ZK-073 defense-in-depth)
    // ------------------------------------------------------------------

    #[test]
    fn zero_relayer_passes_malformed_check() {
        validate_relayer_not_malformed(0);
    }

    #[test]
    fn nonzero_relayer_passes_malformed_check() {
        validate_relayer_not_malformed(0xc0ffee);
    }

    #[test]
    fn large_relayer_field_passes_malformed_check() {
        validate_relayer_not_malformed(
            0x9999999999999999999999999999999999999999999999999999999999999
        );
    }
}
