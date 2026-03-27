# PrivacyLayer Performance Monitoring System

**Version:** 1.0  
**Last Updated:** March 2026  
**Status:** Production Ready

---

## Overview

This document describes the comprehensive performance monitoring system for PrivacyLayer, covering metrics collection, alerting, dashboards, and operational procedures.

## Table of Contents

1. [Architecture](#1-architecture)
2. [Metrics Collection](#2-metrics-collection)
3. [Custom Metrics](#3-custom-metrics)
4. [Alerting Rules](#4-alerting-rules)
5. [Dashboard Configuration](#5-dashboard-configuration)
6. [Operational Procedures](#6-operational-procedures)

---

## 1. Architecture

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                     Grafana Dashboards                          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Prometheus Server                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Alertmanager  │  │  TSDB         │  │  PromQL       │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
    ┌────────────┬────────────┼────────────┬────────────┐
    │            │            │            │            │
┌───▼───┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
│Node   │  │Contract │  │API     │  │ZK Prover│  │Stellar  │
│Exporter│  │Metrics  │  │Metrics │  │Metrics  │  │RPC      │
└───────┘  └─────────┘  └────────┘  └─────────┘  └─────────┘
```

### Components

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics storage and querying | 9090 |
| Grafana | Visualization dashboards | 3000 |
| Alertmanager | Alert routing and notification | 9093 |
| Node Exporter | System metrics | 9100 |
| Custom Exporters | Application-specific metrics | Various |

---

## 2. Metrics Collection

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'privacylayer-mainnet'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  # Node Exporter - System Metrics
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance

  # PrivacyLayer Contract Metrics
  - job_name: 'privacylayer-contracts'
    metrics_path: /metrics
    static_configs:
      - targets:
        - 'pool-contract-metrics:8080'
        - 'verifier-metrics:8081'
    scrape_interval: 30s

  # API Server Metrics
  - job_name: 'privacylayer-api'
    static_configs:
      - targets: ['api:3000']
    metrics_path: /api/metrics

  # ZK Prover Metrics
  - job_name: 'zk-prover'
    static_configs:
      - targets: ['prover:9000']

  # Stellar RPC
  - job_name: 'stellar-rpc'
    static_configs:
      - targets: ['stellar-rpc-metrics:9101']
```

### Contract Metrics Exporter

```typescript
// contract-metrics-exporter.ts
import express from 'express';
import client from 'prom-client';
import { Server } from '@stellar/stellar-sdk';

const app = express();
const register = new client.Registry();

// Custom metrics
const depositCounter = new client.Counter({
  name: 'privacylayer_deposits_total',
  help: 'Total number of deposits',
  labelNames: ['asset', 'denomination'],
  registers: [register]
});

const withdrawalCounter = new client.Counter({
  name: 'privacylayer_withdrawals_total',
  help: 'Total number of withdrawals',
  labelNames: ['asset', 'denomination'],
  registers: [register]
});

const proofGenerationTime = new client.Histogram({
  name: 'privacylayer_proof_generation_seconds',
  help: 'Time to generate ZK proofs',
  labelNames: ['circuit_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register]
});

const merkleTreeSize = new client.Gauge({
  name: 'privacylayer_merkle_tree_size',
  help: 'Current size of the Merkle tree',
  registers: [register]
});

const poolBalance = new client.Gauge({
  name: 'privacylayer_pool_balance',
  help: 'Current pool balance by asset',
  labelNames: ['asset'],
  registers: [register]
});

const gasUsedHistogram = new client.Histogram({
  name: 'privacylayer_gas_used',
  help: 'Gas used by contract operations',
  labelNames: ['operation'],
  buckets: [10000, 50000, 100000, 200000, 500000, 1000000],
  registers: [register]
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    // Fetch on-chain metrics
    await updateMetrics();
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
});

async function updateMetrics() {
  // Fetch from Horizon/Soroban RPC
  const poolState = await fetchPoolState();
  
  merkleTreeSize.set(poolState.treeSize);
  
  for (const [asset, balance] of Object.entries(poolState.balances)) {
    poolBalance.set({ asset }, parseFloat(balance));
  }
}

app.listen(8080, () => {
  console.log('Contract metrics exporter listening on port 8080');
});
```

---

## 3. Custom Metrics

### Business Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `privacylayer_deposits_total` | Counter | Total deposits | asset, denomination |
| `privacylayer_withdrawals_total` | Counter | Total withdrawals | asset, denomination |
| `privacylayer_pool_balance` | Gauge | Pool balance | asset |
| `privacylayer_merkle_tree_size` | Gauge | Merkle tree depth | - |
| `privacylayer_active_users` | Gauge | Unique depositors (24h) | - |

### Performance Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `privacylayer_proof_generation_seconds` | Histogram | ZK proof generation time | circuit_type |
| `privacylayer_merkle_update_seconds` | Histogram | Merkle tree update time | - |
| `privacylayer_deposit_duration_seconds` | Histogram | End-to-end deposit time | - |
| `privacylayer_withdrawal_duration_seconds` | Histogram | End-to-end withdrawal time | - |
| `privacylayer_gas_used` | Histogram | Gas consumption | operation |

### Infrastructure Metrics

| Metric | Type | Description | Labels |
|--------|------|-------------|--------|
| `privacylayer_rpc_requests_total` | Counter | RPC requests | method, status |
| `privacylayer_rpc_latency_seconds` | Histogram | RPC latency | method |
| `privacylayer_circuit_cache_hits` | Counter | Circuit cache hits | circuit_type |
| `privacylayer_circuit_cache_misses` | Counter | Circuit cache misses | circuit_type |

### Metrics Implementation

```typescript
// metrics-collector.ts
import client from 'prom-client';

export class MetricsCollector {
  private registry: client.Registry;
  
  // Business metrics
  public depositsTotal: client.Counter<string>;
  public withdrawalsTotal: client.Counter<string>;
  public poolBalance: client.Gauge<string>;
  
  // Performance metrics
  public proofGenerationTime: client.Histogram<string>;
  public gasUsed: client.Histogram<string>;
  
  constructor() {
    this.registry = new client.Registry();
    
    // Initialize metrics
    this.depositsTotal = new client.Counter({
      name: 'privacylayer_deposits_total',
      help: 'Total deposits',
      labelNames: ['asset', 'denomination'],
      registers: [this.registry]
    });
    
    this.proofGenerationTime = new client.Histogram({
      name: 'privacylayer_proof_generation_seconds',
      help: 'Proof generation time',
      labelNames: ['circuit_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry]
    });
    
    // ... other metrics
  }
  
  // Record deposit
  recordDeposit(asset: string, denomination: string, gasUsed: number, duration: number) {
    this.depositsTotal.inc({ asset, denomination });
    this.gasUsed.observe({ operation: 'deposit' }, gasUsed);
  }
  
  // Record proof generation
  recordProofGeneration(circuitType: string, duration: number) {
    this.proofGenerationTime.observe({ circuit_type: circuitType }, duration);
  }
  
  // Get metrics for Prometheus
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
```

---

## 4. Alerting Rules

### Prometheus Alerting Rules

```yaml
# /etc/prometheus/rules/privacylayer.yml
groups:
  - name: privacylayer.critical
    rules:
      # Pool Balance Critical
      - alert: PoolBalanceLow
        expr: privacylayer_pool_balance < 1000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pool balance critically low"
          description: "Pool balance for {{ $labels.asset }} is {{ $value }}"
      
      # High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(privacylayer_rpc_requests_total{status="error"}[5m])) 
          / 
          sum(rate(privacylayer_rpc_requests_total[5m])) 
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"
      
      # Proof Generation Timeout
      - alert: ProofGenerationSlow
        expr: |
          histogram_quantile(0.95, rate(privacylayer_proof_generation_seconds_bucket[5m])) 
          > 60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Proof generation is slow"
          description: "95th percentile is {{ $value }}s"

  - name: privacylayer.warning
    rules:
      # Merkle Tree Growing Fast
      - alert: MerkleTreeGrowthHigh
        expr: |
          rate(privacylayer_merkle_tree_size[1h]) > 100
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Merkle tree growing rapidly"
          description: "Growth rate: {{ $value }} leaves/hour"
      
      # Gas Usage High
      - alert: GasUsageHigh
        expr: |
          rate(privacylayer_gas_used_sum[5m]) > 1000000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High gas consumption"
          description: "Gas rate: {{ $value }}/s"
      
      # RPC Latency High
      - alert: RPCLatencyHigh
        expr: |
          histogram_quantile(0.9, rate(privacylayer_rpc_latency_seconds_bucket[5m])) 
          > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RPC latency is high"
          description: "90th percentile latency: {{ $value }}s"

  - name: privacylayer.info
    rules:
      # Daily Deposit Volume
      - alert: DailyDepositVolume
        expr: |
          sum(increase(privacylayer_deposits_total[24h])) > 100
        labels:
          severity: info
        annotations:
          summary: "High daily deposit activity"
          description: "{{ $value }} deposits in last 24h"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/XXX'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#privacylayer-alerts'
        send_resolved: true
        title: '{{ .Status | toUpper }}: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'

  - name: 'critical'
    slack_configs:
      - channel: '#privacylayer-critical'
        send_resolved: true
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
        description: '{{ .CommonAnnotations.summary }}'

  - name: 'warning'
    slack_configs:
      - channel: '#privacylayer-warnings'
        send_resolved: true
```

---

## 5. Dashboard Configuration

### Grafana Dashboard - Main Overview

```json
{
  "dashboard": {
    "title": "PrivacyLayer Overview",
    "uid": "privacylayer-main",
    "panels": [
      {
        "title": "Pool Balances",
        "type": "gauge",
        "gridPos": {"x": 0, "y": 0, "w": 8, "h": 4},
        "targets": [
          {
            "expr": "privacylayer_pool_balance",
            "legendFormat": "{{ asset }}"
          }
        ]
      },
      {
        "title": "Deposits (24h)",
        "type": "stat",
        "gridPos": {"x": 8, "y": 0, "w": 4, "h": 4},
        "targets": [
          {
            "expr": "sum(increase(privacylayer_deposits_total[24h]))"
          }
        ]
      },
      {
        "title": "Withdrawals (24h)",
        "type": "stat",
        "gridPos": {"x": 12, "y": 0, "w": 4, "h": 4},
        "targets": [
          {
            "expr": "sum(increase(privacylayer_withdrawals_total[24h]))"
          }
        ]
      },
      {
        "title": "Merkle Tree Size",
        "type": "stat",
        "gridPos": {"x": 16, "y": 0, "w": 4, "h": 4},
        "targets": [
          {
            "expr": "privacylayer_merkle_tree_size"
          }
        ]
      },
      {
        "title": "Proof Generation Time",
        "type": "graph",
        "gridPos": {"x": 0, "y": 4, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(privacylayer_proof_generation_seconds_bucket[5m]))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, rate(privacylayer_proof_generation_seconds_bucket[5m]))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, rate(privacylayer_proof_generation_seconds_bucket[5m]))",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Gas Usage",
        "type": "graph",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "rate(privacylayer_gas_used_sum[5m])",
            "legendFormat": "{{ operation }}"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "gridPos": {"x": 0, "y": 10, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "rate(privacylayer_rpc_requests_total[5m])",
            "legendFormat": "{{ method }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "gridPos": {"x": 12, "y": 10, "w": 12, "h": 6},
        "targets": [
          {
            "expr": "rate(privacylayer_rpc_requests_total{status=\"error\"}[5m])",
            "legendFormat": "{{ method }}"
          }
        ]
      }
    ]
  }
}
```

### Dashboard - Circuit Performance

```json
{
  "dashboard": {
    "title": "ZK Circuit Performance",
    "uid": "privacylayer-circuits",
    "panels": [
      {
        "title": "Proof Generation by Circuit",
        "type": "heatmap",
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "rate(privacylayer_proof_generation_seconds_bucket[5m])",
            "legendFormat": "{{ circuit_type }}"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "gauge",
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "rate(privacylayer_circuit_cache_hits[5m]) / (rate(privacylayer_circuit_cache_hits[5m]) + rate(privacylayer_circuit_cache_misses[5m]))"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "gridPos": {"x": 0, "y": 8, "w": 24, "h": 6},
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=\"zk-prover\"}"
          }
        ]
      }
    ]
  }
}
```

---

## 6. Operational Procedures

### Daily Monitoring Checklist

```markdown
## Daily Monitoring Checklist

- [ ] Check Grafana dashboards for anomalies
- [ ] Review alerts from last 24h
- [ ] Verify pool balances match expected
- [ ] Check Merkle tree consistency
- [ ] Review transaction volume trends
- [ ] Check RPC latency and error rates
- [ ] Verify backup jobs completed
```

### Monitoring Script

```bash
#!/bin/bash
# health-check.sh - Daily health check script

echo "=== PrivacyLayer Health Check ==="
echo "Time: $(date)"
echo

# Check Prometheus
echo "1. Prometheus Status:"
curl -s http://prometheus:9090/-/healthy || echo "FAILED"

# Check Grafana
echo -e "\n2. Grafana Status:"
curl -s http://grafana:3000/api/health || echo "FAILED"

# Check Pool Balance
echo -e "\n3. Pool Balances:"
curl -s http://localhost:8080/api/pool/balance | jq .

# Check Merkle Tree
echo -e "\n4. Merkle Tree Size:"
curl -s http://localhost:8080/api/merkle/size | jq .

# Check Recent Errors
echo -e "\n5. Recent Errors (1h):"
curl -s 'http://prometheus:9090/api/v1/query?query=sum(increase(privacylayer_rpc_requests_total{status="error"}[1h]))' | jq '.data.result[0].value[1]'

echo -e "\n=== Health Check Complete ==="
```

### Performance Baseline

| Metric | Expected Range | Critical Threshold |
|--------|---------------|-------------------|
| Proof Generation (p95) | 5-15s | > 30s |
| Deposit Duration (p95) | 10-20s | > 60s |
| Withdrawal Duration (p95) | 15-30s | > 90s |
| RPC Latency (p95) | 0.5-1s | > 3s |
| Error Rate | < 1% | > 5% |
| Gas (deposit) | 50k-150k | > 300k |
| Gas (withdrawal) | 100k-250k | > 500k |

### Troubleshooting Guide

```markdown
## Common Issues

### High Proof Generation Time

1. Check prover memory: `kubectl top pods`
2. Check circuit cache hit rate
3. Review proof queue depth
4. Scale prover instances if needed

### High RPC Latency

1. Check Stellar RPC status
2. Review network connectivity
3. Check API server resources
4. Enable request caching

### High Error Rate

1. Review error logs
2. Check contract state
3. Verify Merkle tree consistency
4. Check Stellar network status

### Pool Balance Low

1. Review withdrawal volume
2. Check liquidity reserves
3. Alert treasury team
4. Consider temporary pause
```

---

## Deployment

### Docker Compose

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./dashboards:/etc/grafana/provisioning/dashboards
      - ./datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false

  alertmanager:
    image: prom/alertmanager:v0.25.0
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

  node-exporter:
    image: prom/node-exporter:v1.6.0
    ports:
      - "9100:9100"

  contract-metrics:
    build: ./contract-metrics-exporter
    ports:
      - "8080:8080"
    environment:
      - HORIZON_URL=https://horizon.stellar.org
      - CONTRACT_ID=${POOL_CONTRACT_ID}

volumes:
  prometheus_data:
  grafana_data:
```

---

*This monitoring system provides comprehensive visibility into PrivacyLayer operations. Review and update quarterly.*