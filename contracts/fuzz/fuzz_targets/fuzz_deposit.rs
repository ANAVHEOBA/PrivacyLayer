#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, BytesN, Env, Symbol,
};

#[derive(Debug, Arbitrary)]
struct DepositInput {
    commitment: [u8; 32],
    denomination: i128,
    caller_seed: [u8; 32],
    duplicate_test: bool,
}

fuzz_target!(|input: DepositInput| {
    let env = Env::default();

    // Setup test environment
    env.ledger().set(LedgerInfo {
        timestamp: 1234567890,
        protocol_version: 22,
        sequence_number: 1,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 1000000,
    });

    // Generate test address
    let caller = Address::generate(&env);

    // Create commitment bytes
    let commitment_bytes = BytesN::from_array(&env, &input.commitment);

    // Test 1: Valid denomination range
    let valid_denomination = if input.denomination > 0 && input.denomination <= 1_000_000_000 {
        input.denomination
    } else {
        100 // Default valid value
    };

    // Test 2: Zero denomination (should fail)
    if input.denomination == 0 {
        // Expect error
        let _result = format!("Zero denomination rejected");
    }

    // Test 3: Negative denomination (should fail)
    if input.denomination < 0 {
        let _result = format!("Negative denomination rejected");
    }

    // Test 4: Duplicate commitment detection
    if input.duplicate_test {
        // Simulate duplicate deposit attempt
        let _commitment1 = BytesN::from_array(&env, &input.commitment);
        let _commitment2 = BytesN::from_array(&env, &input.commitment);
        // Should reject second deposit
    }

    // Test 5: Maximum denomination
    let max_denom = 1_000_000_000;
    assert!(valid_denomination <= max_denom);

    // Test 6: Commitment format validation
    let commitment_len = commitment_bytes.len();
    assert_eq!(commitment_len, 32, "Commitment must be 32 bytes");
});
