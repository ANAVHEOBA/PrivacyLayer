# Node.js CLI Integration

Command-line tool for PrivacyLayer privacy pool operations.

## Setup

```bash
npm install
```

## Usage

```bash
# Deposit SOL into the privacy pool
npx ts-node cli.ts deposit --amount 1.5

# List your notes (private claims on deposited funds)
npx ts-node cli.ts notes

# Check shielded balance
npx ts-node cli.ts balance

# Withdraw to a new address using a ZK proof
npx ts-node cli.ts withdraw --note notes/note_abc123.json --to <recipient_wallet>
```

## How It Works

1. **Deposit** creates a secret note file and submits a commitment on-chain
2. **Notes** are stored locally — keep them safe, they're your claim on the funds
3. **Withdraw** generates a ZK proof and sends funds to any address without linking to the deposit
