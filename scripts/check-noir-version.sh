#!/bin/bash

set -e

REQUIRED=$(cat .noir-version)
CURRENT=$(nargo --version | awk '{print $2}')

echo "🔍 Required Noir: $REQUIRED"
echo "🔍 Current Noir: $CURRENT"

if [ "$REQUIRED" != "$CURRENT" ]; then
  echo "❌ Noir version mismatch!"
  echo "👉 Install correct version: $REQUIRED"
  exit 1
fi

echo "✅ Noir version OK"