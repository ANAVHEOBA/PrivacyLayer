# Performance Monitoring Integration Guide

This guide explains how to integrate the monitoring system into the PrivacyLayer contracts.

## Contract Integration

### 1. Add Monitoring Module to Cargo.toml

```toml
[dependencies]
soroban-sdk = "21.0.0"
soroban-poseidon = { git = "https://github.com/stellar/rs-soroban-poseidon" }

[dev-dependencies]
soroban-sdk = { version = "21.0.0", features = ["testutils"] }
```

### 2. Import Monitoring Module

```rust
// In src/lib.rs or appropriate module
mod monitoring;

pub use monitoring::metrics::{
    DepositMetricsCollector,
    WithdrawMetricsCollector,
    ZkProofMetricsCollector,
    MerkleMetricsCollector,
    PoolStateMetricsCollector,
    AdminMetricsCollector,
    SecurityMetricsCollector,
    PerformanceTimer,
};
```

### 3. Instrument Deposit Operation

```rust
// In src/core/deposit.rs
use crate::monitoring::{
    DepositMetricsCollector, PerformanceTimer
};

pub fn execute(
    env: Env,
    from: Address,
    commitment: BytesN<32>,
) -> Result<(u32, BytesN<32>), Error> {
    // Start timing
    let timer = PerformanceTimer::new(&env, "deposit");
    
    from.require_auth();

    let pool_config = config::load(&env)?;
    validation::require_not_paused(&pool_config)?;
    validation::require_non_zero_commitment(&env, &commitment)?;

    let amount = pool_config.denomination.amount();
    let token_client = token::Client::new(&env, &pool_config.token);
    token_client.transfer(&from, &env.current_contract_address(), &amount);

    let (leaf_index, new_root) = merkle::insert(&env, commitment.clone())?;
    
    emit_deposit(&env, commitment, leaf_index, new_root.clone());

    // Record success metrics
    DepositMetricsCollector::record_success(&env, &timer, leaf_index, amount);

    Ok((leaf_index, new_root))
}
```

### 4. Instrument Withdraw Operation

```rust
// In src/core/withdraw.rs
use crate::monitoring::{
    WithdrawMetricsCollector, ZkProofMetricsCollector, PerformanceTimer
};

pub fn execute(
    env: Env,
    proof: Proof,
    pub_inputs: PublicInputs,
) -> Result<bool, Error> {
    let timer = PerformanceTimer::new(&env, "withdraw");
    
    // Time ZK proof verification separately
    let zk_timer = PerformanceTimer::new(&env, "zk_verify");
    let vk = config::load_verifying_key(&env)?;
    let proof_valid = verifier::verify_proof(&env, &vk, &proof, &pub_inputs)?;
    ZkProofMetricsCollector::record_verification(
        &env, 
        zk_timer.elapsed_ms(&env), 
        proof_valid
    );
    
    if !proof_valid {
        WithdrawMetricsCollector::record_failure(&env, &timer, Error::InvalidProof);
        return Err(Error::InvalidProof);
    }

    WithdrawMetricsCollector::record_success(&env, &timer, fee, denomination_amount);
    Ok(true)
}
```

## External Monitoring Setup

### Prometheus Integration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'privacypool'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:9090']
```

### Grafana Integration

1. Add Prometheus data source
2. Import dashboard from `grafana/dashboards/privacypool_dashboard.json`

## Best Practices

1. Always use timers for latency tracking
2. Record both success and failure paths
3. Avoid high-cardinality labels
4. Document custom metrics