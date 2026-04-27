// ============================================================
// PrivacyLayer — Contract State Types
// ============================================================
// Defines all persistent state data structures used by the
// privacy pool Soroban contract.
//
// Storage keys use the DataKey enum pattern recommended by soroban-sdk.
// ============================================================

use soroban_sdk::{contracttype, Address, BytesN, Env, Vec};

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
    /// Pool configuration for a specific pool — DataKey::PoolConfig(pool_id) → PoolConfig
    PoolConfig(PoolId),
    /// Current Merkle tree state (root index, next leaf index) per pool
    TreeState(PoolId),
    /// Historical Merkle roots — DataKey::Root(pool_id, index) → BytesN<32>
    Root(PoolId, u32),
    /// Merkle tree filled subtree hashes at each level — DataKey::FilledSubtree(pool_id, level) → BytesN<32>
    FilledSubtree(PoolId, u32),
    /// Spent nullifier hashes — DataKey::Nullifier(pool_id, hash) → bool
    Nullifier(PoolId, BytesN<32>),
    /// Verification key for the Groth16 proof system per pool
    VerifyingKey(PoolId),
    /// Aggregate analytics counters (no user-identifiable data) - GLOBAL
    AnalyticsState,
    /// Fixed-size hourly analytics buckets for trend charts - GLOBAL
    AnalyticsBucket(u32),
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

    /// Encodes the denomination amount as a 32-byte big-endian field element.
    pub fn encode_as_field(&self, env: &Env) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        let amount_be = self.amount().to_be_bytes();
        bytes[16..32].copy_from_slice(&amount_be); // i128 is 16 bytes
        BytesN::from_array(env, &bytes)
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
/// Structure (Groth16 VK for 8 public inputs):
///   alpha_g1   : 64 bytes (G1 point)
///   beta_g2    : 128 bytes (G2 point)
///   gamma_g2   : 128 bytes (G2 point)
///   delta_g2   : 128 bytes (G2 point)
///   gamma_abc  : 9 * 64 bytes (one G1 point per public input + 1)
///
/// Total: 64 + 128 + 128 + 128 + (9 * 64) = 1024 bytes
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
    /// G1 points for public input combination: [IC_0, IC_1, ..., IC_8]
    /// One per public input (pool_id, root, nullifier_hash, recipient, amount, relayer, fee, denomination) + IC_0
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
    /// unique identifier for the shielded pool
    pub pool_id: BytesN<32>,
    /// Root of the Merkle tree at deposit time (must be a known historical root)
    pub root: BytesN<32>,
    /// Poseidon2(nullifier, root) — prevents double-spend
    pub nullifier_hash: BytesN<32>,
    /// Stellar address of the withdrawal recipient (as field element)
    pub recipient: BytesN<32>,
    /// Amount being withdrawn (as field element)
    pub amount: BytesN<32>,
    /// Relayer address (zero if none)
    pub relayer: BytesN<32>,
    /// Relayer fee (zero if none)
    pub fee: BytesN<32>,
    /// Fixed denomination of the pool
    pub denomination: BytesN<32>,
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

// ──────────────────────────────────────────────────────────────
// Analytics Types
// ──────────────────────────────────────────────────────────────

/// Performance metric category.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PerformanceMetricKind {
    PageLoad,
    Deposit,
    Withdraw,
}

/// Aggregate performance totals used to compute averages.
#[contracttype]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct PerformanceTotals {
    pub page_load_total_ms: u64,
    pub page_load_samples: u64,
    pub deposit_total_ms: u64,
    pub deposit_samples: u64,
    pub withdraw_total_ms: u64,
    pub withdraw_samples: u64,
}

/// Global aggregate analytics state (privacy-preserving).
#[contracttype]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct AnalyticsState {
    pub page_views: u64,
    pub successful_deposits: u64,
    pub successful_withdrawals: u64,
    pub error_count: u64,
    pub performance: PerformanceTotals,
}

/// One hourly aggregate bucket for historical trends.
#[contracttype]
#[derive(Clone, Debug, Default, PartialEq)]
pub struct AnalyticsBucket {
    pub hour_epoch: u64,
    pub page_views: u32,
    pub deposits: u32,
    pub withdrawals: u32,
    pub errors: u32,
}

/// Public analytics view returned by the contract.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AnalyticsSnapshot {
    pub page_views: u64,
    pub deposit_count: u32,
    pub withdrawal_count: u64,
    pub error_count: u64,
    pub error_rate_bps: u32,
    pub avg_page_load_ms: u32,
    pub avg_deposit_ms: u32,
    pub avg_withdraw_ms: u32,
    pub hourly_trend: Vec<AnalyticsBucket>,
}
