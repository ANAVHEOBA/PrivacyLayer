#!/bin/bash

set -e

echo "🧹 Cleaning artifacts..."
rm -rf target

echo "📦 Building circuits with pinned Noir..."

for dir in circuits/*/; do
  if [ -f "$dir/Nargo.toml" ]; then
    echo "➡️ Building $dir"
    (cd "$dir" && nargo compile)
  fi
done

echo "✅ All circuits built successfully"