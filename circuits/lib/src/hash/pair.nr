use std::hash::pedersen_hash;

/// Compute parent hash in Merkle tree.
/// parent = Hash(left, right)
pub fn hash_pair(left: Field, right: Field) -> Field {
    pedersen_hash([left, right])
}
