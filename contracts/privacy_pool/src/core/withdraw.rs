use soroban_sdk::{Env, Symbol, Bytes, Address, Vec};
use crate::utils::{address_decoder::decode_optional_address, validation::validate_relayer};
use crate::storage::{config::Config, analytics::Analytics};

pub fn withdraw(
    env: &Env,
    recipient: Address,
    amount: i128,
    relayer_field: Bytes,
    // other params omitted
) -> Result<(), Symbol> {
    // 1️⃣ Validate relayer encoding first
    validate_relayer(env, &relayer_field)?;

    // 2️⃣ Decode optional relayer address (if present)
    let relayer_opt = decode_optional_address(env, &relayer_field)?;

    // 3️⃣ If a relayer is present, enforce fee rules
    if let Some(relayer_addr) = relayer_opt {
        // Extract fee (bytes 33..41) – safe because validation guarantees length
        let fee_bytes = relayer_field.slice(33, 41);
        let mut fee: u64 = 0;
        for i in 0..8 {
            fee |= (fee_bytes.get(i) as u64) << (8 * i);
        }

        // Example rule: fee must be ≤ max_fee from config
        let cfg = Config::load(env);
        if fee > cfg.max_relayer_fee {
            return Err(Symbol::short("fee_exceeds_max"));
        }

        // Transfer fee to relayer
        // (Assume `transfer` is a helper that moves native tokens)
        transfer(env, &env.current_contract_address(), &relayer_addr, fee as i128)?;
    }

    // 4️⃣ Perform the core withdrawal logic (unchanged)
    // ...

    // 5️⃣ Emit analytics event
    Analytics::record_withdraw(env, &recipient, amount, relayer_opt);

    Ok(())
}

/* Placeholder transfer helper – actual implementation resides elsewhere */
fn transfer(env: &Env, from: &Address, to: &Address, amount: i128) -> Result<(), Symbol> {
    // Simplified: invoke the native token contract's transfer method.
    // In production this would handle errors, auth, etc.
    let token = env.register_contract_wasm(
        &Symbol::short("native_token"),
        include_bytes!("../../../../artifacts/stellar_token.wasm"),
    );
    env.invoke_contract(
        &token,
        &Symbol::short("transfer"),
        (from.clone(), to.clone(), amount),
    )
}
