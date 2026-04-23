// ============================================================
// PrivacyLayer — Contract Errors
// ============================================================

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // ── Initialization ─────────────────────────────────
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract has not been initialized yet
    NotInitialized = 2,

    // ── Access Control ─────────────────────────────────
    /// Caller is not the admin
    UnauthorizedAdmin = 10,

    // ── Pool State ─────────────────────────────────────
    /// Pool is paused — deposits and withdrawals blocked
    PoolPaused = 20,
    /// Merkle tree is full (2^20 notes inserted)
    TreeFull = 21,
    /// Pool with the given ID not found
    PoolNotFound = 22,

    // ── Deposit ────────────────────────────────────────
    /// Wrong deposit amount — must match the pool denomination
    WrongAmount = 30,
    /// Commitment is the zero value (not allowed)
    ZeroCommitment = 31,

    // ── Withdrawal ─────────────────────────────────────
    /// The provided Merkle root is not in the root history
    UnknownRoot = 40,
    /// This nullifier has already been spent (double-spend attempt)
    NullifierAlreadySpent = 41,
    /// Groth16 proof verification failed
    InvalidProof = 42,
    /// Fee exceeds the withdrawal amount
    FeeExceedsAmount = 43,
    /// Relayer address is non-zero but fee is zero
    InvalidRelayerFee = 44,
    /// Recipient address is invalid
    InvalidRecipient = 45,

    // ── Verifying Key ──────────────────────────────────
    /// Verifying key has not been set
    NoVerifyingKey = 50,
    /// Verifying key is malformed (wrong byte length)
    MalformedVerifyingKey = 51,

    // ── Proof Format ──────────────────────────────────
    /// Proof point A has wrong length
    MalformedProofA = 60,
    /// Proof point B has wrong length
    MalformedProofB = 61,
    /// Proof point C has wrong length
    MalformedProofC = 62,

    // ── BN254 Arithmetic ──────────────────────────────
    /// BN254 point is not on curve
    PointNotOnCurve = 70,
    /// BN254 pairing check failed unexpectedly
    PairingFailed = 71,
}
