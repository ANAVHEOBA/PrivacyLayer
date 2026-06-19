#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARTIFACT_DIR="$ROOT_DIR/artifacts/benchmarks"
BASELINE_FILE="$ROOT_DIR/.github/benchmarks/contracts-wasm-size-baseline.txt"

mkdir -p "$ARTIFACT_DIR"

pushd "$ROOT_DIR/contracts" >/dev/null
cargo build --workspace --release --target wasm32-unknown-unknown

wasm_path="$(find "$ROOT_DIR/contracts/target/wasm32-unknown-unknown/release" -name '*.wasm' | head -n 1)"
if [[ -z "${wasm_path:-}" ]]; then
  echo "No wasm artifact found after release build." >&2
  exit 1
fi

current_size="$(wc -c < "$wasm_path" | tr -d ' ')"
baseline_size=""
status="no-baseline"

if [[ -f "$BASELINE_FILE" ]]; then
  baseline_size="$(tr -d ' \n\r' < "$BASELINE_FILE")"
  if [[ -n "$baseline_size" && "$baseline_size" -gt 0 ]]; then
    threshold="$(python3 - <<PY
baseline = int(${baseline_size})
print(int(baseline * 1.10))
PY
)"
    if [[ "$current_size" -gt "$threshold" ]]; then
      status="regression"
    else
      status="ok"
    fi
  else
    baseline_size=""
  fi
fi
popd >/dev/null

{
  echo "# Contract Benchmark Snapshot"
  echo
  echo "- generated_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- git_sha: ${GITHUB_SHA:-$(git -C "$ROOT_DIR" rev-parse HEAD)}"
  echo "- wasm_artifact: ${wasm_path#$ROOT_DIR/}"
  echo "- wasm_size_bytes: ${current_size}"
  if [[ -n "$baseline_size" ]]; then
    echo "- baseline_wasm_size_bytes: ${baseline_size}"
    echo "- allowed_max_wasm_size_bytes: ${threshold}"
  fi
  echo "- status: ${status}"
  echo
  echo "## Workspace metadata"
  echo
  (cd "$ROOT_DIR/contracts" && cargo metadata --no-deps --format-version 1 | jq '{packages: [.packages[].name], workspace_members: .workspace_members}')
  echo
  echo "## Build + benchmark command set"
  echo
  echo '```bash'
  echo 'cargo build --workspace --release --target wasm32-unknown-unknown'
  echo 'cargo test --package privacy_pool'
  echo '```'
} | tee "$ARTIFACT_DIR/summary.md"

if [[ "$status" == "regression" ]]; then
  echo "Benchmark regression detected: wasm artifact grew by more than 10% over baseline." >&2
  exit 1
fi
