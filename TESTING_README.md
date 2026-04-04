# PrivacyLayer Load & Stress Testing Suite

Comprehensive performance testing tools for PrivacyLayer protocol.

## Overview

This testing suite provides load testing and stress testing capabilities to evaluate PrivacyLayer performance under various load conditions.

**Related Issue:** [#46 - Perform Load Testing and Stress Testing](https://github.com/ANAVHEOBA/PrivacyLayer/issues/46)

## Features

### Load Testing (`load-test.js`)

- Simulates 100 concurrent deposits and withdrawals
- Measures TPS, latency (avg/P50/P95/P99), and error rates
- Generates detailed HTML report
- Configurable target metrics

### Stress Testing (`stress-test.js`)

- Ramps up load from 10 to 500 concurrent users
- Identifies system breaking point
- Monitors memory usage and error patterns
- Documents performance degradation curve

## Installation

```bash
# Clone the repository
git clone https://github.com/597226617/PrivacyLayer.git
cd PrivacyLayer

# Install dependencies (if any)
npm install
```

## Usage

### Run Load Test

```bash
node load-test.js
```

**Output:**
- Real-time progress in console
- Summary statistics
- Generated report: `load-test-report.md`

### Run Stress Test

```bash
node stress-test.js
```

**Output:**
- Step-by-step ramp-up progress
- Breaking point detection
- Generated report: `stress-test-report.md`

### Run Both Tests

```bash
node load-test.js && node stress-test.js
```

## Configuration

Edit the `CONFIG` object in each script to customize test parameters:

### Load Test Config

```javascript
const CONFIG = {
  concurrentDeposits: 100,      // Number of concurrent deposits
  concurrentWithdrawals: 100,   // Number of concurrent withdrawals
  targetTPS: 10,                // Target transactions per second
  targetP95Latency: 1000,       // Target P95 latency (ms)
  targetErrorRate: 0.01,        // Target error rate (1%)
  endpoints: {
    deposit: 'https://testnet.privacylayer.io/deposit',
    withdraw: 'https://testnet.privacylayer.io/withdraw',
    // ... update with actual endpoints
  }
};
```

### Stress Test Config

```javascript
const STRESS_CONFIG = {
  startUsers: 10,               // Starting concurrent users
  maxUsers: 500,                // Maximum concurrent users
  rampUpSteps: 10,              // Users to add per step
  stepDurationMs: 5000,         // Duration per step (ms)
  // ...
};
```

## Test Reports

### Load Test Report

Generated `load-test-report.md` includes:

- Executive summary
- Test configuration
- Results summary table
- Latency distribution chart
- Bottleneck analysis
- Recommendations

### Stress Test Report

Generated `stress-test-report.md` includes:

- Breaking point analysis
- Performance degradation curve
- Memory usage analysis
- Failure mode identification
- Scaling recommendations

## Metrics Explained

### TPS (Transactions Per Second)

Measures throughput - how many transactions the system can process per second.

**Formula:** `TPS = Total Successful Transactions / Test Duration (seconds)`

### Latency Percentiles

- **P50 (Median):** 50% of requests faster than this value
- **P95:** 95% of requests faster than this value (industry standard SLA)
- **P99:** 99% of requests faster than this value (tail latency)

### Error Rate

Percentage of failed requests.

**Formula:** `Error Rate = Failed Requests / Total Requests`

**Target:** < 1% for production systems

## Interpreting Results

### Good Results ✅

- TPS meets or exceeds target
- P95 latency within acceptable range
- Error rate < 1%
- No memory leaks detected

### Warning Signs ⚠️

- TPS below target
- P95 latency > 2x target
- Error rate 1-5%
- Memory usage growing over time

### Critical Issues 🔴

- Error rate > 5%
- P95 latency > 10 seconds
- System crash or hang
- Memory exhaustion

## Troubleshooting

### High Error Rates

1. Check network connectivity to testnet
2. Verify endpoint URLs are correct
3. Increase request timeouts
4. Reduce concurrent user count

### High Latency

1. Check database connection pool size
2. Monitor network latency
3. Review server resource usage
4. Consider geographic distribution

### Memory Issues

1. Check for memory leaks in test script
2. Reduce concurrent user count
3. Add garbage collection between steps
4. Monitor heap usage over time

## Best Practices

1. **Run Multiple Times:** Execute tests 3-5 times and average results
2. **Baseline First:** Run with low load to establish baseline
3. **Monitor Resources:** Watch CPU, memory, network during tests
4. **Document Everything:** Save all reports for comparison
5. **Test in Staging:** Never run stress tests directly on production

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:

- Open an issue: https://github.com/ANAVHEOBA/PrivacyLayer/issues
- Contact: testing@privacylayer.io

---

*Testing Suite v1.0 - April 2026*
