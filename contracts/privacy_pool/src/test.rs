// ============================================================
// PrivacyLayer — Soroban Contract Unit Tests
// ============================================================
// Key Soroban SDK v22 test patterns used here:
//
//   client.method(...)      → returns T directly, PANICS on contract Error
//   client.try_method(...)  → returns Result<Result<T, ContractError>, sdk::Error>
//
// For HAPPY PATH tests:   client.method(&arg)
// For ERROR PATH tests:   assert_eq!(client.try_method(&arg), Ok(Err(Error::SomeError)))
//
// See: https://soroban.stellar.org/docs/tutorials/testing
// ============================================================

#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env, Vec,
};

use crate::{
    crypto::merkle::ROOT_HISTORY_SIZE,
    types::state::{Denomination, VerifyingKey},
    PrivacyPool, PrivacyPoolClient,
};

// ──────────────────────────────────────────────────────────────
// Test Setup
// ──────────────────────────────────────────────────────────────

const DENOM_AMOUNT: i128 = 1_000_000_000; // 100 XLM

struct TestEnv {
    pub env:         Env,
    pub client:      PrivacyPoolClient<'static>,
    pub token_id:    Address,
    pub admin:       Address,
    pub alice:       Address,
    pub bob:         Address,
}

impl TestEnv {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.cost_estimate().budget().reset_unlimited(); // Poseidon2 operations need unlimited budget

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

        let admin = Address::generate(&env);
        let contract_id = env.register(PrivacyPool, ());
        let client = PrivacyPoolClient::new(&env, &contract_id);

        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        StellarAssetClient::new(&env, &token_id).mint(&alice, &(50 * DENOM_AMOUNT));
        StellarAssetClient::new(&env, &token_id).mint(&bob,   &(50 * DENOM_AMOUNT));

        TestEnv { env, client, token_id, admin, alice, bob }
    }

    /// Initialize contract with dummy verifying key.
    fn init(&self) {
        self.client.initialize(
            &self.admin,
            &self.token_id,
            &Denomination::Xlm100,
            &dummy_vk(&self.env),
        );
    }

    fn token_balance(&self, addr: &Address) -> i128 {
        TokenClient::new(&self.env, &self.token_id).balance(addr)
    }

    fn contract_balance(&self) -> i128 {
        self.token_balance(&self.client.address)
    }
}

fn dummy_vk(env: &Env) -> VerifyingKey {
    let g1 = BytesN::from_array(env, &[0u8; 64]);
    let g2 = BytesN::from_array(env, &[0u8; 128]);
    let mut abc = Vec::new(env);
    for _ in 0..7 { abc.push_back(g1.clone()); }
    VerifyingKey { alpha_g1: g1, beta_g2: g2.clone(), gamma_g2: g2.clone(), delta_g2: g2, gamma_abc_g1: abc }
}

fn commitment(env: &Env, seed: u8) -> BytesN<32> {
    let mut b = [seed; 32];
    b[0] = seed.wrapping_add(1); // never all-zero
    BytesN::from_array(env, &b)
}

fn nullifier_hash(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed.wrapping_add(150); 32])
}

// ──────────────────────────────────────────────────────────────
// Initialization Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_initialize_succeeds() {
    let t = TestEnv::setup();
    // Calling without panic = success
    t.client.initialize(&t.admin, &t.token_id, &Denomination::Xlm100, &dummy_vk(&t.env));
}

#[test]
fn test_initialize_twice_returns_already_initialized() {
    let t = TestEnv::setup();
    t.init();
    let result = t.client.try_initialize(
        &t.admin, &t.token_id, &Denomination::Xlm100, &dummy_vk(&t.env),
    );
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────
// Deposit Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_deposit_before_init_fails() {
    let t = TestEnv::setup();
    let c = commitment(&t.env, 1);
    let result = t.client.try_deposit(&t.alice, &c);
    assert!(result.is_err());
}

