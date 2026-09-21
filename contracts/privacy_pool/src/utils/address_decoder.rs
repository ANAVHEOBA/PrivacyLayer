use soroban_sdk::{Address, Bytes, Env, Symbol};

/// Decode a 32‑byte address from a `Bytes` slice.
/// Returns `Ok(Address)` if the slice length is exactly 32.
pub fn decode_address(env: &Env, data: &Bytes) -> Result<Address, Symbol> {
    if data.len() != 32 {
        return Err(Symbol::short("invalid_address_len"));
    }
    // The address is stored as raw 32‑byte ed25519 public key.
    Ok(Address::from_bytes(&data))
}

/// Decode an *optional* address. The encoding follows the SDK canonical format:
///   - first byte = presence flag (0 = none, 1 = present)
///   - if present: next 32 bytes = address
pub fn decode_optional_address(env: &Env, data: &Bytes) -> Result<Option<Address>, Symbol> {
    if data.len() == 0 {
        return Err(Symbol::short("empty_relayer_field"));
    }
    let flag = data.get(0);
    if flag == 0u8 {
        // No relayer – must be exactly one byte
        if data.len() != 1 {
            return Err(Symbol::short("malformed_no_relayer"));
        }
        Ok(None)
    } else if flag == 1u8 {
        if data.len() != 33 {
            return Err(Symbol::short("malformed_relayer"));
        }
        let addr_bytes = data.slice(1, 33);
        Ok(Some(Address::from_bytes(&addr_bytes)))
    } else {
        Err(Symbol::short("invalid_relayer_flag"))
    }
}
