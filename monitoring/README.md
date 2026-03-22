# PrivacyLayer Performance Monitoring System

This directory contains the complete performance monitoring infrastructure for PrivacyLayer.

## Overview

The monitoring system provides comprehensive observability for:
- Core operations (deposits/withdrawals)
- ZK proof verification performance
- Merkle tree operations
- Security metrics
- System health

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PrivacyLayer Contract                        │
│                          (Soroban)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Metrics Collectors                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Deposit    │ │   Withdraw   │ │   ZK Proof   │            │
│  │   Metrics    │ │   Metrics    │ │   Metrics    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Merkle     │ │   Security   │ │   Pool State │            │
│  │   Metrics    │ │   Metrics    │ │   Metrics    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Metrics Aggregator                           │
│           (Time-windowed statistics)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Exporters                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  Prometheus  │ │   Datadog    │ │  New Relic   │            │
│  │   Exporter   │ │   Exporter   │ │   Exporter   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Visualization & Alerting                     │
│  ┌──────────────────────────────┐ ┌─────────────────────────┐  │
│  │       Grafana Dashboard      │ │   Prometheus Alerting   │  │
│  │  ┌────────────────────────┐  │ │   ┌─────────────────┐   │  │
│  │  │  System Overview       │  │ │   │  Error Alerts   │   │  │
│  │  │  Operation Metrics     │  │ │   │  Latency Alerts │   │  │
│  │  │  ZK Proof Performance  │  │ │   │  Security Alerts│   │  │
│  │  │  Merkle Tree Metrics   │  │ │   │  Health Alerts  │   │  │
│  │  │  Security Metrics      │  │ │   └─────────────────┘   │  │
│  │  └────────────────────────┘  │ │                         │  │
│  └──────────────────────────────┘ └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
monitoring/
├── metrics/
│   ├── mod.rs              # Module entry point
│   ├── types.rs            # Metric types and definitions
│   ├── collectors.rs       # Metrics collectors
│   ├── exporters.rs        # Exporters for various backends
│   └── aggregator.rs       # Metrics aggregation logic
├── alerts/
│   └── alert_rules.yml     # Prometheus alerting rules
├── grafana/
│   └── dashboards/
│       └── privacypool_dashboard.json  # Grafana dashboard config
└── README.md               # This file
```

## Metrics Reference

### Deposit Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_deposit_count_total` | Counter | Total number of deposits |
| `privacypool_deposit_latency_seconds` | Histogram | Deposit operation latency |
| `privacypool_deposit_errors_total` | Counter | Total deposit errors |
| `privacypool_deposit_gas_used` | Histogram | Gas used per deposit |
| `privacypool_deposit_amount_total` | Counter | Total amount deposited |

### Withdraw Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_withdraw_count_total` | Counter | Total number of withdrawals |
| `privacypool_withdraw_latency_seconds` | Histogram | Withdraw operation latency |
| `privacypool_withdraw_errors_total` | Counter | Total withdraw errors |
| `privacypool_withdraw_gas_used` | Histogram | Gas used per withdrawal |
| `privacypool_withdraw_amount_total` | Counter | Total amount withdrawn |
| `privacypool_withdraw_fee_total` | Counter | Total fees paid to relayers |

### ZK Proof Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_zk_proof_verification_seconds` | Histogram | Proof verification time |
| `privacypool_zk_proof_success_rate` | Gauge | Proof verification success rate |
| `privacypool_zk_proof_failures_total` | Counter | Total proof verification failures |

### Merkle Tree Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_merkle_insert_latency_seconds` | Histogram | Merkle insert latency |
| `privacypool_merkle_tree_depth` | Gauge | Current tree depth (fixed at 20) |
| `privacypool_merkle_leaves_count` | Gauge | Number of leaves in tree |
| `privacypool_merkle_root_updates_total` | Counter | Total root updates |
| `privacypool_merkle_root_history_size` | Gauge | Root history buffer size (fixed at 30) |

### Nullifier Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_nullifier_checks_total` | Counter | Total nullifier checks |
| `privacypool_nullifier_spent_count` | Gauge | Number of spent nullifiers |
| `privacypool_nullifier_double_spend_attempts_total` | Counter | Double spend attempts |

