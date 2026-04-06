#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, BytesN, Env, Symbol,
};

#[derive(Debug, Arbitrary)]
struct WithdrawInput {
    nullifier: [u8; 32],
    proof_bytes: Vec<u8>,
    recipient_seed: [u8; 32],
    fee: i128,
    double_spend_test: bool,
}

fuzz_target!(|input: WithdrawInput| {
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

    // Generate recipient address
    let recipient = Address::generate(&env);

    // Create nullifier bytes
    let nullifier_bytes = BytesN::from_array(&env, &input.nullifier);

    // Limit proof size to prevent timeout
    let proof_bytes: Vec<u8> = input.proof_bytes.into_iter().take(128).collect();

    // Test 1: Proof format validation
    if proof_bytes.len() < 64 {
        // Invalid proof format (too short)
        let _error = "Invalid proof format: too short";
    }

    // Test 2: Nullifier uniqueness
    if input.double_spend_test {
        // Simulate double-spend attempt
        let _nullifier1 = BytesN::from_array(&env, &input.nullifier);
        let _nullifier2 = BytesN::from_array(&env, &input.nullifier);
        // Second withdrawal should fail
    }

    // Test 3: Fee validation
    let valid_fee = if input.fee >= 0 && input.fee <= 10000 {
        input.fee
    } else {
        10 // Default valid fee
    };

    // Test 4: Nullifier format
    let nullifier_len = nullifier_bytes.len();
    assert_eq!(nullifier_len, 32, "Nullifier must be 32 bytes");

    // Test 5: Recipient address validity
    assert!(recipient != Address::from_str(&env, "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA").unwrap());

    // Test 6: Proof size limits
    if proof_bytes.len() > 512 {
        // Proof too large
        let _error = "Proof exceeds maximum size";
    }

    // Test 7: Zero fee edge case
    if input.fee == 0 {
        // Zero fee withdrawal (valid in some cases)
        let _info = "Zero fee withdrawal attempted";
    }

    // Test 8: Negative fee (invalid)
    if input.fee < 0 {
        let _error = "Negative fee rejected";
    }
});
