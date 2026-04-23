// ============================================================
// PrivacyLayer - Main Contract Entry Point
// ============================================================
// Modular privacy pool implementation with clean separation of concerns.
//
// Architecture:
//   - contract/     : Contract interface and orchestration
//   - core/         : Business logic (deposit, withdraw, admin)
//   - crypto/       : Cryptographic operations (merkle, verifier)
//   - storage/      : State management and data access
//   - types/        : Shared types and errors
//   - utils/        : Helper functions and validation
// ============================================================

#![no_std]

// Core modules
mod contract;
mod core;
mod crypto;
mod storage;
mod types;
mod utils;

// Re-export main contract
pub use contract::{PrivacyPool, PrivacyPoolClient};

// Re-export public types for external use
pub use types::{
    errors::Error,
    events::*,
    state::{
        AnalyticsSnapshot, Denomination, PerformanceMetricKind, PoolConfig, Proof, PublicInputs,
        VerifyingKey,
    },
};

// Test modules
#[cfg(test)]
mod test;

#[cfg(test)]
mod integration_test;