#[test]
fn test_deposit_success_leaf_index_zero() {
    let t = TestEnv::setup();
    t.init();

    let alice_before = t.token_balance(&t.alice);
    let c = commitment(&t.env, 1);

    let (leaf_index, _root) = t.client.deposit(&t.alice, &c);
    assert_eq!(leaf_index, 0);
    assert_eq!(t.token_balance(&t.alice), alice_before - DENOM_AMOUNT);
    assert_eq!(t.contract_balance(), DENOM_AMOUNT);
}

#[test]
fn test_deposit_increments_leaf_indices() {
    let t = TestEnv::setup();
    t.init();

    let (i0, _) = t.client.deposit(&t.alice, &commitment(&t.env, 1));
    let (i1, _) = t.client.deposit(&t.alice, &commitment(&t.env, 2));
    let (i2, _) = t.client.deposit(&t.bob,   &commitment(&t.env, 3));

    assert_eq!(i0, 0);
    assert_eq!(i1, 1);
    assert_eq!(i2, 2);
    assert_eq!(t.client.deposit_count(), 3);
}

#[test]
fn test_deposit_each_produces_unique_root() {
    let t = TestEnv::setup();
    t.init();

    let (_, r1) = t.client.deposit(&t.alice, &commitment(&t.env, 1));
    let (_, r2) = t.client.deposit(&t.alice, &commitment(&t.env, 2));
    let (_, r3) = t.client.deposit(&t.alice, &commitment(&t.env, 3));

    assert_ne!(r1, r2);
    assert_ne!(r2, r3);
    assert_ne!(r1, r3);
}

#[test]
fn test_deposit_roots_are_known_after_insert() {
    let t = TestEnv::setup();
    t.init();

    let (_, r1) = t.client.deposit(&t.alice, &commitment(&t.env, 1));
    let (_, r2) = t.client.deposit(&t.alice, &commitment(&t.env, 2));

    assert!(t.client.is_known_root(&r1));
    assert!(t.client.is_known_root(&r2));
}

#[test]
fn test_deposit_zero_commitment_rejected() {
    let t = TestEnv::setup();
    t.init();
    let zero = BytesN::from_array(&t.env, &[0u8; 32]);
    let result = t.client.try_deposit(&t.alice, &zero);
    assert!(result.is_err());
}

#[test]
fn test_deposit_while_paused_fails() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Security maintenance");
    t.client.pause(&t.admin, &reason);

    let result = t.client.try_deposit(&t.alice, &commitment(&t.env, 1));
    assert!(result.is_err());
}

// ──────────────────────────────────────────────────────────────
// Root History Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_unknown_root_returns_false() {
    let t = TestEnv::setup();
    t.init();
    let fake = BytesN::from_array(&t.env, &[0xFF; 32]);
    assert!(!t.client.is_known_root(&fake));
}

#[test]
fn test_root_history_circular_buffer_evicts_old_roots() {
    let t = TestEnv::setup();
    t.init();

    // Fund alice for 35 extra deposits
    StellarAssetClient::new(&t.env, &t.token_id)
        .mint(&t.alice, &(500 * DENOM_AMOUNT));

    // Capture first root
    let (_, first_root) = t.client.deposit(&t.alice, &commitment(&t.env, 1));
    assert!(t.client.is_known_root(&first_root));

    // Overflow the circular buffer (ROOT_HISTORY_SIZE = 30, we add 31 more)
    for i in 0..(ROOT_HISTORY_SIZE + 1) {
        t.client.deposit(&t.alice, &commitment(&t.env, i as u8 + 2));
    }

    // First root should now be evicted
    assert!(!t.client.is_known_root(&first_root));
}

// ──────────────────────────────────────────────────────────────
// Nullifier Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_nullifier_unspent_initially() {
    let t = TestEnv::setup();
    t.init();
    let nh = nullifier_hash(&t.env, 1);
    assert!(!t.client.is_spent(&nh));
}

// ──────────────────────────────────────────────────────────────
// Admin Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_pause_blocks_deposits() {
    let t = TestEnv::setup();
    t.init();

    // Deposit works before pause
    t.client.deposit(&t.alice, &commitment(&t.env, 1));

    // Pause with reason
    let reason = soroban_sdk::String::from_str(&t.env, "Security incident");
    t.client.pause(&t.admin, &reason);

    // Deposit blocked
    let result = t.client.try_deposit(&t.alice, &commitment(&t.env, 2));
    assert!(result.is_err());
}

