// ============================================================
// PrivacyLayer - Withdrawal Proof Circuit
// ============================================================
// The core privacy circuit entrypoint. Delegates to the spend module
// for constraint verification, keeping the public interface clear while
// encapsulating implementation details and test scaffolding.
//
// The circuit proves:
//   1. I know (nullifier, secret) such that commitment = Hash(nullifier, secret)
//   2. The commitment exists in the shielded pool Merkle tree
//   3. The nullifier_hash is correctly derived (prevents cross-pool replay)
//   4. The recipient and amount are bound to the proof
//
// This proof is verified on-chain via Stellar Protocol 25 BN254 pairing
// host functions (CAP-0074).
//
// Inspired by:
//   - Tornado Cash withdraw.circom
//   - Aztec.nr spend circuit patterns
//   - Penumbra Spend circuit (groth16)
// ============================================================

mod spend;
mod tests;

/// Full withdrawal proof circuit entrypoint.
///
/// # Private witnesses (known only to the note holder)
/// - `nullifier`  : per-note random value; revealed via nullifier_hash
/// - `secret`     : per-note random value; never revealed
/// - `leaf_index` : position of commitment in the Merkle tree (range: [0, 2^20-1])
/// - `hash_path`  : Merkle authentication path (siblings at each level)
///
/// # Public inputs (verified on-chain)
/// - `pool_id`        : unique identifier for the shielded pool
/// - `root`           : Merkle root that proves membership
/// - `nullifier_hash` : Hash(nullifier, root) - prevents double-spend
/// - `recipient`      : Stellar address hash - prevents front-running
/// - `amount`         : denomination being withdrawn
/// - `relayer`        : optional relayer address hash (0 if none)
/// - `fee`            : relayer fee (0 if no relayer)
/// - `denomination`   : fixed denomination of the pool (ZK-030)
fn main(
    // --- Private witnesses ---
    nullifier: Field,
    secret: Field,
    leaf_index: Field,
    hash_path: [Field; 20],

    // --- Public inputs ---
    pool_id: pub Field,
    root: pub Field,
    nullifier_hash: pub Field,
    recipient: pub Field,
    amount: pub Field,
    relayer: pub Field,
    fee: pub Field,
    denomination: pub Field,
) {
    // Delegate all constraint verification to the spend module
    spend::verify_withdrawal_constraints(
        nullifier,
        secret,
        pool_id,
        leaf_index,
        hash_path,
        root,
        nullifier_hash,
        recipient,
        amount,
        relayer,
        fee,
        denomination,
    );
}
