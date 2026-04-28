#![no_main]

use arbitrary::Arbitrary;
use libfuzzer_sys::fuzz_target;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, BytesN, Env, Vec,
};

// Mock Merkle tree for fuzzing
#[derive(Debug, Arbitrary)]
struct MerkleInput {
    commitments: Vec<[u8; 32]>,
    proof_indices: Vec<usize>,
}

fuzz_target!(|input: MerkleInput| {
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

    // Limit commitments to prevent timeout
    let commitments: Vec<[u8; 32]> = input.commitments.into_iter().take(100).collect();

    // Test 1: Insert commitments
    let mut merkle_tree = Vec::new(&env);
    for commitment in commitments.iter() {
        let bytes = BytesN::from_array(&env, commitment);
        merkle_tree.push(bytes);
    }

    // Test 2: Verify all inserted commitments exist
    for (i, commitment) in commitments.iter().enumerate() {
        let bytes = BytesN::from_array(&env, commitment);
        assert!(merkle_tree.contains(&bytes), "Commitment {} not found in tree", i);
    }

    // Test 3: Generate proofs for random indices
    for idx in input.proof_indices.iter() {
        let tree_len = merkle_tree.len();
        if tree_len > 0 && *idx < tree_len {
            let _leaf = merkle_tree.get(*idx as u32);
            // Proof generation would happen here in real implementation
        }
    }

    // Test 4: Check tree size
    assert_eq!(merkle_tree.len() as usize, commitments.len());
});
