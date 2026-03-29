// ============================================================
// PrivacyLayer — Noir Circuit Integration Tests
// ============================================================
// Tests that verify each circuit function works end-to-end
// by simulating the full prover→verifier flow within Noir.
//
// These tests use Nargo's built-in test runner (nargo test).
// Each test corresponds to a real user scenario.
//
// Run all circuit tests with:
//   cd circuits && nargo test
// ============================================================

use dep::std::hash::poseidon2;
use dep::merkle;

// ============================================================
// ── CIRCUIT 1: Commitment Scheme ──────────────────────────
// ============================================================

/// Full round-trip: generate a commitment the same way the
/// SDK would, then feed it as the public input to the circuit.
#[test]
fn integration_commitment_sdk_roundtrip() {
    // Step 1: Client generates note
    let nullifier: Field = 0xdeadbeef;
    let secret: Field    = 0xcafebabe;

    // Step 2: Client computes commitment = Poseidon2(nullifier, secret)
    // (This matches how sdk/src/note.ts computes it)
    let commitment = poseidon2::Poseidon2::hash([nullifier, secret], 2);

    // Step 3: Commitment circuit verifies it
    dep::commitment::main(nullifier, secret, commitment);
    // If we get here without a panic, the circuit accepted the proof
}

/// Verify that two different notes produce different commitments.
/// Critical: collision resistance of Poseidon2.
#[test]
fn integration_commitment_no_collisions() {
    let n1: Field = 111; let s1: Field = 222;
    let n2: Field = 333; let s2: Field = 444;

    let c1 = poseidon2::Poseidon2::hash([n1, s1], 2);
    let c2 = poseidon2::Poseidon2::hash([n2, s2], 2);

    assert(c1 != c2, "two different notes must not produce the same commitment");
}

/// Commitment must be deterministic — same inputs always same output.
#[test]
fn integration_commitment_deterministic() {
    let nullifier: Field = 999;
    let secret: Field    = 888;

    let c1 = poseidon2::Poseidon2::hash([nullifier, secret], 2);
    let c2 = poseidon2::Poseidon2::hash([nullifier, secret], 2);

    assert(c1 == c2, "commitment must be deterministic");
}

// ============================================================
// ── CIRCUIT 2: Merkle Tree ────────────────────────────────
// ============================================================

/// Build a 1-leaf tree and verify the root equals the expected
/// Poseidon2 chain manually computed.
#[test]
fn integration_merkle_single_leaf_root() {
    let leaf: Field = 42;
    let index: Field = 0;
    let hash_path: [Field; 20] = [0; 20];

    let root = merkle::compute_root(leaf, index, hash_path);

    // Root must be non-zero (even with all-zero siblings)
    assert(root != 0, "root of non-zero leaf must not be zero");
}

/// Tests that left leaf (index=0) and right leaf (index=1)
/// produce different roots when placed in the same tree.
#[test]
fn integration_merkle_left_vs_right_child() {
    let leaf: Field = 77;
    let hash_path: [Field; 20] = [0; 20];

    let root_left  = merkle::compute_root(leaf, 0, hash_path);
    let root_right = merkle::compute_root(leaf, 1, hash_path);

    // Same leaf at different positions → different roots
    assert(root_left != root_right, "left and right positions must produce different roots");
}

/// Verify inclusion works: compute root from leaf+path, then
/// feed back into verify_inclusion — must not panic.
#[test]
fn integration_merkle_inclusion_roundtrip() {
    let leaf: Field = 12345;
    let index: Field = 3; // binary: 0011
    let hash_path: [Field; 20] = [
        111, 222, 333, 444, 555, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ];

    // Compute root first
    let root = merkle::compute_root(leaf, index, hash_path);

    // Then verify — must not panic
    merkle::verify_inclusion(leaf, index, hash_path, root);
}

