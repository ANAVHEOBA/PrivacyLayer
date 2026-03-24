# PrivacyLayer Code Examples

This directory contains code examples for integrating with PrivacyLayer.

## Contents

### JavaScript/TypeScript
- [deposit.ts](./typescript/deposit.ts) - Deposit flow example
- [withdraw.ts](./typescript/withdraw.ts) - Withdrawal flow example
- [relayer.ts](./typescript/relayer.ts) - Using the relayer service

### Python
- [deposit.py](./python/deposit.py) - Deposit flow example
- [withdraw.py](./python/withdraw.py) - Withdrawal flow example

### cURL
- [api_calls.sh](./curl/api_calls.sh) - Basic API calls

## Quick Start

### TypeScript

```bash
cd typescript
npm install
npm run deposit
```

### Python

```bash
cd python
pip install -r requirements.txt
python deposit.py
```

## Prerequisites

1. Node.js 18+ or Python 3.9+
2. Stellar account with testnet XLM
3. Freighter wallet (for browser) or secret key (for scripts)

## Environment Setup

Create a `.env` file:

```env
# Network
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract
CONTRACT_ID=C...

# Your account
SECRET_KEY=S...

# API (optional)
API_URL=https://api-testnet.privacylayer.io
API_KEY=your_api_key
```