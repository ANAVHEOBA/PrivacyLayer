# Quick Start Guide

> Get your first private transaction working in 10 minutes.

## Prerequisites

- Node.js 18+ installed
- Basic JavaScript/React knowledge
- A Stellar testnet account (we'll create one)

## Step 1: Clone and Setup

```bash
# Clone this starter kit
git clone https://github.com/your-team/privacylayer-hackathon.git
cd privacylayer-hackathon

# Install dependencies
npm install
```

## Step 2: Create Stellar Testnet Account

```bash
# Generate a new keypair
npm run generate-keypair

# Output will look like:
# Public Key: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Secret Key: SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Save these! You'll need them for `.env`.

## Step 3: Fund Your Account

```bash
# Request test XLM from Friendbot
npm run fund-account GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Check your balance
npm run balance GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

You should now have 10,