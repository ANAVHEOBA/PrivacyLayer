// ============================================================
// PrivacyLayer — Performance Monitoring Module
// ============================================================
// Comprehensive metrics collection for the privacy pool contract.
// 
// Key metrics tracked:
//   - Operation latencies (deposit, withdraw, merkle operations)
//   - Success/failure rates
//   - Resource utilization (CPU, memory, gas)
//   - ZK proof performance
//   - System health indicators
// ============================================================

pub mod types;
pub mod collectors;
pub mod exporters;
pub mod aggregator;

pub use types::*;
pub use collectors::*;
pub use exporters::*;