#!/usr/bin/env bash
# ============================================================
# ZK-065: Full ZK Validation — Local Reproduction Script
# ============================================================
# Mirrors the exact CI checks from .github/workflows/zk-full-validation.yml
# so any contributor can reproduce failures locally before pushing.
#
# Usage:
#   chmod +x scripts/zk-full-validation-local.sh
#   ./scripts/zk-full-validation-local.sh            # all checks
#   ./scripts/zk-full-validation-local.sh --rebuild  # recompile + update artifacts
#   ./scripts/zk-full-validation-local.sh --nargo    # Nargo tests only
#   ./scripts/zk-full-validation-local.sh --sdk      # SDK Jest tests only
#   ./scripts/zk-full-validation-local.sh --drift    # artifact drift check only
#   ./scripts/zk-full-validation-local.sh --manifest # manifest validation only
#
# Requirements:
#   - nargo  (https://noir-lang.org/docs/getting_started/installation)
#   - node >= 20 (https://nodejs.org)
#   - npm
# ============================================================

set -euo pipefail

# ── Resolve repo root ─────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Parse flags ───────────────────────────────────────────────
RUN_ALL=true
RUN_NARGO=false
RUN_SDK=false
RUN_DRIFT=false
RUN_MANIFEST=false
DO_REBUILD=false

for arg in "$@"; do
  case "$arg" in
    --nargo)    RUN_ALL=false; RUN_NARGO=true ;;
    --sdk)      RUN_ALL=false; RUN_SDK=true ;;
    --drift)    RUN_ALL=false; RUN_DRIFT=true ;;
    --manifest) RUN_ALL=false; RUN_MANIFEST=true ;;
    --rebuild)  DO_REBUILD=true ;;
    -h|--help)
      sed -n '4,24p' "$0"   # print the usage block
      exit 0 ;;
    *)
      echo "Unknown flag: $arg  (try --help)"
      exit 1 ;;
  esac
done

if $RUN_ALL; then
  RUN_NARGO=true
  RUN_SDK=true
  RUN_DRIFT=true
  RUN_MANIFEST=true
fi

# ── Colours ───────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

header() { echo -e "\n${CYAN}══ $1 ══${NC}"; }
pass()   { echo -e "${GREEN}  ✅ $1${NC}"; }
fail()   { echo -e "${RED}  ❌ $1${NC}"; exit 1; }
info()   { echo -e "  ℹ️  $1"; }

# ── Prerequisite checks ───────────────────────────────────────
header "Prerequisite check"

if ! command -v nargo &>/dev/null; then
  echo -e "${RED}❌ nargo not found.${NC}"
  echo "   Install via: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && noirup"
  exit 1
fi
NARGO_VER=$(nargo --version 2>/dev/null || echo "unknown")
info "nargo  : $NARGO_VER"

if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ node not found.${NC}"
  echo "   Install Node.js >= 20 from https://nodejs.org"
  exit 1
fi
NODE_VER=$(node --version 2>/dev/null)
info "node   : $NODE_VER"

if ! command -v npm &>/dev/null; then
  echo -e "${RED}❌ npm not found.${NC}"
  exit 1
fi
NPM_VER=$(npm --version 2>/dev/null)
info "npm    : v$NPM_VER"

echo ""

# ── Optional rebuild ──────────────────────────────────────────
if $DO_REBUILD; then
  header "Rebuilding ZK artifacts (--rebuild)"
  echo "  Running scripts/rebuild-zk.sh ..."
  bash scripts/rebuild-zk.sh
  pass "Rebuild complete."
fi

# ════════════════════════════════════════════════════════════
# CHECK 1: Manifest exists
# ════════════════════════════════════════════════════════════
if $RUN_MANIFEST || $RUN_ALL; then
  header "Manifest validation"

  MANIFEST="artifacts/zk/manifest.json"
  if [ ! -f "$MANIFEST" ]; then
    fail "artifacts/zk/manifest.json is missing. Run: node scripts/refresh_manifest.mjs 1"
  fi

  node - << 'EOF'
const fs   = require('fs');
const path = require('path');

