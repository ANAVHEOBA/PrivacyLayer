#!/bin/bash
# ============================================================
# PrivacyLayer - Deterministic ZK Rebuild (ZK-041)
# ============================================================
# Regenerates all ZK artifacts, fixtures, and manifests from source.
# Ensures the repository state is consistent and deterministic.
# Uses versioned directory structure for artifact organization.
# ============================================================

set -e

UPDATE_BASELINES=false
if [[ "$1" == "--update-baselines" ]]; then
  UPDATE_BASELINES=true
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ZK-041: Use versioned artifact directory
ZK_VERSION="1"
ARTIFACTS_DIR="artifacts/zk/v${ZK_VERSION}"

echo "🧹 Cleaning stale artifacts..."
rm -rf circuits/commitment/target
rm -rf circuits/withdraw/target
rm -rf circuits/merkle/target
rm -rf "$ARTIFACTS_DIR"

echo "📦 Creating versioned artifact directories..."
mkdir -p "$ARTIFACTS_DIR/circuits/commitment"
mkdir -p "$ARTIFACTS_DIR/circuits/withdraw"
mkdir -p "$ARTIFACTS_DIR/circuits/merkle"
mkdir -p "$ARTIFACTS_DIR/manifests"
mkdir -p "$ARTIFACTS_DIR/fixtures/commitment"
mkdir -p "$ARTIFACTS_DIR/fixtures/withdraw"
mkdir -p "$ARTIFACTS_DIR/fixtures/merkle"
mkdir -p "$ARTIFACTS_DIR/proving_keys/commitment"
mkdir -p "$ARTIFACTS_DIR/proving_keys/withdraw"
mkdir -p "$ARTIFACTS_DIR/proving_keys/merkle"
rm -rf circuits/target

echo "📦 Compiling circuits..."
for pkg in commitment withdraw merkle; do
  echo "  → Building $pkg..."
  (cd "circuits" && nargo compile --package "$pkg")
  cp "circuits/target/$pkg.json" "artifacts/zk/"
done

echo "🧪 Regenerating shared commitment vectors..."
node scripts/generate_commitment_vectors.mjs

echo "📝 Refreshing manifest..."
node scripts/refresh_manifest.mjs "$ZK_VERSION"

if [ "$UPDATE_BASELINES" = true ]; then
  echo "📊 Updating constraint baselines..."
  node scripts/update_baselines.mjs "$ZK_VERSION"
else
  echo "🔍 Verifying constraints..."
  node scripts/check_circuit_constraints.mjs "$ZK_VERSION"
fi

echo "✨ ZK rebuild complete and idempotent."
echo "📁 Artifacts located at: $ARTIFACTS_DIR"
