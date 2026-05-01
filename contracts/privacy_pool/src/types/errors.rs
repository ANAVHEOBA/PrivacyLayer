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
    /// Pool ID does not match canonical derivation
    InvalidPoolId = 23,

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
    /// Pool ID in public inputs does not match the pool being withdrawn from
    InvalidPoolId = 46,
    /// Denomination in public inputs does not match the pool denomination
    InvalidDenomination = 47,

    // ── Verifying Key ──────────────────────────────────
    /// Verifying key has not been set
    NoVerifyingKey = 50,
    /// Verifying key is malformed (wrong byte length)
    MalformedVerifyingKey = 51,
    /// Circuit ID mismatch between VK and expected circuit
    CircuitIdMismatch = 52,
    /// Public input count mismatch between proof and VK
    PublicInputCountMismatch = 53,
    /// VK alpha_g1 has wrong byte length (expected 64)
    VkAlphaG1WrongLength = 54,
    /// VK beta_g2 has wrong byte length (expected 128)
    VkBetaG2WrongLength = 55,
    /// VK gamma_g2 has wrong byte length (expected 128)
    VkGammaG2WrongLength = 56,
    /// VK delta_g2 has wrong byte length (expected 128)
    VkDeltaG2WrongLength = 57,
    /// VK gamma_abc_g1 vector has wrong length (expected 9 for 8 public inputs)
    VkIcVectorWrongLength = 58,
    /// VK gamma_abc_g1 contains a point with wrong byte length (expected 64)
    VkIcPointWrongLength = 59,

    // ── Proof Format ──────────────────────────────────
    /// Proof point A has wrong length (expected 64)
    MalformedProofA = 60,
    /// Proof point B has wrong length (expected 128)
    MalformedProofB = 61,
    /// Proof point C has wrong length (expected 64)
    MalformedProofC = 62,
    
    // ── Public Inputs ──────────────────────────────────
    /// Public input field has wrong byte length (expected 32)
    PublicInputWrongLength = 63,

    // ── BN254 Arithmetic ──────────────────────────────
    /// BN254 point is not on curve
    PointNotOnCurve = 70,
    /// BN254 pairing check failed unexpectedly
    PairingFailed = 71,

    // ── Schema Versioning ──────────────────────────────
    /// Schema version format is invalid
    InvalidSchemaVersion = 80,
    /// Proof schema version does not match expected version
    SchemaVersionMismatch = 81,
}
