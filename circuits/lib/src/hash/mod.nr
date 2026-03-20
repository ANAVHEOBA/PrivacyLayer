// Centralized hash functions used across all circuits.
// Using Pedersen hash (BN254-friendly) as Poseidon is not yet
// in Noir 1.0 stdlib.
// ============================================================

use std::hash::pedersen_hash;

/// Compute commitment from nullifier and secret.
/// commitment = Hash(nullifier, secret)
pub fn compute_commitment(nullifier: Field, secret: Field) -> Field {
    pedersen_hash([nullifier, secret])
}

/// Compute commitment for escrow with arbiter release.
/// commitment = Hash(nullifier, pedersen_hash([secret, arbiter_hash]))
pub fn compute_escrow_commitment(nullifier: Field, secret: Field, arbiter_hash: Field) -> Field {
    pedersen_hash([nullifier, pedersen_hash([secret, arbiter_hash])])
}

/// Compute nullifier hash bound to a specific root.
/// nullifier_hash = Hash(nullifier, root)
pub fn compute_nullifier_hash(nullifier: Field, root: Field) -> Field {
    pedersen_hash([nullifier, root])
}

/// Compute parent hash in Merkle tree.
pub fn hash_pair(left: Field, right: Field) -> Field {
    pedersen_hash([left, right])
}

pub fn zero_leaf() -> Field {
    pedersen_hash([0, 0])
}
