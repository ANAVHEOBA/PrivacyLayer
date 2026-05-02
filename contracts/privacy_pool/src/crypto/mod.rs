// ============================================================
// Cryptographic Operations
// ============================================================
// Contains all cryptographic primitives:
//   - merkle: Merkle tree operations
//   - verifier: Groth16 proof verification
// ============================================================

pub mod merkle;
pub mod verifier;
pub mod batch_verifier; // Add this line

#[cfg(test)]
mod verifier_test;
#[cfg(test)]
mod batch_verifier_test; // Add this line for future tests
