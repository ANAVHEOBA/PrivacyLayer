use std::hash::pedersen_hash;
use crate::constants::COMMITMENT_DOMAIN_SEP;

mod fixtures;

/// Compute commitment from nullifier, secret, pool_id and denomination (ZK-011).
/// commitment = Hash(COMMITMENT_DOMAIN_SEP, nullifier, secret, pool_id, denomination)
///
/// The domain separator ensures that note commitments are cryptographically
/// distinct from nullifier and Merkle hashes.
/// The denomination binds the note to its fixed-amount pool (ZK-013).
pub fn compute_commitment(nullifier: Field, secret: Field, pool_id: Field, denomination: Field) -> Field {
    pedersen_hash([COMMITMENT_DOMAIN_SEP, nullifier, secret, pool_id, denomination])
}

// ============================================================
// Tests
// ============================================================

#[test]
fn test_valid_commitment() {
    let nullifier: Field = 1;
    let secret: Field = 2;
    let pool_id: Field = 3;
    let denomination: Field = 100;
    let commitment = compute_commitment(nullifier, secret, pool_id, denomination);

    assert(commitment != 0);
}

#[test]
fn test_commitment_domain_separation() {
    let n: Field = 42;
    let s: Field = 43;
    let p: Field = 1;
    let d: Field = 1000;
    
    let c = compute_commitment(n, s, p, d);
    let without_domain = pedersen_hash([n, s, p, d]);
    
    assert(c != without_domain, "commitment must be domain separated");
}

#[test]
fn test_commitment_includes_denomination() {
    let n: Field = 42;
    let s: Field = 43;
    let p: Field = 1;
    
    let c1 = compute_commitment(n, s, p, 100);
    let c2 = compute_commitment(n, s, p, 1000);
    
    assert(c1 != c2, "commitment must change with denomination");
}
