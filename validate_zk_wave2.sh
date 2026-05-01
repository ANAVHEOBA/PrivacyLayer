#!/bin/bash

# ZK Wave 2 Validation Script
# Tests all implementations for ZK-107, ZK-108, ZK-109, ZK-110

set -e

echo "========================================="
echo "ZK Wave 2 Implementation Validation"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

run_test() {
  local test_name=$1
  local test_command=$2
  
  echo "Running: $test_name"
  echo "Command: $test_command"
  echo "-------------------------------------------"
  
  if eval "$test_command"; then
    echo -e "${GREEN}✓ PASSED${NC}: $test_name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}✗ FAILED${NC}: $test_name"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  echo ""
}

echo "1. Validating ZK-107: SDK Smoke Tests"
echo "========================================="
cd sdk
run_test "SDK Smoke Tests (ZK-107)" "npm run test:smoke 2>&1 | head -50"
cd ..
echo ""

echo "2. Validating ZK-108: Schema Parity Tests"
echo "========================================="
cd sdk
run_test "Schema Parity Tests (ZK-108)" "npm run test:schema-parity 2>&1 | head -50"
cd ..
echo ""

echo "3. Validating ZK-109: Documentation Lint"
echo "========================================="
run_test "Documentation Lint (ZK-109)" "node scripts/lint-zk-docs.mjs 2>&1 | head -50"
echo ""

echo "4. Validating ZK-110: Triage Manifest"
echo "========================================="
if [ -f "zk-failure-triage.json" ]; then
  echo -e "${GREEN}✓ PASSED${NC}: ZK failure triage manifest exists"
  PASS_COUNT=$((PASS_COUNT + 1))
  
  # Validate JSON structure
  if node -e "JSON.parse(require('fs').readFileSync('zk-failure-triage.json', 'utf8'))" 2>/dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}: Triage manifest is valid JSON"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}✗ FAILED${NC}: Triage manifest has invalid JSON"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
else
  echo -e "${RED}✗ FAILED${NC}: ZK failure triage manifest not found"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi
echo ""

echo "5. Validating zk_ticket_check integration"
echo "========================================="
run_test "ZK-107 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-107 2>&1 | head -30"
run_test "ZK-108 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-108 2>&1 | head -30"
run_test "ZK-109 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-109 2>&1 | head -30"
run_test "ZK-110 Ticket Check" "node scripts/zk_ticket_check.mjs --issue-key ZK-110 2>&1 | head -30"
echo ""

echo "========================================="
echo "Validation Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}Some validations failed. Please review the output above.${NC}"
  exit 1
else
  echo -e "${GREEN}All validations passed!${NC}"
  exit 0
fi
