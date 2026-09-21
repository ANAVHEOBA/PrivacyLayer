// Validation logic for the relayer field used by withdraw circuits.
// The encoding matches the SDK's canonical format:
//   - first byte = presence flag (0 = none, 1 = present)
//   - if present: 32‑byte address + 8‑byte fee (little‑endian)

pub fn validate_relayer(relayer: [u8]) -> bool {
    // Must be at least one byte for the flag
    if relayer.len() == 0 {
        return false;
    }

    let flag = relayer[0];
    if flag == 0u8 {
        // No relayer – only the flag byte is allowed
        return relayer.len() == 1;
    }

    // Flag must be exactly 1 for a present relayer
    if flag != 1u8 {
        return false;
    }

    // Expected total length = 1 (flag) + 32 (address) + 8 (fee)
    if relayer.len() != 41 {
        return false;
    }

    // Basic address sanity: ensure the address bytes are not all zero.
    // (Zero address is reserved for “no relayer” and should never appear here.)
    let address = relayer[1..33];
    let mut all_zero = true;
    for b in address {
        if *b != 0u8 {
            all_zero = false;
            break;
        }
    }
    if all_zero {
        return false;
    }

    // Fee can be any u64; the circuit will enforce fee ≤ max_allowed elsewhere.
    true
}
