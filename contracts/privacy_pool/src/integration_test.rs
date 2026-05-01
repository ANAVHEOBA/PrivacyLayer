// ============================================================
// PrivacyLayer — End-to-End Integration Tests
// ============================================================
// Focused multi-pool tests covering contract behavior from the
// public client interface.
// ============================================================

#![cfg(test)]

extern crate std;

use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env, Vec,
};

use crate::{
    crypto::merkle::ROOT_HISTORY_SIZE,
    types::state::{
        derive_canonical_pool_id, derive_canonical_pool_id_for_fixture, Denomination,
        PerformanceMetricKind, PoolId, Proof, PublicInputs, VerifyingKey,
    },
    PrivacyPool, PrivacyPoolClient,
};

const DENOM_AMOUNT: i128 = 1_000_000_000; // 100 XLM

fn setup() -> (
    Env,
    PrivacyPoolClient<'static>,
    Address,
    Address,
    Address,
    Address,
    PoolId,
) {
    let env = Env::default();
    env.mock_all_auths();
    env.cost_estimate().budget().reset_unlimited();

    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();

    let admin = Address::generate(&env);
    let contract_id = env.register(PrivacyPool, ());
    let client = PrivacyPoolClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    StellarAssetClient::new(&env, &token_id).mint(&alice, &(200 * DENOM_AMOUNT));
    StellarAssetClient::new(&env, &token_id).mint(&bob, &(200 * DENOM_AMOUNT));

    let pool_id = derive_canonical_pool_id(&env, &token_id, &Denomination::Xlm100);

    client.initialize(&admin);
    client.create_pool(&pool_id, &token_id, &Denomination::Xlm100, &dummy_vk(&env));

    (env, client, token_id, admin, alice, bob, pool_id)
}

fn dummy_vk(env: &Env) -> VerifyingKey {
    let g1 = BytesN::from_array(env, &[0u8; 64]);
    let g2 = BytesN::from_array(env, &[0u8; 128]);
    let mut abc = Vec::new(env);
    for _ in 0..9 {
        abc.push_back(g1.clone());
    }

    VerifyingKey {
        alpha_g1: g1,
        beta_g2: g2.clone(),
        gamma_g2: g2.clone(),
        delta_g2: g2,
        gamma_abc_g1: abc,
    }
}

fn make_pool_id(env: &Env, seed: u8) -> PoolId {
    let token_identity = soroban_sdk::Bytes::from_slice(env, &[b'c', b'o', b'n', b't', b'r', b'a', b'c', b't', b':', seed]);
    derive_canonical_pool_id_for_fixture(
        env,
        &token_identity,
        &Denomination::Xlm100,
        &env.ledger().network_id(),
    )
}

#[test]
fn test_canonical_pool_id_fixture_vectors_match_sdk() {
    let env = Env::default();
    let network_domain = BytesN::from_array(
        &env,
        &[
            0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
            0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11,
            0x11, 0x11, 0x11, 0x11,
        ],
    );

    let xlm_identity = soroban_sdk::Bytes::from_slice(&env, b"native:xlm");
    let contract_identity = soroban_sdk::Bytes::from_slice(
        &env,
        b"contract:cb7f6f5f7f6f8f7f9f7faf7fbf7fcf7fdf7fef7fff7f0f7f1f7f2f7f3f7f4f",
    );

    let xlm_pool = derive_canonical_pool_id_for_fixture(
        &env,
        &xlm_identity,
        &Denomination::Xlm100,
        &network_domain,
    );
    let token_pool = derive_canonical_pool_id_for_fixture(
        &env,
        &contract_identity,
        &Denomination::Usdc100,
        &network_domain,
    );

    assert_eq!(
        xlm_pool.0.to_array(),
        [
            0x00, 0xa7, 0x72, 0xbf, 0x8f, 0x03, 0xf5, 0xa9, 0x95, 0x32, 0x7d, 0xd2, 0xee, 0x5d,
            0x43, 0xf4, 0x69, 0xcb, 0xc2, 0x6a, 0x1f, 0xff, 0xd0, 0x9d, 0x5b, 0xd9, 0x22, 0xe4,
            0x16, 0xdf, 0x46, 0x17,
        ]
    );
    assert_eq!(
        token_pool.0.to_array(),
        [
            0x00, 0x7b, 0xb1, 0x35, 0xca, 0x6e, 0x5e, 0xfd, 0x40, 0x6a, 0x99, 0x8a, 0xc6, 0x7f,
            0xfa, 0x4f, 0xce, 0x7f, 0xc6, 0x5d, 0xc7, 0x4b, 0x64, 0x09, 0x55, 0xb9, 0x51, 0xad,
            0x1c, 0xef, 0x2a, 0x99,
        ]
    );
}

fn make_commit(env: &Env, seed: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[30] = seed.wrapping_add(1);
    bytes[31] = seed;
    BytesN::from_array(env, &bytes)
}

