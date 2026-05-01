// ============================================================
// Address Decoder Utilities
// ============================================================
// Decodes addresses from 32-byte field elements in public inputs.
// ============================================================

use soroban_sdk::{Address, BytesN, Env};

/// Decode a Stellar address from a 32-byte field element.
///
/// The address is stored as a 32-byte hash in the ZK proof public inputs.
pub fn decode_address(env: &Env, address_bytes: &BytesN<32>) -> Address {
    let bytes_array: [u8; 32] = address_bytes.to_array();
    Address::from_string_bytes(&soroban_sdk::Bytes::from_slice(env, &bytes_array))
}

/// Decode an optional relayer address (ZK-104 sentinel policy).
///
/// Returns `Some(Address)` if the relayer field is non-zero, `None` if it is
/// the 32-byte zero sentinel (meaning "no relayer").
///
/// # ZK-104 zero-account semantics
/// The SDK encodes the absence of a relayer as 32 bytes of 0x00.  This matches
/// the `STELLAR_ZERO_ACCOUNT` strkey (`GAAA…WHF`) encoded as a field element.
/// The contract MUST treat all-zero relayer bytes as "no relayer" and skip any
/// relayer fee transfer.  It MUST NOT attempt to decode or fund the zero address.
///
/// Recipients must NEVER be the zero sentinel — that check is enforced by the
/// circuit public-input constraints and the SDK witness validator.
pub fn decode_optional_relayer(env: &Env, relayer_bytes: &BytesN<32>) -> Option<Address> {
    let bytes_array: [u8; 32] = relayer_bytes.to_array();
    let zero = [0u8; 32];

    if bytes_array == zero {
        None // no-relayer sentinel — fee transfer must be skipped
    } else {
        Some(Address::from_string_bytes(
            &soroban_sdk::Bytes::from_slice(env, &bytes_array)
        ))
    }
}
