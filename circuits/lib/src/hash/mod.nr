// Centralized hash functions used across all circuits.
// Using Pedersen hash (BN254-friendly) as Poseidon is not yet
// in Noir 1.0 stdlib.
// ============================================================

use std::hash::pedersen_hash;

pub fn compute_commitment(nullifier: Field, secret: Field) -> Field {
    pedersen_hash([nullifier, secret])
}

pub fn compute_escrow_commitment(nullifier: Field, secret: Field, arbiter_hash: Field) -> Field {
    pedersen_hash([nullifier, pedersen_hash([secret, arbiter_hash])])
}

/// New: Compute commitment for multisig notes.
/// commitment = Hash(nullifier, Hash(secret, Hash(pk1, Hash(pk2, pk3))))
pub fn compute_multisig_commitment(nullifier: Field, secret: Field, pk1: Field, pk2: Field, pk3: Field) -> Field {
    let combined_keys = pedersen_hash([pk1, pedersen_hash([pk2, pk3])]);
    pedersen_hash([nullifier, pedersen_hash([secret, combined_keys])])
}

pub fn compute_nullifier_hash(nullifier: Field, root: Field) -> Field {
    pedersen_hash([nullifier, root])
}

pub fn hash_pair(left: Field, right: Field) -> Field {
    pedersen_hash([left, right])
}

pub fn zero_leaf() -> Field {
    pedersen_hash([0, 0])
}
