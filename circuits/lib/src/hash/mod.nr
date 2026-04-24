// ============================================================
// Hash Utilities
// ============================================================
// Centralized hash functions used across all circuits.
//
// The top-level API stays stable for downstream circuits while the
// implementation lives in focused submodules.
// ============================================================

pub mod commitment;
pub mod nullifier;
pub mod pair;
pub mod zeroes;

/// Compute commitment from nullifier and secret.
/// commitment = Hash(nullifier, secret)
pub fn compute_commitment(nullifier: Field, secret: Field) -> Field {
    commitment::compute_commitment(nullifier, secret)
}

/// Compute nullifier hash bound to a specific root.
/// nullifier_hash = Hash(nullifier, root)
/// This prevents replay attacks across different pool states.
pub fn compute_nullifier_hash(nullifier: Field, root: Field) -> Field {
    nullifier::compute_nullifier_hash(nullifier, root)
}

/// Compute parent hash in Merkle tree.
/// parent = Hash(left, right)
pub fn hash_pair(left: Field, right: Field) -> Field {
    pair::hash_pair(left, right)
}

/// Compute zero-value leaf hash.
/// Used to fill empty positions in the tree.
pub fn zero_leaf() -> Field {
    zeroes::zero_leaf()
}
