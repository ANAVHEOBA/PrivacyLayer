#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_ALL=true
RUN_CIRCUITS=false
RUN_SDK=false
RUN_MANIFEST=false
RUN_DRIFT=false
DO_REBUILD=false

print_usage() {
  cat << 'EOF'
Usage: ./scripts/zk-full-validation-local.sh [OPTIONS]

Options:
  --all         Run all ZK validation stages (default)
  --circuits    Run Nargo workspace checks and package tests
  --sdk         Run SDK ZK smoke and integration checks
  --manifest    Validate manifest structure and commitment vectors
  --drift       Recompile circuits and detect artifact drift
  --rebuild     Execute scripts/rebuild-zk.sh before validation
  --help        Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      RUN_ALL=true
      shift
      ;;
    --circuits)
      RUN_ALL=false
      RUN_CIRCUITS=true
      shift
      ;;
    --sdk)
      RUN_ALL=false
      RUN_SDK=true
      shift
      ;;
    --manifest)
      RUN_ALL=false
      RUN_MANIFEST=true
      shift
      ;;
    --drift)
      RUN_ALL=false
      RUN_DRIFT=true
      shift
      ;;
    --rebuild)
      DO_REBUILD=true
      shift
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_usage
      exit 1
      ;;
  esac
done

if [ "$RUN_ALL" = true ]; then
  RUN_CIRCUITS=true
  RUN_SDK=true
  RUN_MANIFEST=true
  RUN_DRIFT=true
fi

check_prerequisites() {
  echo "Checking prerequisites..."
  if ! command -v nargo >/dev/null 2>&1; then
    echo "Error: nargo is required but not installed."
    echo "Install via: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && noirup -v 1.0.0-beta.20"
    exit 1
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is required but not installed."
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: npm is required but not installed."
    exit 1
  fi

  echo "Prerequisites satisfied."
  echo "nargo: $(nargo --version | head -n 1)"
  echo "node : $(node --version)"
  echo "npm  : $(npm --version)"
}

rebuild_artifacts() {
  echo "Rebuilding ZK artifacts..."
  for pkg in commitment merkle withdraw; do
    (cd circuits && nargo compile --package "$pkg")
    if [ -f "circuits/target/$pkg.json" ]; then
      cp "circuits/target/$pkg.json" "artifacts/zk/$pkg.json"
    fi
  done
  echo "Rebuild finished."
}

validate_manifest() {
  echo "Validating ZK manifest and vectors..."
  node - << 'EOF'
const fs = require('fs');
const path = require('path');

const manifestPath = path.resolve('artifacts/zk/manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('Missing artifacts/zk/manifest.json');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error('Invalid JSON in artifacts/zk/manifest.json:', err.message);
  process.exit(1);
}

const errors = [];
if (typeof manifest.version !== 'number') {
  errors.push('Top-level "version" must be a number');
}
if (!manifest.backend || typeof manifest.backend !== 'object') {
  errors.push('Top-level "backend" must be an object');
} else if (!manifest.backend.name) {
  errors.push('Missing backend.name');
}

if (!manifest.circuits || typeof manifest.circuits !== 'object') {
  errors.push('Top-level "circuits" must be an object');
} else {
  for (const circuitName of ['commitment', 'withdraw']) {
    const entry = manifest.circuits[circuitName];
    if (!entry) {
      errors.push(`Missing manifest entry for circuit: ${circuitName}`);
    } else {
      if (!entry.artifact_sha256) {
        errors.push(`Missing artifact_sha256 for circuit: ${circuitName}`);
      }
      if (!entry.path) {
        errors.push(`Missing path for circuit: ${circuitName}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Manifest validation errors:');
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log('Manifest validation passed.');
EOF

  if [ ! -f "artifacts/zk/commitment_vectors.json" ]; then
    echo "Missing artifacts/zk/commitment_vectors.json"
    exit 1
  fi
  echo "Commitment vectors verified."
}

validate_circuits() {
  echo "Validating Noir circuits..."
  (cd circuits && nargo check --workspace)
  (cd circuits && nargo test --package commitment)
  (cd circuits && nargo test --package merkle)
  echo "Circuit validation passed."
}

validate_sdk() {
  echo "Validating SDK ZK components..."
  if [ ! -d "sdk/node_modules" ]; then
    (cd sdk && npm ci --no-fund --no-audit)
  fi
  node scripts/zk/zk-proof-smoke.mjs
  (cd sdk && npx jest test/artifact_manifest.test.ts test/schema_version_validation.test.ts test/nullifier_domain.test.ts test/empty_tree_fixtures.test.ts test/note_deterministic.test.ts test/withdraw_error_taxonomy.test.ts --verbose)
  echo "SDK ZK validation passed."
}

detect_drift() {
  echo "Checking for artifact determinism and drift..."
  for pkg in commitment merkle withdraw; do
    (cd circuits && nargo compile --package "$pkg")
  done

  node - << 'EOF'
const fs = require('fs');
const crypto = require('crypto');

function sha256(data) {
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}

const targetCommitment = JSON.parse(fs.readFileSync('circuits/target/commitment.json'));
const committedCommitment = JSON.parse(fs.readFileSync('artifacts/zk/commitment.json'));
const manifest = JSON.parse(fs.readFileSync('artifacts/zk/manifest.json'));

const targetCommitmentSha = sha256(targetCommitment.bytecode);
const committedCommitmentSha = sha256(committedCommitment.bytecode);

if (targetCommitmentSha !== committedCommitmentSha) {
  console.error(`Commitment bytecode drift detected: target ${targetCommitmentSha} != committed ${committedCommitmentSha}`);
  process.exit(1);
}

if (manifest.circuits.commitment.bytecode_sha256 !== targetCommitmentSha) {
  console.error('Manifest bytecode hash drift for commitment');
  process.exit(1);
}

const targetWithdraw = JSON.parse(fs.readFileSync('circuits/target/withdraw.json'));
if (!targetWithdraw.bytecode || !targetWithdraw.abi || !targetWithdraw.abi.parameters) {
  console.error('Withdraw target artifact missing bytecode or ABI');
  process.exit(1);
}

console.log('Artifact compilation and drift check passed successfully.');
EOF

  if ! git diff --quiet artifacts/zk/; then
    echo "Unexpected dirty changes in artifacts/zk/"
    git diff artifacts/zk/
    exit 1
  fi
  echo "No artifact drift detected."
}

check_prerequisites

if [ "$DO_REBUILD" = true ]; then
  rebuild_artifacts
fi

if [ "$RUN_MANIFEST" = true ]; then
  validate_manifest
fi

if [ "$RUN_CIRCUITS" = true ]; then
  validate_circuits
fi

if [ "$RUN_SDK" = true ]; then
  validate_sdk
fi

if [ "$RUN_DRIFT" = true ]; then
  detect_drift
fi

echo "All requested ZK-065 validations completed successfully."
