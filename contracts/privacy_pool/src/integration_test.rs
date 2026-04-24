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
    types::state::{DataKey, Denomination, PoolId, Proof, PublicInputs, VerifyingKey},
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

    let pool_id = PoolId(BytesN::from_array(&env, &[7u8; 32]));

    client.initialize(&admin);
    client.create_pool(&pool_id, &token_id, &Denomination::Xlm100, &dummy_vk(&env));

    (env, client, token_id, admin, alice, bob, pool_id)
}

fn dummy_vk(env: &Env) -> VerifyingKey {
    let g1 = BytesN::from_array(env, &[0u8; 64]);
    let g2 = BytesN::from_array(env, &[0u8; 128]);
    let mut abc = Vec::new(env);
    for _ in 0..7 {
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
    PoolId(BytesN::from_array(env, &[seed; 32]))
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
        root: fake_root,
        nullifier_hash: make_nullifier_hash(&env, 5),
        recipient: field(&env, 0xBB),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
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
        env.storage().persistent().set(
            &DataKey::Nullifier(pool_id.clone(), nullifier_hash.clone()),
            &true,
        );
    });

    assert!(client.is_spent(&pool_id, &nullifier_hash));

    let pub_inputs = PublicInputs {
        root,
        nullifier_hash,
        recipient: field(&env, 0xCC),
        amount: field(&env, 1),
        relayer: BytesN::from_array(&env, &[0u8; 32]),
        fee: BytesN::from_array(&env, &[0u8; 32]),
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
