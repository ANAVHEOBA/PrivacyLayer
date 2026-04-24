use std::hash::pedersen_hash;

/// Compute nullifier hash bound to a specific root.
/// nullifier_hash = Hash(nullifier, root)
/// This prevents replay attacks across different pool states.
pub fn compute_nullifier_hash(nullifier: Field, root: Field) -> Field {
    pedersen_hash([nullifier, root])
}