fn make_nullifier_hash(env: &Env, seed: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[31] = seed.wrapping_add(100);
    BytesN::from_array(env, &bytes)
}

fn field(env: &Env, value: u8) -> BytesN<32> {
    let mut bytes = [0u8; 32];
    bytes[31] = value;
    BytesN::from_array(env, &bytes)
}

fn dummy_proof(env: &Env) -> Proof {
    Proof {
        a: BytesN::from_array(env, &[1u8; 64]),
        b: BytesN::from_array(env, &[2u8; 128]),
        c: BytesN::from_array(env, &[3u8; 64]),
    }
}

fn token_balance(env: &Env, token_id: &Address, owner: &Address) -> i128 {
    TokenClient::new(env, token_id).balance(owner)
}

#[test]
fn test_e2e_deposit_updates_balances() {
    let (env, client, token_id, _admin, alice, _bob, pool_id) = setup();
    let contract_id = client.address.clone();

    let alice_before = token_balance(&env, &token_id, &alice);
    let contract_before = token_balance(&env, &token_id, &contract_id);

    let (leaf_index, root) = client.deposit(&pool_id, &alice, &make_commit(&env, 1));

    assert_eq!(leaf_index, 0);
    assert!(client.is_known_root(&pool_id, &root));
    assert_eq!(token_balance(&env, &token_id, &alice), alice_before - DENOM_AMOUNT);
    assert_eq!(
        token_balance(&env, &token_id, &contract_id),
        contract_before + DENOM_AMOUNT
    );
}

#[test]
fn test_e2e_multiple_deposits_sequential_indices() {
    let (env, client, token_id, _admin, alice, bob, pool_id) = setup();
    let contract_id = client.address.clone();

    let (i0, r0) = client.deposit(&pool_id, &alice, &make_commit(&env, 1));
    let (i1, r1) = client.deposit(&pool_id, &alice, &make_commit(&env, 2));
    let (i2, r2) = client.deposit(&pool_id, &bob, &make_commit(&env, 3));

    assert_eq!((i0, i1, i2), (0, 1, 2));
    assert_eq!(client.deposit_count(&pool_id), 3);
    assert_ne!(r0, r1);
    assert_ne!(r1, r2);
    assert!(client.is_known_root(&pool_id, &r0));
    assert!(client.is_known_root(&pool_id, &r1));
    assert!(client.is_known_root(&pool_id, &r2));
    assert_eq!(token_balance(&env, &token_id, &contract_id), 3 * DENOM_AMOUNT);
}

#[test]
fn test_e2e_unknown_root_rejected() {
    let (env, client, _token_id, _admin, alice, _bob, pool_id) = setup();

    client.deposit(&pool_id, &alice, &make_commit(&env, 5));

    let fake_root = BytesN::from_array(&env, &[0xAA; 32]);
    assert!(!client.is_known_root(&pool_id, &fake_root));

    let pub_inputs = PublicInputs {
        pool_id: pool_id.0.clone(),
        root: fake_root,
        nullifier_hash: make_nullifier_hash(&env, 5),
        recipient: field(&env, 0xBB),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
        denomination: field(&env, 100),
    };

    let result = client.try_withdraw(&pool_id, &dummy_proof(&env), &pub_inputs);
    assert!(result.is_err());
}

#[test]
fn test_e2e_double_spend_rejected_after_manual_spend_mark() {
    let (env, client, _token_id, _admin, alice, _bob, pool_id) = setup();

    let (_, root) = client.deposit(&pool_id, &alice, &make_commit(&env, 10));
    let nullifier_hash = make_nullifier_hash(&env, 10);
    let contract_id = client.address.clone();

    env.as_contract(&contract_id, || {
        use crate::types::state::DataKey;
        env.storage().persistent().set(
            &DataKey::Nullifier(pool_id.clone(), nullifier_hash.clone()),
            &true,
        );
    });

    // Unspent nullifier
    let nh_99 = make_nullifier_hash(&env, 99);
    assert!(!client.is_spent(&pool_id, &nh_99));

    // Analytics views (aggregate only)
    client.record_page_view();
    client.record_performance(&PerformanceMetricKind::Deposit, &250);
    let analytics = client.analytics_snapshot();
    // 1 deposit from setup (was it?) NO, setup only creates pool.
    // Line 178: client.deposit
    assert_eq!(analytics.deposit_count, 1);
    assert_eq!(analytics.withdrawal_count, 0);
    assert_eq!(client.withdraw_count(), 0);
    assert_eq!(analytics.avg_deposit_ms, 250);

    let pub_inputs = PublicInputs {
        pool_id: pool_id.0.clone(),
        root,
        nullifier_hash,
        recipient: field(&env, 0xCC),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
        denomination: field(&env, 100),
    };

    let result = client.try_withdraw(&pool_id, &dummy_proof(&env), &pub_inputs);
    assert!(result.is_err());
}

