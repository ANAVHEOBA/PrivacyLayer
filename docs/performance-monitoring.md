# PrivacyLayer Performance Monitoring System

> **Comprehensive performance monitoring for the ZK-proof shielded pool on Stellar Soroban**

## Overview

This document describes the Performance Monitoring System implemented for PrivacyLayer. The system provides real-time visibility into contract operations, ZK proof performance, Merkle tree health, and security metrics.

## Key Components

| Component | Description |
|-----------|-------------|
| **Metrics Collectors** | Rust modules for collecting performance data from contract operations |
| **Alert Rules** | Prometheus alerting rules for operational and security events |
| **Grafana Dashboard** | Real-time visualization of all key metrics |
| **Runbook** | Operational procedures for responding to alerts |
| **Docker Compose** | Easy deployment of the complete monitoring stack |

## Metrics Categories

### 1. Core Operations
- Deposit/Withdraw throughput and latency
- Success/failure rates
- Gas consumption

### 2. ZK Proof Performance
- Verification time percentiles
- Success rate
- Failure analysis

### 3. Merkle Tree Health
- Tree capacity usage
- Insert latency
- Root validation

### 4. Security Metrics
- Double-spend attempts
- Unauthorized access
- Nullifier state

### 5. System Health
- Storage operations
- Event emissions
- Contract call latency

## Quick Start

```bash
# Clone the repository
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer/monitoring

# Start monitoring stack
docker-compose up -d

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/changeme)
# Alertmanager: http://localhost:9093
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   PrivacyLayer Contract                      │
│                        (Soroban)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Metrics Collectors                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Deposit  │ │ Withdraw │ │ ZK Proof │ │ Merkle   │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Prometheus                                 │
│              (Metrics Aggregation)                          │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Grafana Dashboard │     │   Alertmanager      │
│   (Visualization)   │     │   (Notifications)   │
└─────────────────────┘     └─────────────────────┘
```

## Files Structure

```
monitoring/
├── README.md                    # Main documentation
├── RUNBOOK.md                   # Operational procedures
├── INTEGRATION.md               # Contract integration guide
├── docker-compose.yml           # Deployment configuration
├── metrics/
│   ├── mod.rs                   # Module entry point
│   ├── types.rs                 # Metric type definitions
│   ├── collectors.rs            # Metrics collection logic
│   ├── exporters.rs             # Export to backends
│   └── aggregator.rs            # Time-window aggregation
├── alerts/
│   └── alert_rules.yml          # Prometheus alert rules
├── grafana/
│   └── dashboards/
│       └── privacypool_dashboard.json
├── prometheus/
│   └── prometheus.yml           # Prometheus configuration
└── alertmanager/
    └── alertmanager.yml         # Alert routing configuration
```

## Alert Categories

### Critical Alerts
| Alert | Description | Response Time |
|-------|-------------|---------------|
| DoubleSpendAttempts | Double spend attack detected | Immediate |
| MerkleTreeFull | Tree at maximum capacity | Immediate |
| PoolBalanceAnomaly | Balance mismatch detected | Immediate |

### Warning Alerts
| Alert | Description | Response Time |
|-------|-------------|---------------|
| HighDepositErrorRate | Error rate > 10% | 15 minutes |
| HighWithdrawErrorRate | Error rate > 10% | 15 minutes |
| SlowDepositLatency | P95 > 30s | 30 minutes |
| SlowWithdrawLatency | P95 > 60s | 30 minutes |
| MerkleTreeNearCapacity | Leaves > 1,000,000 | 24 hours |

## Integration

See [INTEGRATION.md](./INTEGRATION.md) for detailed instructions on integrating the monitoring module into the PrivacyLayer contracts.

## Operations

See [RUNBOOK.md](./RUNBOOK.md) for alert response procedures and troubleshooting guides.

## Requirements

- Prometheus 2.48+
- Grafana 10.2+
- Alertmanager 0.26+
- Docker & Docker Compose (for containerized deployment)

## License

MIT License - See LICENSE file for details.