const manifestPath = path.resolve('artifacts/zk/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const errors = [];

if (typeof manifest.version !== 'number')
  errors.push('missing or invalid top-level "version" field');

if (!manifest.backend || !manifest.backend.name)
  errors.push('missing backend.name');

if (!manifest.circuits || typeof manifest.circuits !== 'object')
  errors.push('missing circuits map');
else {
  for (const c of ['withdraw', 'commitment']) {
    if (!manifest.circuits[c])
      errors.push(`circuits.${c} is absent from manifest`);
    else {
      if (!manifest.circuits[c].artifact_sha256) errors.push(`circuits.${c}.artifact_sha256 missing`);
      if (!manifest.circuits[c].path)           errors.push(`circuits.${c}.path missing`);
    }
  }
}

if (errors.length) {
  console.error('❌ Manifest validation failed:');
  errors.forEach(e => console.error('   -', e));
  process.exit(1);
}

console.log('  version  :', manifest.version);
console.log('  backend  :', manifest.backend.name);
console.log('  circuits :', Object.keys(manifest.circuits).join(', '));
EOF
  pass "manifest.json is valid."

  if [ ! -f "artifacts/zk/commitment_vectors.json" ]; then
    fail "artifacts/zk/commitment_vectors.json is missing. Run: node scripts/generate_commitment_vectors.mjs 1"
  fi
  pass "commitment_vectors.json exists."
fi

# ════════════════════════════════════════════════════════════
# CHECK 2: Nargo circuit tests
# ════════════════════════════════════════════════════════════
if $RUN_NARGO; then
  header "Nargo circuit tests"

  CIRCUIT_PASS=0
  CIRCUIT_FAIL=0

  for pkg in commitment merkle withdraw; do
    echo "  → nargo test --package $pkg"
    if (cd circuits && nargo test --package "$pkg" 2>&1); then
      pass "Circuit $pkg — all tests passed"
      CIRCUIT_PASS=$((CIRCUIT_PASS + 1))
    else
      echo -e "${RED}  ❌ Circuit $pkg — FAILED${NC}"
      CIRCUIT_FAIL=$((CIRCUIT_FAIL + 1))
    fi
  done

  if [ "$CIRCUIT_FAIL" -gt 0 ]; then
    fail "$CIRCUIT_FAIL circuit(s) failed Nargo tests."
  fi
  pass "All $CIRCUIT_PASS Nargo circuit tests passed."
fi

# ════════════════════════════════════════════════════════════
# CHECK 3: SDK ZK Jest tests
# ════════════════════════════════════════════════════════════
if $RUN_SDK; then
  header "SDK ZK Jest tests"

  if [ ! -d "sdk/node_modules" ]; then
    echo "  📦 node_modules not found — running npm ci..."
    (cd sdk && npm ci --no-fund --no-audit)
  fi

  echo "  → npm test (in sdk/)"
  if (cd sdk && CI=true CIRCUIT_ARTIFACTS_PATH=../artifacts/zk npm test 2>&1); then
    pass "SDK Jest tests passed."
  else
    fail "SDK Jest tests FAILED."
  fi

  echo "  → ZK proof smoke test"
  if node scripts/zk/zk-proof-smoke.mjs 2>&1; then
    pass "ZK proof smoke test passed."
  else
    fail "ZK proof smoke test FAILED."
  fi
fi

# ════════════════════════════════════════════════════════════
# CHECK 4: Artifact drift detection
# ════════════════════════════════════════════════════════════
if $RUN_DRIFT; then
  header "Artifact drift detection"

  echo "  📸 Snapshotting current artifacts/zk/ hashes..."
  find artifacts/zk -type f | sort | xargs sha256sum > /tmp/artifacts_before.txt

  echo "  📦 Recompiling circuits..."
  for pkg in commitment merkle withdraw; do
    echo "    → nargo compile --package $pkg"
    (cd circuits && nargo compile --package "$pkg")
  done

  echo "  📋 Copying recompiled artifacts..."
  for pkg in commitment merkle withdraw; do
    if [ -f "circuits/target/$pkg.json" ]; then
      cp "circuits/target/$pkg.json" "artifacts/zk/$pkg.json"
    fi
  done

  # Best-effort manifest refresh
  node scripts/refresh_manifest.mjs 1 2>/dev/null || true

  echo "  🔍 Checking git diff on artifacts/zk/..."
  git diff --stat artifacts/zk/

  if ! git diff --quiet artifacts/zk/; then
    echo ""
    echo -e "${RED}❌ ARTIFACT DRIFT DETECTED!${NC}"
    echo "   Committed artifacts/zk/ do not match the freshly compiled output."
    echo ""
    echo "   To fix:"
    echo "     bash scripts/rebuild-zk.sh"
    echo "     git add artifacts/zk/"
    echo "     git commit -m 'chore: update ZK artifacts'"
    echo ""
    git diff artifacts/zk/
    # Restore original state so the working tree isn't left dirty
    git checkout -- artifacts/zk/
    exit 1
  fi

  # Restore working tree (recompile may have changed timestamps)
  git checkout -- artifacts/zk/ 2>/dev/null || true
  pass "No artifact drift detected — artifacts are in sync."
fi

# ── Final summary ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ ZK-065 local validation PASSED${NC}"
echo -e "${GREEN}══════════════════════════════════════${NC}"
echo ""
echo "  All checks match the CI pipeline in:"
echo "  .github/workflows/zk-full-validation.yml"
echo ""
