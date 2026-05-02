// ============================================================
// ZK-073: Relayer Binding Regression Tests (Contract Side)
// ============================================================
// These tests verify that the contract correctly handles all three
// relayer binding modes:
//   Mode 1: No relayer (relayer=0, fee=0)
//   Mode 2: Relayer + fee (relayer≠0, fee>0)
//   Mode 3: Malformed relayer (rejected)
//
// Key regression: absent relayer must be cleanly distinguished
// from malformed relayer.
// ============================================================

#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, BytesN, Env,
};

use crate::{
    types::errors::Error,
    types::state::{Denomination, PoolId, VerifyingKey},
    utils::address_decoder,
    PrivacyPool, PrivacyPoolClient,
};

const DENOM_AMOUNT: i128 = 1_000_000_000; // 100 XLM

struct RelayerTestEnv {
    pub env:         Env,
    pub client:      PrivacyPoolClient<'static>,
    pub token_id:    Address,
    pub admin:       Address,
    pub alice:       Address,
    pub bob:         Address,
    pub pool_1:      PoolId,
}

impl RelayerTestEnv {
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        env.cost_estimate().budget().reset_unlimited();

        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract_v2(token_admin).address();

        let admin = Address::generate(&env);
        let contract_id = env.register(PrivacyPool, ());
        let client = PrivacyPoolClient::new(&env, &contract_id);

        let alice = Address::generate(&env);
        let bob   = Address::generate(&env);

        StellarAssetClient::new(&env, &token_id).mint(&alice, &(50 * DENOM_AMOUNT));
        StellarAssetClient::new(&env, &token_id).mint(&bob, &(50 * DENOM_AMOUNT));

        let pool_1 = PoolId(BytesN::from_array(&env, &[1u8; 32]));

        RelayerTestEnv { env, client, token_id, admin, alice, bob, pool_1 }
    }

    fn init(&self) {
        self.client.initialize(&self.admin);
        self.client.create_pool(
            &self.pool_1,
            &self.token_id,
            &Denomination::Xlm100,
            &dummy_vk(&self.env),
        );
    }
}

fn dummy_vk(env: &Env) -> VerifyingKey {
    let g1 = BytesN::from_array(env, &[0u8; 64]);
    let g2 = BytesN::from_array(env, &[0u8; 128]);
    let mut abc = soroban_sdk::Vec::new(env);
    for _ in 0..9 { abc.push_back(g1.clone()); }
    VerifyingKey { alpha_g1: g1, beta_g2: g2.clone(), gamma_g2: g2.clone(), delta_g2: g2, gamma_abc_g1: abc }
}

// ============================================================
// address_decoder unit tests (ZK-073)
// ============================================================

#[test]
fn test_zk073_zero_relayer_returns_none() {
    let env = Env::default();
    let zero_bytes = BytesN::from_array(&env, &[0u8; 32]);
    let result = address_decoder::decode_optional_relayer(&env, &zero_bytes);
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[test]
fn test_zk073_no_relayer_zero_fee_binding_valid() {
    // Mode 1: No relayer, fee=0 → valid
    let result = address_decoder::validate_relayer_fee_binding(&None, 0);
    assert!(result.is_ok());
}

#[test]
fn test_zk073_orphan_fee_rejected() {
    // Mode 3: No relayer, but fee>0 → orphan fee → REJECTED
    let result = address_decoder::validate_relayer_fee_binding(&None, 100);
    assert_eq!(result, Err(Error::InvalidRelayerFee));
}

#[test]
fn test_zk073_phantom_relayer_rejected() {
    // Mode 3: Relayer present, but fee=0 → phantom relayer → REJECTED
    let env = Env::default();
    let addr = Address::generate(&env);
    let result = address_decoder::validate_relayer_fee_binding(&Some(addr), 0);
    assert_eq!(result, Err(Error::InvalidRelayerFee));
}

#[test]
fn test_zk073_relayer_with_fee_binding_valid() {
    // Mode 2: Relayer present, fee>0 → valid
    let env = Env::default();
    let addr = Address::generate(&env);
    let result = address_decoder::validate_relayer_fee_binding(&Some(addr), 50);
    assert!(result.is_ok());
}

#[test]
fn test_zk073_relayer_with_full_fee_binding_valid() {
    // Mode 2: Relayer present, fee=amount → valid (full fee)
    let env = Env::default();
    let addr = Address::generate(&env);
    let result = address_decoder::validate_relayer_fee_binding(&Some(addr), DENOM_AMOUNT);
    assert!(result.is_ok());
}

#[test]
fn test_zk073_distinguishes_absent_from_malformed() {
    // ZK-073 regression: absent relayer must be cleanly distinguished
    // from malformed relayer.

    let env = Env::default();

    // Absent: all-zero bytes → None
    let zero_bytes = BytesN::from_array(&env, &[0u8; 32]);
    let absent = address_decoder::decode_optional_relayer(&env, &zero_bytes);
    assert!(absent.is_ok());
    assert!(absent.unwrap().is_none());

    // The absent case with fee=0 is valid
    let valid_binding = address_decoder::validate_relayer_fee_binding(&None, 0);
    assert!(valid_binding.is_ok());

    // The absent case with fee>0 is invalid (orphan fee)
    let orphan = address_decoder::validate_relayer_fee_binding(&None, 1);
    assert_eq!(orphan, Err(Error::InvalidRelayerFee));

    // A real relayer with fee=0 is invalid (phantom)
    let addr = Address::generate(&env);
    let phantom = address_decoder::validate_relayer_fee_binding(&Some(addr), 0);
    assert_eq!(phantom, Err(Error::InvalidRelayerFee));
}