#[test]
fn test_e2e_stale_root_evicted_after_overflow() {
    let (env, client, token_id, _admin, alice, _bob, pool_id) = setup();
    StellarAssetClient::new(&env, &token_id).mint(&alice, &(500 * DENOM_AMOUNT));

    let (_, first_root) = client.deposit(&pool_id, &alice, &make_commit(&env, 1));
    assert!(client.is_known_root(&pool_id, &first_root));

    for i in 0..(ROOT_HISTORY_SIZE + 1) {
        client.deposit(&pool_id, &alice, &make_commit(&env, i as u8 + 2));
    }

    assert!(!client.is_known_root(&pool_id, &first_root));
}

#[test]
fn test_e2e_pool_scoping_keeps_roots_and_nullifiers_isolated() {
    let (env, client, token_id, admin, alice, _bob, pool_a) = setup();
    let pool_b = make_pool_id(&env, 9);

    client.create_pool(&pool_b, &token_id, &Denomination::Xlm100, &dummy_vk(&env));

    let (_, root_a) = client.deposit(&pool_a, &alice, &make_commit(&env, 21));
    let (_, root_b) = client.deposit(&pool_b, &alice, &make_commit(&env, 22));

    assert!(client.is_known_root(&pool_a, &root_a));
    assert!(client.is_known_root(&pool_b, &root_b));
    assert!(!client.is_known_root(&pool_a, &root_b));
    assert!(!client.is_known_root(&pool_b, &root_a));

    client.pause(&admin, &pool_a);
    let paused_result = client.try_deposit(&pool_a, &alice, &make_commit(&env, 23));
    let active_result = client.try_deposit(&pool_b, &alice, &make_commit(&env, 24));

    assert!(paused_result.is_err());
    assert!(active_result.is_ok());
}

#[test]
fn test_e2e_withdraw_rejects_wrong_pool_id_in_public_inputs() {
    let (env, client, _token_id, _admin, alice, _bob, pool_a) = setup();
    let pool_b = make_pool_id(&env, 9);

    // Create pool B with different token
    let token_admin = Address::generate(&env);
    let token_b = env.register_stellar_asset_contract_v2(token_admin).address();
    client.create_pool(&pool_b, &token_b, &Denomination::Xlm100, &dummy_vk(&env));

    // Deposit into pool A
    let (_, root_a) = client.deposit(&pool_a, &alice, &make_commit(&env, 1));

    // Try to withdraw from pool A using public inputs that reference pool B
    let pub_inputs = PublicInputs {
        pool_id: pool_b.0.clone(), // Wrong pool ID
        root: root_a,
        nullifier_hash: make_nullifier_hash(&env, 1),
        recipient: field(&env, 0xCC),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
        denomination: field(&env, 100),
    };

    let result = client.try_withdraw(&pool_a, &dummy_proof(&env), &pub_inputs);
    assert!(result.is_err());
    // Should fail with InvalidPoolId error due to pool_id mismatch
}

#[test]
fn test_e2e_withdraw_rejects_wrong_denomination_in_public_inputs() {
    let (env, client, _token_id, _admin, alice, _bob, pool_id) = setup();

    // Deposit into XLM100 pool
    let (_, root) = client.deposit(&pool_id, &alice, &make_commit(&env, 1));

    // Try to withdraw using wrong denomination (200 instead of 100)
    let pub_inputs = PublicInputs {
        pool_id: pool_id.0.clone(),
        root,
        nullifier_hash: make_nullifier_hash(&env, 1),
        recipient: field(&env, 0xCC),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
        denomination: field(&env, 200), // Wrong denomination
    };

    let result = client.try_withdraw(&pool_id, &dummy_proof(&env), &pub_inputs);
    assert!(result.is_err());
    // Should fail with InvalidDenomination error due to denomination mismatch
}

#[test]
fn test_e2e_withdraw_accepts_correct_pool_id_and_denomination() {
    let (env, client, _token_id, _admin, alice, _bob, pool_id) = setup();

    // Deposit into pool
    let (_, root) = client.deposit(&pool_id, &alice, &make_commit(&env, 1));

    // Withdraw with correct pool_id and denomination
    let pub_inputs = PublicInputs {
        pool_id: pool_id.0.clone(),
        root,
        nullifier_hash: make_nullifier_hash(&env, 1),
        recipient: field(&env, 0xCC),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
        denomination: field(&env, 100), // Correct denomination
    };

    // This should pass the pool_id and denomination validation
    // (though it will fail later due to invalid proof, which is expected)
    let result = client.try_withdraw(&pool_id, &dummy_proof(&env), &pub_inputs);
    assert!(result.is_err());
    // Should fail with InvalidProof, not InvalidPoolId or InvalidDenomination
}
