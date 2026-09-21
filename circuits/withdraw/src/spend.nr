use circuits::lib::validation::relayer::validate_relayer;

// Existing imports omitted for brevity

pub fn main(
    // other inputs...
    relayer: [u8],
) -> () {
    // Validate relayer encoding according to the new contract
    assert(validate_relayer(relayer));

    // Extract fields if needed (address, fee) – the circuit can now safely
    // assume the layout when `relayer[0] == 1`.
    // Example extraction (pseudo‑code):
    // let has_relayer = relayer[0] == 1u8;
    // if has_relayer {
    //     let address = relayer[1..33];
    //     let fee = u64_from_le_bytes(relayer[33..41]);
    //     // ... use address & fee in further constraints
    // }

    // Rest of the spend circuit unchanged.
}
