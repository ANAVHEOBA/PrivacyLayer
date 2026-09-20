#!/usr/bin/env bash
# =============================================================================
# run_zk_validation.sh
#
# Executes the full ZK validation stack:
#   1. Runs all Nargo circuit tests.
#   2. Executes the SDK test suite.
#   3. Performs deterministic artifact rebuild validation.
#
# This script can be used locally as well as from CI.
# =============================================================================

set -euo pipefail

# -------------------------------------------------------------------------
# 1️⃣ Run Nargo circuit tests
# -------------------------------------------------------------------------
echo "🔧 Running Nargo circuit tests..."
pushd "$(git rev-parse --show-toplevel)/circuits" > /dev/null
if command -v nargo >/dev/null 2>&1; then
  nargo test
else
  echo "❌ nargo binary not found. Ensure Noir is installed."
  exit 1
fi
popd > /dev/null

# -------------------------------------------------------------------------
# 2️⃣ Run SDK tests
# -------------------------------------------------------------------------
echo "🔧 Running SDK tests..."
pushd "$(git rev-parse --show-toplevel)/sdk" > /dev/null
npm ci
npm test
popd > /dev/null

# -------------------------------------------------------------------------
# 3️⃣ Validate deterministic artifact rebuild
# -------------------------------------------------------------------------
echo "🔧 Validating ZK artifacts..."
node "$(git rev-parse --show-toplevel)/scripts/validate_artifacts.js"
