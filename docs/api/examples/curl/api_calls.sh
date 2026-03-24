#!/bin/bash

# PrivacyLayer API Examples using cURL
# 
# This script demonstrates basic API calls to the PrivacyLayer API.
# 
# Usage:
#   chmod +x api_calls.sh
#   ./api_calls.sh

# Configuration
API_URL="${API_URL:-https://api-testnet.privacylayer.io}"
API_KEY="${API_KEY:-your_api_key_here}"

echo "=== PrivacyLayer API Examples ==="
echo "API URL: $API_URL"
echo ""

# 1. Health Check
echo "1. Health Check"
echo "GET /v1/health"
curl -s "$API_URL/v1/health" | jq .
echo ""
echo "---"
echo ""

# 2. Get Pool Info
echo "2. Get Pool Info"
echo "GET /v1/pool/info"
curl -s "$API_URL/v1/pool/info" | jq .
echo ""
echo "---"
echo ""

# 3. Get Denominations
echo "3. Get Supported Denominations"
echo "GET /v1/pool/denominations"
curl -s "$API_URL/v1/pool/denominations" | jq .
echo ""
echo "---"
echo ""

# 4. Get Merkle Root
echo "4. Get Current Merkle Root"
echo "GET /v1/merkle/root"
curl -s "$API_URL/v1/merkle/root" | jq .
echo ""
echo "---"
echo ""

# 5. Prepare Deposit
echo "5. Prepare Deposit"
echo "POST /v1/deposit/prepare"
curl -s -X POST "$API_URL/v1/deposit/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "nullifier": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    "secret": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba09876543"
  }' | jq .
echo ""
echo "---"
echo ""

# 6. Estimate Deposit Cost
echo "6. Estimate Deposit Cost"
echo "POST /v1/deposit/estimate"
curl -s -X POST "$API_URL/v1/deposit/estimate" \
  -H "Content-Type: application/json" \
  -d '{"asset": "XLM"}' | jq .
echo ""
echo "---"
echo ""

# 7. Get Deposit Events
echo "7. Get Recent Deposit Events"
echo "GET /v1/events/deposits"
curl -s "$API_URL/v1/events/deposits?skip=0&take=5" | jq .
echo ""
echo "---"
echo ""

# 8. Get Withdrawal Events
echo "8. Get Recent Withdrawal Events"
echo "GET /v1/events/withdrawals"
curl -s "$API_URL/v1/events/withdrawals?skip=0&take=5" | jq .
echo ""
echo "---"
echo ""

# 9. Get Merkle Proof
echo "9. Get Merkle Proof for Commitment"
echo "GET /v1/merkle/proof/:commitment"
COMMITMENT="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
curl -s "$API_URL/v1/merkle/proof/$COMMITMENT" | jq .
echo ""
echo "---"
echo ""

# 10. Generate ZK Proof
echo "10. Generate ZK Proof"
echo "POST /v1/proof/generate"
curl -s -X POST "$API_URL/v1/proof/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "nullifier": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab",
    "secret": "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba09876543",
    "merkleProof": {
      "root": "0x...",
      "leaf": "0x...",
      "pathElements": ["0x...", "0x..."],
      "pathIndices": [0, 1, 0]
    },
    "recipient": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "fee": "10000000"
  }' | jq .
echo ""
echo "---"
echo ""

# 11. Prepare Withdrawal
echo "11. Prepare Withdrawal"
echo "POST /v1/withdraw/prepare"
curl -s -X POST "$API_URL/v1/withdraw/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "0x...",
    "recipient": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "fee": "10000000"
  }' | jq .
echo ""
echo "---"
echo ""

# 12. Relayer Submit (requires API key)
echo "12. Submit via Relayer (requires API key)"
echo "POST /v1/relayer/submit"
curl -s -X POST "$API_URL/v1/relayer/submit" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "proof": {
      "pi_a": ["0x...", "0x..."],
      "pi_b": [["0x...", "0x..."], ["0x...", "0x..."]],
      "pi_c": ["0x...", "0x..."]
    },
    "nullifierHash": "0x...",
    "recipient": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "fee": "10000000"
  }' | jq .
echo ""
echo "---"
echo ""

# 13. Check Relayer Status
echo "13. Check Relayed Transaction Status"
echo "GET /v1/relayer/status/:txHash"
TX_HASH="abc123..."
curl -s "$API_URL/v1/relayer/status/$TX_HASH" | jq .
echo ""
echo "---"
echo ""

echo "=== Examples Complete ==="
echo ""
echo "For more information, see:"
echo "- OpenAPI spec: docs/api/openapi.yaml"
echo "- Contract ABI: docs/api/CONTRACT_ABI.md"
echo "- Code examples: docs/api/examples/"