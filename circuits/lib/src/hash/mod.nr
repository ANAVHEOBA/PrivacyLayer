// ============================================================
// Hash Utilities
// ============================================================
// Centralized hash functions used across all circuits.
// Using Poseidon2 hash which is more efficient than Pedersen.
// ============================================================

use dep::std::hash::poseidon2;

/// Compute commitment from nullifier and secret.
/// commitment = Poseidon2(nullifier, secret)
pub fn compute_commitment(nullifier: Field, secret: Field) -> Field {
    poseidon2::Poseidon2::hash([nullifier, secret], 2)
}

/// Compute nullifier hash bound to a specific root.
/// nullifier_hash = Poseidon2(nullifier, root)
/// This prevents replay attacks across different pool states.
pub fn compute_nullifier_hash(nullifier: Field, root: Field) -> Field {
    poseidon2::Poseidon2::hash([nullifier, root], 2)
}

/// Compute parent hash in Merkle tree.
/// parent = Poseidon2(left, right)
pub fn hash_pair(left: Field, right: Field) -> Field {
    poseidon2::Poseidon2::hash([left, right], 2)
}

/// Compute zero-value leaf hash.
/// Used to fill empty positions in the tree.
pub fn zero_leaf() -> Field {
    poseidon2::Poseidon2::hash([0, 0], 2)
}