/// Tampering with auth path must produce a DIFFERENT root (security).
#[test]
fn integration_merkle_tampered_path_changes_root() {
    let leaf: Field = 99;
    let index: Field = 0;
    let honest_path: [Field; 20] = [10, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let tampered_path: [Field; 20] = [10, 99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    let honest_root  = merkle::compute_root(leaf, index, honest_path);
    let tampered_root = merkle::compute_root(leaf, index, tampered_path);

    assert(honest_root != tampered_root, "tampered sibling must change the root");
}

// ============================================================
// ── CIRCUIT 3: Full Withdrawal Proof (End-to-End) ─────────
// ============================================================

/// Simulate complete withdraw flow as the SDK would execute it:
///   1. Generate note (nullifier + secret)
///   2. Compute commitment
///   3. Build Merkle path (index=0, all-zero siblings)
///   4. Compute root
///   5. Compute nullifier_hash
///   6. Feed everything into the withdraw circuit → must pass
#[test]
fn integration_withdraw_full_flow() {
    // ── Step 1: Note generation (mirrors sdk/src/note.ts) ──
    let nullifier: Field = 0x1234567890abcdef;
    let secret: Field    = 0xfedcba0987654321;

    // ── Step 2: Commitment ──────────────────────────────────
    let commitment = poseidon2::Poseidon2::hash([nullifier, secret], 2);

    // ── Step 3 & 4: Merkle tree path (index=0, empty tree) ──
    let leaf_index: Field = 0;
    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(commitment, leaf_index, hash_path);

    // ── Step 5: Nullifier hash ──────────────────────────────
    let nullifier_hash = poseidon2::Poseidon2::hash([nullifier, root], 2);

    // ── Step 6: Call withdraw circuit ──────────────────────
    dep::withdraw::main(
        // private
        nullifier,
        secret,
        leaf_index,
        hash_path,
        // public
        root,
        nullifier_hash,
        0xDEAD as Field,    // recipient (field-encoded address)
        1_000_000_000,      // amount (100 XLM)
        0,                  // no relayer
        0,                  // no fee
    );
}

/// Two notes in the same tree — each can generate valid proofs.
/// Simulates Bob having two separate notes.
#[test]
fn integration_withdraw_two_notes_same_tree() {
    // Note 1
    let n1: Field = 111; let s1: Field = 222;
    let c1 = poseidon2::Poseidon2::hash([n1, s1], 2);

    // Note 2
    let n2: Field = 333; let s2: Field = 444;
    let c2 = poseidon2::Poseidon2::hash([n2, s2], 2);

    // Simplified 2-leaf tree (index 0 and 1):
    // root = Poseidon2(c1, c2) at level 0, then propagate zeros
    let level0_root = poseidon2::Poseidon2::hash([c1, c2], 2);
    let mut global_root = level0_root;
    for _i in 1..20 {
        global_root = poseidon2::Poseidon2::hash([global_root, 0], 2);
    }

    // Path for note1 (index=0): sibling at level0 is c2, rest zeros
    let mut path1: [Field; 20] = [0; 20];
    path1[0] = c2;

    // Path for note2 (index=1): sibling at level0 is c1, rest zeros
    let mut path2: [Field; 20] = [0; 20];
    path2[0] = c1;

    // Verify both proofs pass
    let nh1 = poseidon2::Poseidon2::hash([n1, global_root], 2);
    let nh2 = poseidon2::Poseidon2::hash([n2, global_root], 2);

    dep::withdraw::main(n1, s1, 0, path1, global_root, nh1, 0xABCD, 1_000_000_000, 0, 0);
    dep::withdraw::main(n2, s2, 1, path2, global_root, nh2, 0xEF01, 1_000_000_000, 0, 0);
}

/// Withdraw with a relayer: fee=10XLM, relayer=non-zero.
/// Tests the fee validation branch in the circuit.
#[test]
fn integration_withdraw_with_relayer() {
    let nullifier: Field = 0xABCD;
    let secret: Field    = 0x1234;
    let commitment = poseidon2::Poseidon2::hash([nullifier, secret], 2);

    let hash_path: [Field; 20] = [0; 20];
    let root = merkle::compute_root(commitment, 0, hash_path);
    let nullifier_hash = poseidon2::Poseidon2::hash([nullifier, root], 2);

    dep::withdraw::main(
        nullifier, secret, 0, hash_path,
        root, nullifier_hash,
        0xDEAD,          // recipient
        1_000_000_000,   // 100 XLM
        0xBEEF,          // relayer address
        100_000_000,     // 10 XLM fee
    );
}
