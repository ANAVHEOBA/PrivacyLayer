// ============================================================
// Cryptographic Operations
// ============================================================
// Contains all cryptographic primitives:
//   - merkle: Merkle tree operations
//   - verifier: Groth16 proof verification
// ============================================================

pub mod merkle;
pub mod verifier;

#[cfg(test)]
mod verifier_test;
