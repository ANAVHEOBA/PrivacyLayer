# PrivacyLayer Monitoring Runbook

This runbook provides operational procedures for responding to alerts and monitoring the PrivacyLayer system.

## Table of Contents

1. [Alert Response Procedures](#alert-response-procedures)
2. [Operational Dashboards](#operational-dashboards)
3. [Troubleshooting Guide](#troubleshooting-guide)
4. [Maintenance Procedures](#maintenance-procedures)

---

## Alert Response Procedures

### Critical Alerts

#### DoubleSpendAttempts
**Severity:** Critical  
**Response Time:** Immediate  

**Symptoms:**
- Double spend attempts detected in the system

**Investigation Steps:**
1. Check the number of unique nullifiers involved
2. Identify if attempts are from single or multiple addresses
3. Review recent withdrawal patterns

**Actions:**
1. If confirmed attack pattern, consider pausing the pool
2. Document all suspicious activity
3. Escalate to security team

**Recovery:**
1. Implement additional monitoring for affected nullifiers
2. Consider adding rate limiting for withdrawals

---

#### MerkleTreeFull
**Severity:** Critical  
**Response Time:** Immediate  

**Symptoms:**
- Merkle tree has reached maximum capacity (1,048,576 leaves)
- Deposits are failing

**Investigation Steps:**
1. Verify tree capacity on dashboard
2. Check pending deposits in queue

**Actions:**
1. Deploy new pool contract with fresh tree
2. Announce migration plan to users
3. Coordinate withdrawal of remaining funds

**Prevention:**
1. Monitor tree usage at 80% threshold
2. Plan migration before reaching capacity

---

#### PoolBalanceAnomaly
**Severity:** Critical  
**Response Time:** Immediate  

**Symptoms:**
- Pool balance doesn't match expected value
- Potential accounting error or exploit

**Investigation Steps:**
1. Compare on-chain balance vs expected balance
2. Review recent deposits and withdrawals
3. Check for any failed but funded transactions

**Actions:**
1. Pause pool immediately
2. Conduct full audit of recent transactions
3. Engage security team for investigation

---

### Warning Alerts

#### HighDepositErrorRate
**Severity:** Warning  
**Response Time:** 15 minutes  

**Symptoms:**
- Deposit error rate exceeds 10%

**Investigation Steps:**
1. Check error logs for specific error types
2. Verify token contract status
3. Check if denomination is correct

**Actions:**
1. Identify root cause from error logs
2. Fix underlying issue if possible
3. Communicate status to users if widespread

---

#### HighWithdrawErrorRate
**Severity:** Warning  
**Response Time:** 15 minutes  

**Symptoms:**
- Withdrawal error rate exceeds 10%

**Investigation Steps:**
1. Check ZK proof verification logs
2. Verify Merkle root history
3. Check nullifier state

**Actions:**
1. If proof-related, check circuit parameters
2. If root-related, verify tree sync
3. If nullifier-related, check for double-spend attempts

---

#### SlowDepositLatency / SlowWithdrawLatency
**Severity:** Warning  
**Response Time:** 30 minutes  

**Symptoms:**
- P95 latency exceeds thresholds (30s for deposit, 60s for withdraw)

**Investigation Steps:**
1. Check network congestion
2. Review gas prices
3. Check system resource utilization

**Actions:**
1. If network-related, wait for congestion to clear
2. If resource-related, scale infrastructure
3. Consider optimizing hot paths

---

## Operational Dashboards

### Main Dashboard - PrivacyLayer Overview

**Location:** Grafana > Dashboards > PrivacyLayer Performance Monitoring

**Key Panels:**

1. **System Overview Row**
   - Pool Balance: Current XLM balance
   - Total Deposits: Cumulative deposit count
   - Total Withdrawals: Cumulative withdrawal count
   - Merkle Tree Usage: Percentage of tree capacity used
   - Pool Status: Active/Paused indicator
   - Success Rate: Overall operation success rate

2. **Operation Metrics Row**
   - Operation Throughput: Deposits/s and Withdrawals/s
   - Operation Latency: P50 and P95 latencies

3. **Error Tracking Row**
   - Error Rate by Type: Time series of errors
   - Error Distribution: Pie chart by error type

4. **ZK Proof Performance Row**
   - Proof Verification Time: P50, P95, P99
   - ZK Proof Success Rate: Success percentage

5. **Merkle Tree Metrics Row**
   - Tree Growth: Leaves over time
   - Insert Latency: P95 insert time

6. **Security Metrics Row**
   - Security Events: Time series of security events
   - Nullifier Stats: Count of spent nullifiers
   - Admin Operations: Total admin operations

---

## Troubleshooting Guide

### Common Issues

#### Deposits Failing with "PoolPaused" Error

**Diagnosis:**
```rust
// Check pool status
let paused = view::is_paused(&env);
```

**Resolution:**
1. If paused unexpectedly, investigate admin actions
2. If maintenance pause, wait for unpause
3. Check admin event logs for pause reason

---

#### Withdrawals Failing with "InvalidProof" Error

**Diagnosis:**
1. Check ZK proof metrics for failure patterns
2. Verify client SDK version
3. Check verifying key matches expected

**Resolution:**
1. If SDK mismatch, update client
2. If verifying key issue, verify admin hasn't changed it
3. Check Merkle tree sync status

---

#### High Latency on All Operations

**Diagnosis:**
1. Check network congestion on Stellar
2. Review system resource metrics
3. Check storage I/O metrics

**Resolution:**
1. If network-related, monitor until cleared
2. If resource-related, scale infrastructure
3. If storage-related, optimize queries

---

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Review error rates on dashboard
- [ ] Check for security alerts
- [ ] Verify pool balance matches expected

#### Weekly
- [ ] Review latency trends
- [ ] Check tree capacity growth
- [ ] Audit admin operations

#### Monthly
- [ ] Review alert thresholds
- [ ] Update runbook if needed
- [ ] Capacity planning review

---

## Contact Information

### Escalation Path
1. **Level 1:** On-call engineer (check PagerDuty)
2. **Level 2:** Team lead
3. **Level 3:** Security team lead
4. **Level 4:** Project administrator

### Communication Channels
- **Slack:** #privacypool-alerts
- **Email:** security@privacypool.example.com