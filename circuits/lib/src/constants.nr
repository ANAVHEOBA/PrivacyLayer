pub global MERKLE_TREE_DEPTH: u32 = 20;

pub global ZERO_ADDRESS: Field = 0;

pub global STROOPS_PER_XLM: Field = 10_0000000;

// ============================================================
// Denomination Constants (ZK-030)
// ============================================================
// Fixed-denomination pools enforce that withdrawals can only
// occur for the exact amount class of the pool. This prevents
// amount manipulation and ensures consistency between note
// commitments and withdrawal proofs.
//
// Denomination values are expressed in the smallest unit (stroops for XLM).
// Common denominations:
// - 100 XLM  = 1_000_000_000 stroops
// - 1000 XLM = 10_000_000_000 stroops
// - 10000 XLM = 100_000_000_000 stroops
// ============================================================

pub global DENOMINATION_100_XLM: Field = 1_000_000_000;
pub global DENOMINATION_1000_XLM: Field = 10_000_000_000;
pub global DENOMINATION_10000_XLM: Field = 100_000_000_000;

// Default denomination for testing (100 XLM)
pub global DEFAULT_DENOMINATION: Field = DENOMINATION_100_XLM;
