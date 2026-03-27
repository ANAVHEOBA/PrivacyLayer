// ============================================================
// PrivacyLayer — Comprehensive Stress & Edge Case Tests
// ============================================================
// Focused on expanding test coverage for the bounty mission.
// Covers denominations, large batch deposits, and deep tree states.
// ============================================================

#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env, Vec,
};

use crate::{
    types::state::{Denomination, VerifyingKey},
    PrivacyPool, PrivacyPoolClient,
};

// ──────────────────────────────────────────────────────────────
// Test Helpers
// ──────────────────────────────────────────────────────────────

fn setup_env(env: &Env) -> (PrivacyPoolClient<'static>, Address, Address, Address) {
    env.mock_all_auths();
    env.cost_estimate().budget().reset_unlimited();

    let token_admin = Address::generate(env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

    let admin = Address::generate(env);
    let contract_id = env.register(PrivacyPool, ());
    let client = PrivacyPoolClient::new(env, &contract_id);

    let alice = Address::generate(env);
    (client, token_id, admin, alice)
}

fn dummy_vk(env: &Env) -> VerifyingKey {
    let g1 = BytesN::from_array(env, &[0u8; 64]);
    let g2 = BytesN::from_array(env, &[0u8; 128]);
    let mut abc = Vec::new(env);
    for _ in 0..7 { abc.push_back(g1.clone()); }
    VerifyingKey { alpha_g1: g1, beta_g2: g2.clone(), gamma_g2: g2.clone(), delta_g2: g2, gamma_abc_g1: abc }
}

fn commitment(env: &Env, seed: u32) -> BytesN<32> {
    let mut b = [0u8; 32];
    let bytes = (seed + 1).to_be_bytes(); // seed + 1 to avoid zero
    b[28..32].copy_from_slice(&bytes);
    BytesN::from_array(env, &b)
}

// ──────────────────────────────────────────────────────────────
// NEW TESTS: Denomination Logic
// ──────────────────────────────────────────────────────────────

#[test]
fn test_all_denominations_load_correct_amounts() {
    assert_eq!(Denomination::Xlm10.amount(), 100_000_000);
    assert_eq!(Denomination::Xlm100.amount(), 1_000_000_000);
    assert_eq!(Denomination::Xlm1000.amount(), 10_000_000_000);
    assert_eq!(Denomination::Usdc100.amount(), 100_000_000);
    assert_eq!(Denomination::Usdc1000.amount(), 1_000_000_000);
}

#[test]
fn test_deposit_with_different_denominations() {
    let env = Env::default();
    let (client, token_id, admin, alice) = setup_env(&env);

    // Test Case: USDC 1000 Denomination
    client.initialize(&admin, &token_id, &Denomination::Usdc1000, &dummy_vk(&env));
    
    let denom_amount = Denomination::Usdc1000.amount();
    StellarAssetClient::new(&env, &token_id).mint(&alice, &denom_amount);

    let alice_before = TokenClient::new(&env, &token_id).balance(&alice);
    client.deposit(&alice, &commitment(&env, 12345));
    
    let alice_after = TokenClient::new(&env, &token_id).balance(&alice);
    assert_eq!(alice_after, alice_before - denom_amount);
}

// ──────────────────────────────────────────────────────────────
// NEW TESTS: Batch Stress (O(depth) updates)
// ──────────────────────────────────────────────────────────────

#[test]
fn test_stress_sequential_deposits_fills_subtrees() {
    let env = Env::default();
    let (client, token_id, admin, alice) = setup_env(&env);
    client.initialize(&admin, &token_id, &Denomination::Xlm10, &dummy_vk(&env));

    let count = 50;
    let denom = Denomination::Xlm10.amount();
    StellarAssetClient::new(&env, &token_id).mint(&alice, &(count as i128 * denom));

    let mut last_root = BytesN::from_array(&env, &[0u8; 32]);
    for i in 0..count {
        let (idx, root) = client.deposit(&alice, &commitment(&env, i));
        assert_eq!(idx, i);
        assert_ne!(root, last_root);
        assert!(client.is_known_root(&root));
        last_root = root;
    }

    assert_eq!(client.deposit_count(), count);
}

// ──────────────────────────────────────────────────────────────
// NEW TESTS: Edge Cases & Validation
// ──────────────────────────────────────────────────────────────

#[test]
fn test_deposit_fails_if_alice_has_insufficient_funds() {
    let env = Env::default();
    let (client, token_id, admin, alice) = setup_env(&env);
    client.initialize(&admin, &token_id, &Denomination::Xlm100, &dummy_vk(&env));

    // Alice has 0 funds. Deposit should fail.
    let result = client.try_deposit(&alice, &commitment(&env, 1));
    assert!(result.is_err());
}

#[test]
fn test_batch_deposit_multiple_commitments() {
    let env = Env::default();
    let (client, token_id, admin, alice) = setup_env(&env);
    client.initialize(&admin, &token_id, &Denomination::Xlm100, &dummy_vk(&env));

    let count = 5;
    let total_denom = Denomination::Xlm100.amount() * count as i128;
    StellarAssetClient::new(&env, &token_id).mint(&alice, &total_denom);

    let mut commitments = soroban_sdk::Vec::new(&env);
    for i in 0..count {
        commitments.push_back(commitment(&env, i));
    }

    let results = client.batch_deposit(&alice, &commitments);
    assert_eq!(results.len(), count);
    assert_eq!(client.deposit_count(), count);
    
    // Check balance
    assert_eq!(TokenClient::new(&env, &token_id).balance(&alice), 0);
    assert_eq!(TokenClient::new(&env, &token_id).balance(&client.address), total_denom);
}
