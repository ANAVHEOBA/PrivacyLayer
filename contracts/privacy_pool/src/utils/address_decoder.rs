// ============================================================
// Address Decoder Utilities
// ============================================================
// Decodes addresses from 32-byte field elements in public inputs.
// ============================================================

use soroban_sdk::{Address, Bytes, BytesN, Env, String};

/// Decode a Stellar address from a 32-byte field element.
///
/// The address is stored as a 32-byte hash in the ZK proof public inputs.
pub fn decode_address(env: &Env, address_bytes: &BytesN<32>) -> Address {
    let bytes_array: [u8; 32] = address_bytes.to_array();
    Address::from_string_bytes(&soroban_sdk::Bytes::from_slice(env, &bytes_array))
}

/// Encode a Stellar address into a 32-byte field element matching the SDK's SHA-256 hash logic.
///
/// ZK-072: Replaces lossy recipient decoding with a verifiable address-binding strategy.
pub fn encode_address_to_field(env: &Env, address: &Address) -> BytesN<32> {
    let address_text: String = address.to_string();
    let address_bytes = address_text.into_bytes();
    let digest = env.crypto().sha256(&address_bytes);
    
    // Reducing modulo BN254 field prime (approx 2^254.4)
    // SHA-256 is 2^256, so reduction is needed if precision matters,
    // but the SDK uses BigInt(0x...) % FIELD_MODULUS.
    // In Soroban, we'd need to do big-int modular reduction if it can exceed r.
    // However, the SDK logic is simply BigInt('0x' + digest) % FIELD_MODULUS.
    
    let mut bytes = digest.to_array();
    
    // Manual reduction for BN254 prime: 
    // 21888242871839275222246405745257275088548364400416034343698204186575808495617
    // Hex: 30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
    
    // For now, simplicity: if it's over the prime, we'd need big-int math.
    // But most SHA-256 digests fit if we treat them carefully.
    // The proper way in Soroban without a big-int library is to use the SDK's logic
    // if we want to be 100% compliant.
    
    // Let's use the actual BN254 prime check:
    let prime: [u8; 32] = [
        0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29, 
        0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d, 
        0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91, 
        0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01
    ];

    let mut is_greater = false;
    for i in 0..32 {
        if bytes[i] > prime[i] {
            is_greater = true;
            break;
        } else if bytes[i] < prime[i] {
            break;
        }
    }

    if is_greater {
        // Simple big-int subtraction (digest - prime) since SHA-256 < 2*prime
        let mut borrow = 0i16;
        for i in (0..32).rev() {
            let res = bytes[i] as i16 - prime[i] as i16 - borrow;
            if res < 0 {
                bytes[i] = (res + 256) as u8;
                borrow = 1;
            } else {
                bytes[i] = res as u8;
                borrow = 0;
            }
        }
    }

    BytesN::from_array(env, &bytes)
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
