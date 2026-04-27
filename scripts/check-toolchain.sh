#!/usr/bin/env bash
# ============================================================
# ZK-118: Supply-chain gate — full ZK trusted toolchain check
# ============================================================
# Verifies all versions that materially affect generated artifacts
# and proof flows: Node, Rust, Noir (nargo), and the proving
# backend. Outputs a machine-readable JSON summary that can be
# embedded in artifact manifests or release bundles.
#
# Usage:
#   bash scripts/check-toolchain.sh              # print report
#   bash scripts/check-toolchain.sh --strict     # exit 1 on any mismatch
#   bash scripts/check-toolchain.sh --json       # JSON output only
# ============================================================

set -euo pipefail

STRICT=false
JSON_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=true ;;
    --json)   JSON_ONLY=true ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Required versions (sources of truth) ──────────────────────
# Node: read from .nvmrc or .node-version if present
REQUIRED_NODE=""
if [[ -f ".nvmrc" ]]; then
  REQUIRED_NODE="$(cat .nvmrc | tr -d '[:space:]')"
elif [[ -f ".node-version" ]]; then
  REQUIRED_NODE="$(cat .node-version | tr -d '[:space:]')"
fi

# Noir: read from .noir-version
REQUIRED_NOIR=""
if [[ -f ".noir-version" ]]; then
  REQUIRED_NOIR="$(cat .noir-version | tr -d '[:space:]')"
fi

# Rust: read from rust-toolchain.toml or rust-toolchain
REQUIRED_RUST=""
if [[ -f "rust-toolchain.toml" ]]; then
  REQUIRED_RUST="$(grep '^channel' rust-toolchain.toml 2>/dev/null | sed 's/.*= *"//' | sed 's/"//' | tr -d '[:space:]')"
elif [[ -f "rust-toolchain" ]]; then
  REQUIRED_RUST="$(cat rust-toolchain | tr -d '[:space:]')"
fi

# ── Detected versions ─────────────────────────────────────────
detect_node() {
  if command -v node &>/dev/null; then
    node --version 2>/dev/null | tr -d 'v[:space:]'
  else
    echo "not-found"
  fi
}

detect_rust() {
  if command -v rustc &>/dev/null; then
    rustc --version 2>/dev/null | awk '{print $2}'
  else
    echo "not-found"
  fi
}

detect_noir() {
  if command -v nargo &>/dev/null; then
    nargo --version 2>/dev/null | awk '{print $2}'
  else
    echo "not-found"
  fi
}

detect_bb() {
  # Barretenberg proving backend
  if command -v bb &>/dev/null; then
    bb --version 2>/dev/null | awk '{print $2}' || echo "unknown"
  else
    echo "not-found"
  fi
}

ACTUAL_NODE="$(detect_node)"
ACTUAL_RUST="$(detect_rust)"
ACTUAL_NOIR="$(detect_noir)"
ACTUAL_BB="$(detect_bb)"

# ── Compare and collect mismatches ────────────────────────────
MISMATCHES=()

check_version() {
  local tool="$1" required="$2" actual="$3"
  if [[ -n "$required" && "$actual" != "$required" ]]; then
    MISMATCHES+=("$tool: required=$required actual=$actual")
  fi
}

check_version "node" "$REQUIRED_NODE" "$ACTUAL_NODE"
check_version "rust" "$REQUIRED_RUST" "$ACTUAL_RUST"
check_version "noir" "$REQUIRED_NOIR" "$ACTUAL_NOIR"

# ── Build JSON report ─────────────────────────────────────────
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
MISMATCH_COUNT="${#MISMATCHES[@]}"
STATUS="ok"
[[ "$MISMATCH_COUNT" -gt 0 ]] && STATUS="mismatch"

MISMATCHES_JSON="[]"
if [[ "$MISMATCH_COUNT" -gt 0 ]]; then
  parts=()
  for m in "${MISMATCHES[@]}"; do
    parts+=("\"$m\"")
  done
  MISMATCHES_JSON="[$(IFS=,; echo "${parts[*]}")]"
fi

JSON_REPORT=$(cat <<EOF
{
  "generated_at": "$TIMESTAMP",
  "status": "$STATUS",
  "toolchain": {
    "node":  { "required": "$REQUIRED_NODE", "actual": "$ACTUAL_NODE" },
    "rust":  { "required": "$REQUIRED_RUST", "actual": "$ACTUAL_RUST" },
    "noir":  { "required": "$REQUIRED_NOIR", "actual": "$ACTUAL_NOIR" },
    "bb":    { "required": "",               "actual": "$ACTUAL_BB"  }
  },
  "mismatches": $MISMATCHES_JSON
}
EOF
)

# ── Output ────────────────────────────────────────────────────
if $JSON_ONLY; then
  echo "$JSON_REPORT"
else
  echo "🔧 ZK-118 Toolchain Gate"
  echo "========================"
  printf "  Node  : required=%-12s actual=%s\n" "${REQUIRED_NODE:-any}" "$ACTUAL_NODE"
  printf "  Rust  : required=%-12s actual=%s\n" "${REQUIRED_RUST:-any}" "$ACTUAL_RUST"
  printf "  Noir  : required=%-12s actual=%s\n" "${REQUIRED_NOIR:-any}" "$ACTUAL_NOIR"
  printf "  bb    : required=%-12s actual=%s\n" "(unpinned)"           "$ACTUAL_BB"

  if [[ "$MISMATCH_COUNT" -gt 0 ]]; then
    echo ""
    echo "❌ Toolchain mismatches:"
    for m in "${MISMATCHES[@]}"; do
      echo "   - $m"
    done
  else
    echo ""
    echo "✅ All pinned toolchain versions match."
  fi

  echo ""
  echo "📄 JSON report:"
  echo "$JSON_REPORT"
fi

# ── Strict mode ───────────────────────────────────────────────
if $STRICT && [[ "$MISMATCH_COUNT" -gt 0 ]]; then
  echo ""
  echo "🛑 --strict: aborting due to toolchain mismatch."
  exit 1
fi
