#!/bin/bash

# PrivacyLayer Fuzzing Test Runner
# Runs all fuzz targets for specified iterations

set -e

echo "=== PrivacyLayer Fuzzing Test Suite ==="
echo "Started at: $(date)"
echo ""

# Configuration
ITERATIONS=${1:-1000000}  # Default: 1M iterations
TIMEOUT=${2:-3600}        # Default: 1 hour per target

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TOTAL_TARGETS=5
PASSED=0
FAILED=0
CRASHES=0

# Function to run a fuzz target
run_fuzz() {
    local target=$1
    echo -e "${YELLOW}Running $target ($ITERATIONS iterations, ${TIMEOUT}s timeout)${NC}"

    # Run fuzz target
    if timeout $TIMEOUT cargo fuzz run "$target" -- \
        -max_total_time=$TIMEOUT \
        -runs=$ITERATIONS \
        2>&1 | tee "fuzz_results/${target}_output.log"; then

        # Check for crashes
        if ls "fuzz_targets/${target}/crash-"* 2>/dev/null; then
            echo -e "${RED}❌ $target: CRASHES FOUND${NC}"
            CRASHES=$((CRASHES + 1))
            FAILED=$((FAILED + 1))

            # Save crash details
            mkdir -p "bugs/found/${target}"
            cp -r "fuzz_targets/${target}/crash-"* "bugs/found/${target}/"
        else
            echo -e "${GREEN}✅ $target: PASSED (no crashes)${NC}"
            PASSED=$((PASSED + 1))
        fi
    else
        exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo -e "${YELLOW}⚠️  $target: TIMEOUT (completed $ITERATIONS iterations)${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ $target: FAILED (exit code $exit_code)${NC}"
            FAILED=$((FAILED + 1))
        fi
    fi

    echo ""
}

# Create output directories
mkdir -p fuzz_results
mkdir -p bugs/found

# Ensure nightly Rust is active
echo "Activating nightly Rust..."
rustup default nightly

# Build fuzz targets first
echo "Building fuzz targets..."
cargo build --release
echo ""

# Run all fuzz targets
run_fuzz "fuzz_merkle"
run_fuzz "fuzz_deposit"
run_fuzz "fuzz_withdraw"
run_fuzz "fuzz_admin"
run_fuzz "fuzz_storage"

# Summary
echo "================================"
echo "=== Fuzzing Summary ==="
echo "================================"
echo ""
echo "Total Targets: $TOTAL_TARGETS"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${RED}Crashes Found: $CRASHES${NC}"
echo ""

if [ $CRASHES -gt 0 ]; then
    echo -e "${RED}⚠️  Crashes detected! Check bugs/found/ directory for details.${NC}"
    echo "Crash files saved in:"
    find bugs/found -name "crash-*" -type f
    exit 1
elif [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some targets failed. Check fuzz_results/ for logs.${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All fuzz targets passed! No crashes found.${NC}"
    echo ""
    echo "Coverage reports:"
    for target in fuzz_merkle fuzz_deposit fuzz_withdraw fuzz_admin fuzz_storage; do
        echo "  - $target: See fuzz_targets/$target/coverage/"
    done
    exit 0
fi
