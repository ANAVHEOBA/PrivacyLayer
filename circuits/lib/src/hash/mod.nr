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

pub use commitment::COMMITMENT_DOMAIN_SEP;

/// Compute commitment from nullifier, secret and pool_id with explicit domain separation (ZK-011).
/// commitment = Poseidon2(COMMITMENT_DOMAIN_SEP, nullifier, secret, pool_id)
pub fn compute_commitment(nullifier: Field, secret: Field, pool_id: Field) -> Field {
    commitment::compute_commitment(nullifier, secret, pool_id)
}

/// Compute nullifier hash bound to a specific pool_id (ZK-035).
/// nullifier_hash = Hash(NULLIFIER_DOMAIN_SEP, nullifier, pool_id)
pub fn compute_nullifier_hash(nullifier: Field, pool_id: Field) -> Field {
    nullifier::compute_nullifier_hash(nullifier, pool_id)
}

/// Compute parent hash in Merkle tree.
/// parent = Hash(left, right)
pub fn hash_pair(left: Field, right: Field) -> Field {
    pair::hash_pair(left, right)
}

/// Canonical zero leaf: H(0, 0).
pub fn zero_leaf() -> Field {
    zeroes::zero_leaf()
}

/// Canonical zero node at the given Merkle level.
pub fn zero_node_at_level(level: u32) -> Field {
    zeroes::zero_node_at_level(level)
}

/// Canonical zero-sibling path for a sparse single-leaf tree.
pub fn zero_sibling_path() -> [Field; 20] {
    zeroes::zero_sibling_path()
}
