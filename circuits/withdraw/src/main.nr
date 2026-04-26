// SPDX-License-Identifier: MIT
// ZK-029: Extended withdrawal circuit with explicit pool_id public input.
//
// Public inputs  (verified on-chain / by the verifier):
//   - nullifier_hash   : unique spend tag derived from the note secret
//   - merkle_root      : commitment tree root at prove-time
//   - recipient        : destination address (felt252 / bytes32)
//   - amount           : value being withdrawn
//   - pool_id          : identifies the pool this proof is scoped to
//
// Private witnesses (known only to the prover):
//   - secret           : note secret (pre-image of commitment leaf)
//   - path_elements    : sibling hashes along the Merkle path
//   - path_indices     : left/right selector bits for each level

use dep::std;
use dep::std::hash::pedersen_hash;

// Merkle tree depth – must match the on-chain / SDK constant.
global TREE_DEPTH: u32 = 20;

// ---------------------------------------------------------------------------
// Helper: compute a Merkle root from a leaf and an authentication path.
// ---------------------------------------------------------------------------
fn compute_merkle_root(
    leaf: Field,
    path_elements: [Field; TREE_DEPTH],
    path_indices: [u1; TREE_DEPTH],
) -> Field {
    let mut current = leaf;
    for i in 0..TREE_DEPTH {
        let (left, right) = if path_indices[i] == 0 {
            (current, path_elements[i])
        } else {
            (path_elements[i], current)
        };
        current = pedersen_hash([left, right]);
    }
    current
}

// ---------------------------------------------------------------------------
// Main circuit
// ---------------------------------------------------------------------------
fn main(
    // ── Public inputs ──────────────────────────────────────────────────────
    nullifier_hash : pub Field,
    merkle_root    : pub Field,
    recipient      : pub Field,
    amount         : pub Field,
    pool_id        : pub Field,   // ZK-029: explicit pool identifier

    // ── Private witnesses ──────────────────────────────────────────────────
    secret         : Field,
    path_elements  : [Field; TREE_DEPTH],
    path_indices   : [u1; TREE_DEPTH],
) {
    // 1. Derive the commitment leaf from the secret.
    let commitment = pedersen_hash([secret, amount]);

    // 2. Verify the leaf is a member of the claimed Merkle tree.
    let computed_root = compute_merkle_root(commitment, path_elements, path_indices);
    assert(computed_root == merkle_root, "Merkle root mismatch");

    // 3. Verify the nullifier hash is correctly derived from the secret.
    //    Including pool_id in the nullifier domain-separates it per pool so
    //    the same note secret cannot be replayed across pools.
    let computed_nullifier = pedersen_hash([secret, pool_id]);
    assert(computed_nullifier == nullifier_hash, "Nullifier hash mismatch");

    // 4. Recipient and amount are bound to the proof as public inputs;
    //    no further in-circuit checks are needed beyond their presence.
    //    (The verifier contract enforces they match the call-data.)
    let _ = recipient;
}
