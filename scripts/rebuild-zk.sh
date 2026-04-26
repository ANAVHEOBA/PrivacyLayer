#!/bin/bash
# ============================================================
# PrivacyLayer - Deterministic ZK Rebuild
# ============================================================
# Regenerates all ZK artifacts, fixtures, and manifests from source.
# Ensures the repository state is consistent and deterministic.
# ============================================================

set -e

UPDATE_BASELINES=false
if [[ "$1" == "--update-baselines" ]]; then
  UPDATE_BASELINES=true
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🧹 Cleaning stale artifacts..."
rm -rf circuits/target

echo "📦 Compiling circuits..."
for pkg in commitment withdraw; do
  echo "  → Building $pkg..."
  (cd "circuits" && nargo compile --package "$pkg")
  cp "circuits/target/$pkg.json" "artifacts/zk/"
done

echo "🧪 Regenerating shared commitment vectors..."
node scripts/generate_commitment_vectors.mjs

echo "📝 Refreshing manifest..."
node scripts/refresh_manifest.mjs

if [ "$UPDATE_BASELINES" = true ]; then
  echo "📊 Updating constraint baselines..."
  node scripts/update_baselines.mjs
else
  echo "🔍 Verifying constraints..."
  node scripts/check_circuit_constraints.mjs
fi

echo "✨ ZK rebuild complete and idempotent."