### Pool State Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_balance` | Gauge | Current pool balance |
| `privacypool_paused` | Gauge | Pool pause status (0/1) |
| `privacypool_denomination` | Gauge | Pool denomination |

### Security Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_admin_operations_total` | Counter | Total admin operations |
| `privacypool_unauthorized_access_attempts_total` | Counter | Unauthorized access attempts |
| `privacypool_root_validation_failures_total` | Counter | Root validation failures |

### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `privacypool_contract_call_duration_seconds` | Histogram | Contract call duration |
| `privacypool_storage_read_ops_total` | Counter | Storage read operations |
| `privacypool_storage_write_ops_total` | Counter | Storage write operations |
| `privacypool_events_emitted_total` | Counter | Total events emitted |

## Alert Rules

The alerting system is configured in `alerts/alert_rules.yml`. Key alerts include:

### Operations Alerts
- **HighDepositErrorRate**: Error rate > 10%
- **HighWithdrawErrorRate**: Error rate > 10%
- **SlowDepositLatency**: P95 latency > 30s
- **SlowWithdrawLatency**: P95 latency > 60s

### ZK Proof Alerts
- **HighZkProofFailureRate**: Failure rate > 5%
- **SlowZkProofVerification**: P95 > 5s

### Merkle Tree Alerts
- **MerkleTreeNearCapacity**: Leaves > 1,000,000
- **MerkleTreeFull**: Leaves = 1,048,576
- **SlowMerkleInsert**: P95 > 1s

### Security Alerts
- **DoubleSpendAttempts**: Any double spend attempt
- **UnauthorizedAccessAttempts**: Rate > 0.1/s
- **HighRootValidationFailures**: Rate > 0.5/s

## Setup Instructions

### 1. Prometheus Setup

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'privacypool'
    static_configs:
      - targets: ['localhost:9090']
rule_files:
  - 'alerts/alert_rules.yml'
```

### 2. Grafana Setup

1. Import the dashboard from `grafana/dashboards/privacypool_dashboard.json`
2. Configure Prometheus as a data source
3. Set up alert notification channels

### 3. Alertmanager Setup

```yaml
# alertmanager.yml
route:
  receiver: 'privacypool-alerts'
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
receivers:
  - name: 'privacypool-alerts'
    slack_configs:
      - channel: '#privacypool-alerts'
        send_resolved: true
```

### 4. Datadog Integration (Optional)

```rust
// Configure in your application
let config = DatadogConfig {
    api_key: env::var("DD_API_KEY").unwrap(),
    app_key: env::var("DD_APP_KEY").unwrap(),
    site: "api.datadoghq.com".to_string(),
    env: "production".to_string(),
    service: "privacypool".to_string(),
};
let exporter = DatadogExporter::new(config);
```

### 5. New Relic Integration (Optional)

```rust
let config = NewRelicConfig {
    api_key: env::var("NEW_RELIC_API_KEY").unwrap(),
    account_id: env::var("NEW_RELIC_ACCOUNT_ID").unwrap(),
    region: "US".to_string(),
    service_name: "privacypool".to_string(),
};
let exporter = NewRelicExporter::new(config);
```

## Best Practices

### Metric Collection
1. Use histograms for latency measurements (enables percentiles)
2. Label metrics appropriately for filtering
3. Avoid high-cardinality labels

### Alerting
1. Set appropriate thresholds based on SLAs
2. Use `for` clauses to avoid alert flapping
3. Document runbooks for each alert

### Dashboard Design
1. Group related metrics together
2. Use appropriate visualization types
3. Include both current state and trends

## Troubleshooting

### Common Issues

1. **Missing Metrics**
   - Check that collectors are properly initialized
   - Verify exporter configuration

2. **High Latency Alerts**
   - Check network connectivity
   - Review gas prices on the network
   - Consider caching strategies

3. **False Positive Security Alerts**
   - Tune threshold values
   - Add known relayer addresses to allowlist

## Contributing

When adding new metrics:
1. Add metric definition to `types.rs`
2. Add collector to appropriate collector module
3. Update this README with metric documentation
4. Add relevant alerts if needed
5. Update Grafana dashboard

## License

MIT License - See LICENSE file for details.