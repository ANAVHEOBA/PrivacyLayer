//! Deprecated address decoder utilities.
//
/// The previous implementation attempted to reconstruct a Stellar address
/// from a 32‑byte field element supplied by the ZK proof. This approach is
/// no longer used because the proof only contains a hash of the address,
/// which is irreversible. The module is retained only for backward
/// compatibility; new code should use `hash_recipient` from the withdraw
/// core module instead.
#[allow(dead_code)]
pub fn decode_address_from_hash(_hash: &[u8]) -> Option<String> {
    // Decoding is impossible; return None to indicate the operation is not
    // supported. Existing callers have been migrated to the explicit
    // recipient‑binding flow.
    None
}
