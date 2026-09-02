use soroban_sdk::{Address, BytesN, Env};
use crate::types::errors::Error;

const BN254_MODULUS: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
    0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91,
    0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01,
];

fn be_gte(a: &[u8; 32], b: &[u8; 32]) -> bool {
    let mut i = 0;
    while i < 32 {
        if a[i] > b[i] {
            return true;
        } else if a[i] < b[i] {
            return false;
        }
        i += 1;
    }
    true
}

fn be_sub(a: &mut [u8; 32], b: &[u8; 32]) {
    let mut borrow: u16 = 0;
    let mut i = 32;
    while i > 0 {
        i -= 1;
        let diff = (a[i] as i32) - (b[i] as i32) - (borrow as i32);
        if diff < 0 {
            a[i] = (diff + 256) as u8;
            borrow = 1;
        } else {
            a[i] = diff as u8;
            borrow = 0;
        }
    }
}

/// Reduces a 32-byte big-endian value modulo the BN254 scalar field prime.
pub fn reduce_to_field_bytes(mut bytes: [u8; 32]) -> [u8; 32] {
    while be_gte(&bytes, &BN254_MODULUS) {
        be_sub(&mut bytes, &BN254_MODULUS);
    }
    bytes
}

/// Encodes a Stellar address as a verifiable BN254 field element commitment.
pub fn encode_address_as_field(env: &Env, address: &Address) -> BytesN<32> {
    let address_str = address.to_string();
    let address_bytes = address_str.to_bytes();
    let digest = env.crypto().sha256(&address_bytes);
    let reduced = reduce_to_field_bytes(digest.to_array());
    BytesN::from_array(env, &reduced)
}

/// Verifies that the recipient address matches the recipient field commitment in public inputs.
pub fn verify_recipient_binding(
    env: &Env,
    recipient: &Address,
    expected_commitment: &BytesN<32>,
) -> Result<(), Error> {
    let computed_commitment = encode_address_as_field(env, recipient);
    if &computed_commitment != expected_commitment {
        return Err(Error::InvalidRecipient);
    }
    Ok(())
}

/// Verifies that the optional relayer address matches the relayer field commitment in public inputs.
pub fn verify_relayer_binding(
    env: &Env,
    relayer: Option<&Address>,
    expected_commitment: &BytesN<32>,
) -> Result<(), Error> {
    let zero = BytesN::from_array(env, &[0u8; 32]);
    match relayer {
        Some(addr) => {
            let computed = encode_address_as_field(env, addr);
            if &computed != expected_commitment {
                return Err(Error::InvalidRecipient);
            }
        }
        None => {
            if expected_commitment != &zero {
                return Err(Error::InvalidRelayerFee);
            }
        }
    }
    Ok(())
}
