#![cfg(test)]

use soroban_sdk::{Env, Bytes, Symbol, testutils::Address as TestAddress};
use crate::core::withdraw::withdraw;
use crate::storage::config::Config;

#[test]
fn test_withdraw_no_relayer() {
    let env = Env::default();
    // Set up a minimal config (max fee irrelevant)
    Config::set_max_relayer_fee(&env, 0);

    let recipient = TestAddress::generate(&env);
    let amount: i128 = 1_000_000;
    // Relayer field = single zero byte (no relayer)
    let relayer = Bytes::from_slice(&env, &[0u8]);

    // Should succeed without fee transfer
    assert!(withdraw(&env, recipient.clone(), amount, relayer).is_ok());
}

#[test]
fn test_withdraw_with_valid_relayer() {
    let env = Env::default();
    Config::set_max_relayer_fee(&env, 10_000);

    let recipient = TestAddress::generate(&env);
    let relayer_addr = TestAddress::generate(&env);
    let fee: u64 = 5_000;

    // Build canonical relayer encoding: flag=1, address (32 bytes), fee (8 LE)
    let mut data = vec![1u8];
    data.extend_from_slice(&relayer_addr.to_bytes().as_slice());
    for i in 0..8 {
        data.push(((fee >> (8 * i)) & 0xff) as u8);
    }
    let relayer = Bytes::from_slice(&env, &data);

    // Expect success and fee transfer (mocked token contract not exercised here)
    assert!(withdraw(&env, recipient, 1_000_000, relayer).is_ok());
}

#[test]
fn test_withdraw_malformed_relayer_flag() {
    let env = Env::default();
    Config::set_max_relayer_fee(&env, 10_000);

    let recipient = TestAddress::generate(&env);
    // Invalid flag (2) with correct length – should be rejected
    let mut data = vec![2u8];
    data.extend_from_slice(&[0u8; 40]); // filler
    let relayer = Bytes::from_slice(&env, &data);

    let res = withdraw(&env, recipient, 1_000_000, relayer);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), Symbol::short("invalid_relayer_flag"));
}

#[test]
fn test_withdraw_malformed_no_relayer_extra_bytes() {
    let env = Env::default();
    Config::set_max_relayer_fee(&env, 10_000);

    let recipient = TestAddress::generate(&env);
    // Flag=0 but extra bytes present
    let relayer = Bytes::from_slice(&env, &[0u8, 1u8, 2u8]);

    let res = withdraw(&env, recipient, 1_000_000, relayer);
    assert!(res.is_err());
    assert_eq!(res.unwrap_err(), Symbol::short("malformed_no_relayer"));
}