#[test]
fn test_unpause_restores_deposits() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Maintenance");
    t.client.pause(&t.admin, &reason);
    t.client.unpause(&t.admin);

    // Deposit works again
    let (idx, _) = t.client.deposit(&t.alice, &commitment(&t.env, 1));
    assert_eq!(idx, 0);
}

#[test]
fn test_non_admin_cannot_pause() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Test");
    let result = t.client.try_pause(&t.alice, &reason); // alice is not admin
    assert!(result.is_err());
}

#[test]
fn test_non_admin_cannot_unpause() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Test");
    t.client.pause(&t.admin, &reason);
    let result = t.client.try_unpause(&t.bob);
    assert!(result.is_err());
}

#[test]
fn test_non_admin_cannot_set_vk() {
    let t = TestEnv::setup();
    t.init();
    let result = t.client.try_set_verifying_key(&t.alice, &dummy_vk(&t.env));
    assert!(result.is_err());
}

#[test]
fn test_admin_can_set_vk() {
    let t = TestEnv::setup();
    t.init();
    // No panic = success
    t.client.set_verifying_key(&t.admin, &dummy_vk(&t.env));
}

// ──────────────────────────────────────────────────────────────
// Emergency Pause Mechanism Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_is_paused_returns_false_initially() {
    let t = TestEnv::setup();
    t.init();
    let (is_paused, pause_info) = t.client.is_paused();
    assert!(!is_paused);
    assert!(pause_info.is_none());
}

#[test]
fn test_is_paused_returns_true_after_pause() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Emergency");
    t.client.pause(&t.admin, &reason);
    
    let (is_paused, pause_info) = t.client.is_paused();
    assert!(is_paused);
    assert!(pause_info.is_some());
    
    let info = pause_info.unwrap();
    assert_eq!(info.pause_reason, reason);
    assert_eq!(info.paused_by, t.admin);
}

#[test]
fn test_pause_is_idempotent() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "First pause");
    
    // Pause twice should not error
    t.client.pause(&t.admin, &reason);
    t.client.pause(&t.admin, &reason);
    
    let (is_paused, _) = t.client.is_paused();
    assert!(is_paused);
}

#[test]
fn test_unpause_is_idempotent() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Pause");
    
    t.client.pause(&t.admin, &reason);
    t.client.unpause(&t.admin);
    t.client.unpause(&t.admin); // Second unpause should not error
    
    let (is_paused, _) = t.client.is_paused();
    assert!(!is_paused);
}

#[test]
fn test_emergency_withdraw_requires_paused_pool() {
    let t = TestEnv::setup();
    t.init();
    
    // Pool is not paused
    let reason = soroban_sdk::String::from_str(&t.env, "Emergency withdraw");
    let result = t.client.try_emergency_withdraw(
        &t.admin,
        &t.bob,
        &100,
        &reason,
    );
    assert!(result.is_err());
}

#[test]
fn test_emergency_withdraw_requires_admin() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Pause");
    t.client.pause(&t.admin, &reason);
    
    // Alice is not admin
    let withdraw_reason = soroban_sdk::String::from_str(&t.env, "Emergency");
    let result = t.client.try_emergency_withdraw(
        &t.alice,
        &t.bob,
        &100,
        &withdraw_reason,
    );
    assert!(result.is_err());
}

#[test]
fn test_emergency_withdraw_rejects_zero_amount() {
    let t = TestEnv::setup();
    t.init();
    let reason = soroban_sdk::String::from_str(&t.env, "Pause");
    t.client.pause(&t.admin, &reason);
    
    let withdraw_reason = soroban_sdk::String::from_str(&t.env, "Emergency");
    let result = t.client.try_emergency_withdraw(
        &t.admin,
        &t.bob,
        &0,
        &withdraw_reason,
    );
    assert!(result.is_err());
}

