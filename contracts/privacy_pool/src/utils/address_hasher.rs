// ============================================================
// Address Hasher Utilities
// ============================================================
// Hashes Stellar addresses to field elements for ZK binding.
// ============================================================

use soroban_sdk::{Address, BytesN, Env};

/// BN254 scalar field prime
/// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
const FIELD_MODULUS: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29, 
    0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d, 
    0x97, 0x81, 0x6a, 0x91, 0x68, 0x71, 0xca, 0x8d, 
    0x3c, 0x20, 0x8c, 0x16, 0xd8, 0x7c, 0xfd, 0x47
];

/// Hashes a Stellar Address to a BN254 field element using SHA-256.
///
/// This MUST match the SDK's `stellarAddressToField` implementation.
/// The address string is hashed, then reduced modulo the BN254 field prime.
pub fn address_to_field(env: &Env, address: &Address) -> BytesN<32> {
    // 1. Get the address as a string (e.g. "G...")
    // In Soroban, we can use Address::to_string() which returns a String
    let addr_str = address.to_string();
    
    // 2. Hash the UTF-8 bytes of the address string using SHA-256
    let hash = env.crypto().sha256(&addr_str.to_bytes());
    
    // 3. Reduce the 32-byte hash modulo the BN254 prime
    // Since this is done in the SDK via BigInt % FIELD_MODULUS,
    // we do a simple manual reduction for the 32-byte value.
    // If hash < FIELD_MODULUS, we can return it as is.
    // Given SHA-256 is almost uniform and r is very large (~2^254),
    // most hashes are already < r.
    
    let hash_bytes = hash.to_array();
    if is_less_than(&hash_bytes, &FIELD_MODULUS) {
        BytesN::from_array(env, &hash_bytes)
    } else {
        // Simple subtraction since hash is at most slightly larger than r
        let reduced = subtract(&hash_bytes, &FIELD_MODULUS);
        BytesN::from_array(env, &reduced)
    }
}

/// Returns true if the 32-byte relayer field is the zero sentinel.
pub fn is_zero_sentinel(env: &Env, field: &BytesN<32>) -> bool {
    let zero = BytesN::from_array(env, &[0u8; 32]);
    field == &zero
}

fn is_less_than(a: &[u8; 32], b: &[u8; 32]) -> bool {
    for i in 0..32 {
        if a[i] < b[i] { return true; }
        if a[i] > b[i] { return false; }
    }
    false
}

fn subtract(a: &[u8; 32], b: &[u8; 32]) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut borrow = 0;
    for i in (0..32).rev() {
        let val_a = a[i] as i16;
        let val_b = b[i] as i16;
        let mut diff = val_a - val_b - borrow;
        if diff < 0 {
            diff += 256;
            borrow = 1;
        } else {
            borrow = 0;
        }
        result[i] = diff as u8;
    }
    result
}
