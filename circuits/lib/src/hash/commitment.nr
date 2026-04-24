use std::hash::pedersen_hash;

/// Compute commitment from nullifier and secret.
/// commitment = Hash(nullifier, secret)
pub fn compute_commitment(nullifier: Field, secret: Field) -> Field {
    pedersen_hash([nullifier, secret])
}
