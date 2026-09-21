use soroban_sdk::{Env, Symbol, Bytes};

/// Validate the relayer field according to the SDK canonical encoding.
/// Returns `Ok(())` if valid, otherwise an error Symbol.
pub fn validate_relayer(env: &Env, relayer: &Bytes) -> Result<(), Symbol> {
    if relayer.len() == 0 {
        return Err(Symbol::short("empty_relayer"));
    }
    let flag = relayer.get(0);
    match flag {
        0u8 => {
            // No relayer – must be exactly one byte
            if relayer.len() != 1 {
                Err(Symbol::short("malformed_no_relayer"))
            } else {
                Ok(())
            }
        }
        1u8 => {
            // Present – must contain address (32) + fee (8) after flag
            if relayer.len() != 41 {
                return Err(Symbol::short("malformed_relayer_len"));
            }
            // Ensure address is not all zero (reserved sentinel)
            let address_slice = relayer.slice(1, 33);
            let mut all_zero = true;
            for i in 0..address_slice.len() {
                if address_slice.get(i) != 0u8 {
                    all_zero = false;
                    break;
                }
            }
            if all_zero {
                return Err(Symbol::short("zero_address_not_allowed"));
            }
            // Fee is a u64 – further checks (e.g., max fee) are performed elsewhere.
            Ok(())
        }
        _ => Err(Symbol::short("invalid_relayer_flag")),
    }
}