#[test]
fn test_emergency_withdraw_rejects_excessive_amount() {
    let t = TestEnv::setup();
    t.init();
    
    // Make one deposit
    t.client.deposit(&t.alice, &commitment(&t.env, 1));
    
    // Pause
    let reason = soroban_sdk::String::from_str(&t.env, "Security incident");
    t.client.pause(&t.admin, &reason);
    
    // Try to withdraw more than balance
    let withdraw_reason = soroban_sdk::String::from_str(&t.env, "Emergency");
    let result = t.client.try_emergency_withdraw(
        &t.admin,
        &t.bob,
        &(2 * DENOM_AMOUNT), // More than contract balance
        &withdraw_reason,
    );
    assert!(result.is_err());
}

#[test]
fn test_emergency_withdraw_succeeds() {
    let t = TestEnv::setup();
    t.init();
    
    // Make a deposit
    t.client.deposit(&t.alice, &commitment(&t.env, 1));
    let contract_balance_before = t.contract_balance();
    let bob_before = t.token_balance(&t.bob);
    
    // Pause
    let pause_reason = soroban_sdk::String::from_str(&t.env, "Security incident");
    t.client.pause(&t.admin, &pause_reason);
    
    // Emergency withdraw
    let withdraw_amount = DENOM_AMOUNT / 2;
    let withdraw_reason = soroban_sdk::String::from_str(&t.env, "Recovering funds");
    t.client.emergency_withdraw(
        &t.admin,
        &t.bob,
        &withdraw_amount,
        &withdraw_reason,
    );
    
    // Verify balances
    assert_eq!(t.token_balance(&t.bob), bob_before + withdraw_amount);
    assert_eq!(t.contract_balance(), contract_balance_before - withdraw_amount);
}

// ──────────────────────────────────────────────────────────────
// View Function Tests
// ──────────────────────────────────────────────────────────────

#[test]
fn test_deposit_count_starts_at_zero() {
    let t = TestEnv::setup();
    t.init();
    assert_eq!(t.client.deposit_count(), 0);
}

#[test]
fn test_get_root_after_deposits() {
    let t = TestEnv::setup();
    t.init();
    t.client.deposit(&t.alice, &commitment(&t.env, 1));
    // get_root shouldn't panic after at least one deposit
    let root = t.client.get_root();
    assert_ne!(root, BytesN::from_array(&t.env, &[0u8; 32]));
}

// ──────────────────────────────────────────────────────────────
// Merkle Tree Internal Tests (direct function calls)
// ──────────────────────────────────────────────────────────────

#[test]
fn test_merkle_insert_returns_sequential_indices() {
    let env = Env::default();
    env.mock_all_auths();
    env.cost_estimate().budget().reset_unlimited();

    let contract_id = env.register(PrivacyPool, ());
    
    let c1 = BytesN::from_array(&env, &[1u8; 32]);
    let c2 = BytesN::from_array(&env, &[2u8; 32]);

    let (idx1, root1) = env.as_contract(&contract_id, || {
        crate::crypto::merkle::insert(&env, c1).unwrap()
    });
    let (idx2, root2) = env.as_contract(&contract_id, || {
        crate::crypto::merkle::insert(&env, c2).unwrap()
    });

    assert_eq!(idx1, 0);
    assert_eq!(idx2, 1);
    assert_ne!(root1, root2);
}

#[test]
fn test_merkle_is_known_root_after_insert() {
    let env = Env::default();
    env.mock_all_auths();
    env.cost_estimate().budget().reset_unlimited();

    let contract_id = env.register(PrivacyPool, ());
    
    let c = BytesN::from_array(&env, &[42u8; 32]);
    let root = env.as_contract(&contract_id, || {
        let (_, root) = crate::crypto::merkle::insert(&env, c).unwrap();
        root
    });

    let is_known = env.as_contract(&contract_id, || {
        crate::crypto::merkle::is_known_root(&env, &root)
    });
    assert!(is_known);

    let fake = BytesN::from_array(&env, &[0xFFu8; 32]);
    let is_fake_known = env.as_contract(&contract_id, || {
        crate::crypto::merkle::is_known_root(&env, &fake)
    });
    assert!(!is_fake_known);
}
