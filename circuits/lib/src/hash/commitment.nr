use std::hash::poseidon2_permutation;

fn poseidon2_hash_3(a: Field, b: Field, c: Field) -> Field {
    let iv: Field = 3 * 18_446_744_073_709_551_616;
    let state: [Field; 4] = [a, b, c, iv];
    let permuted = poseidon2_permutation(state);
    permuted[0]
}

/// Compute commitment from nullifier, secret and pool_id.
/// commitment = Hash(nullifier, secret, pool_id)
pub fn compute_commitment(nullifier: Field, secret: Field, pool_id: Field) -> Field {
    poseidon2_hash_3(nullifier, secret, pool_id)
}
