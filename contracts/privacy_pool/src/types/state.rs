// ============================================================
// PrivacyLayer — Contract State Types
// ============================================================
// Defines all persistent state data structures used by the
// privacy pool Soroban contract.
//
// Storage keys use the DataKey enum pattern recommended by soroban-sdk.
// ============================================================

use soroban_sdk::{contracttype, Address, BytesN};

// ──────────────────────────────────────────────────────────────
// Storage Keys
// ──────────────────────────────────────────────────────────────

/// Unique identifier for a pool (typically hash of token address and denomination).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolId(pub BytesN<32>);

/// Primary storage key enum for the contract.
/// Each variant maps to a distinct key in persistent storage.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    /// Contract configuration (admin, etc.) - GLOBAL
    Config,
    /// Pool-specific configuration - Scoped by PoolId
    PoolConfig(PoolId),
    /// Current Merkle tree state (root index, next leaf index) - Scoped by PoolId
    TreeState(PoolId),
    /// Historical Merkle roots — DataKey::Root(PoolId, index) → BytesN<32>
    Root(PoolId, u32),
    /// Merkle tree filled subtree hashes at each level — DataKey::FilledSubtree(PoolId, level) → BytesN<32>
    FilledSubtree(PoolId, u32),
    /// Spent nullifier hashes — DataKey::Nullifier(PoolId, hash) → bool
    Nullifier(PoolId, BytesN<32>),
    /// Verification key for the Groth16 proof system - Scoped by PoolId
    VerifyingKey(PoolId),
}

// ──────────────────────────────────────────────────────────────
// Contract Configuration
// ──────────────────────────────────────────────────────────────

/// Fixed denomination amounts supported by the pool.
/// Using fixed denominations prevents amount-based correlation attacks.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Denomination {
    /// 10 XLM (in stroops: 10 * 10_000_000)
    Xlm10,
    /// 100 XLM
    Xlm100,
    /// 1000 XLM
    Xlm1000,
    /// 100 USDC (6 decimal places: 100 * 1_000_000)
    Usdc100,
    /// 1000 USDC
    Usdc1000,
}

impl Denomination {
    /// Returns the stroop/microunit amount for this denomination.
    pub fn amount(&self) -> i128 {
        match self {
            Denomination::Xlm10   =>     100_000_000, // 10 XLM
            Denomination::Xlm100  =>   1_000_000_000, // 100 XLM
            Denomination::Xlm1000 =>  10_000_000_000, // 1000 XLM
            Denomination::Usdc100  =>      100_000_000, // 100 USDC (6 dec)
            Denomination::Usdc1000 =>    1_000_000_000, // 1000 USDC
        }
    }
}

/// Global contract configuration.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Config {
    /// Global administrator (can create pools, pause the contract)
    pub admin: Address,
}

/// Pool configuration — specific to each token/denomination pair.
#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolConfig {
    /// Token contract address (XLM native or USDC)
    pub token: Address,
    /// Fixed deposit denomination enforced by the pool
    pub denomination: Denomination,
    /// Merkle tree depth (always 20)
    pub tree_depth: u32,
    /// Maximum number of historical roots to keep
    pub root_history_size: u32,
    /// Whether this specific pool is paused
    pub paused: bool,
}

/// Merkle tree state — updated on every deposit.
#[contracttype]
#[derive(Clone, Debug, Default)]
pub struct TreeState {
    /// Index of the most recently inserted root in root history
    pub current_root_index: u32,
    /// Index of the next leaf to be inserted (= total number of deposits)
    pub next_index: u32,
}

/// Groth16 verifying key — stored on-chain and used to verify withdrawal proofs.
/// Encoded as raw bytes (G1/G2 points on BN254, uncompressed).
///
/// Structure (Groth16 VK for 6 public inputs):
///   alpha_g1   : 64 bytes (G1 point)
///   beta_g2    : 128 bytes (G2 point)
///   gamma_g2   : 128 bytes (G2 point)
///   delta_g2   : 128 bytes (G2 point)
///   gamma_abc  : 7 * 64 bytes (one G1 point per public input + 1)
///
/// Total: 64 + 128 + 128 + 128 + (7 * 64) = 896 bytes
#[contracttype]
#[derive(Clone, Debug)]
pub struct VerifyingKey {
    /// G1 point: alpha
    pub alpha_g1: BytesN<64>,
    /// G2 point: beta
    pub beta_g2: BytesN<128>,
    /// G2 point: gamma
    pub gamma_g2: BytesN<128>,
    /// G2 point: delta
    pub delta_g2: BytesN<128>,
    /// G1 points for public input combination: [IC_0, IC_1, ..., IC_6]
    /// One per public input (root, nullifier_hash, recipient, amount, relayer, fee) + IC_0
    pub gamma_abc_g1: soroban_sdk::Vec<BytesN<64>>,
}

// ──────────────────────────────────────────────────────────────
// Proof Input Types
// ──────────────────────────────────────────────────────────────

/// Public inputs to the withdrawal Groth16 proof.
/// Each field corresponds to a public input in the withdraw circuit.
/// Order must match the circuit's public input ordering.
#[contracttype]
#[derive(Clone, Debug)]
pub struct PublicInputs {
    /// Root of the Merkle tree at deposit time (must be a known historical root)
    pub root: BytesN<32>,
    /// Poseidon2(nullifier, root) — prevents double-spend
    pub nullifier_hash: BytesN<32>,
    /// Stellar address of the withdrawal recipient (as field element)
    pub recipient: BytesN<32>,
    /// Denomination amount being withdrawn
    pub amount: BytesN<32>,
    /// Relayer address (zero if none)
    pub relayer: BytesN<32>,
    /// Relayer fee (zero if none)
    pub fee: BytesN<32>,
}

/// Groth16 proof — three elliptic curve points on BN254.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Proof {
    /// G1 point: A (64 bytes, uncompressed)
    pub a: BytesN<64>,
    /// G2 point: B (128 bytes, uncompressed)
    pub b: BytesN<128>,
    /// G1 point: C (64 bytes, uncompressed)
    pub c: BytesN<64>,
}
