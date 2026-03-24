# PrivacyLayer Hackathon Starter Kit

> Everything you need to build privacy-preserving applications on Stellar in 24 hours

**Issue Reference:** #98  
**Word Count:** ~2,800 words

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start-5-minutes)
2. [What is PrivacyLayer?](#what-is-privacylayer)
3. [Hackathon Project Ideas](#hackathon-project-ideas)
4. [Boilerplate Code](#boilerplate-code)
5. [Example Projects](#example-projects)
6. [Judging Criteria](#judging-criteria)
7. [Prize Ideas](#prize-ideas)
8. [Resources & Support](#resources--support)
9. [Submission Checklist](#submission-checklist)

---

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ or Python 3.9+
- A Stellar testnet account (free)
- Basic knowledge of JavaScript/Python

### Installation

```bash
# Clone the starter template
git clone https://github.com/ANAVHEOBA/PrivacyLayer.git
cd PrivacyLayer

# Install dependencies
npm install
# or
pip install -r requirements.txt

# Configure testnet
cp .env.example .env
# Edit .env with your testnet credentials
```

### Your First Privacy-Preserving Transaction

```javascript
import { PrivacyLayer } from '@privacylayer/sdk';

// Initialize with testnet
const pl = new PrivacyLayer({
  network: 'testnet',
  horizonUrl: 'https://horizon-testnet.stellar.org'
});

// Create a shielded transaction
const transaction = await pl.createShieldedTransfer({
  asset: 'USDC',
  amount: '100',
  recipient: 'G...',
  memo: 'Encrypted payment'
});

console.log('Transaction hash:', transaction.hash);
```

---

## What is PrivacyLayer?

PrivacyLayer is a privacy protocol built on Stellar that enables:

- **Zero-Knowledge Proofs**: Verify without revealing
- **Shielded Transactions**: Hide sender, receiver, and amount
- **Selective Disclosure**: Prove compliance without exposing data
- **Regulatory Compliance**: Privacy that satisfies regulations

### Why Build on PrivacyLayer?

| Feature | Traditional Blockchain | PrivacyLayer |
|---------|----------------------|--------------|
| Transaction Privacy | ❌ Public | ✅ Shielded |
| Auditability | ❌ All or nothing | ✅ Selective |
| Compliance | ❌ Difficult | ✅ Built-in |
| Developer Experience | ❌ Complex | ✅ Simple SDK |

---

## Hackathon Project Ideas

### Beginner (4-8 hours)

#### 1. Private Donation Platform
Build a donation platform where donors can contribute without revealing their identity or donation amount publicly.

**Key Features:**
- Shielded donation transactions
- Public donation totals (without individual breakdowns)
- Anonymous donor badges

**Skills:** Basic JavaScript, Stellar SDK

#### 2. Confidential Voting System
Create a voting system where votes are private but results are verifiable.

**Key Features:**
- Anonymous vote casting
- Public vote tallying
- Proof of participation (without revealing choice)

**Skills:** Zero-knowledge basics, React/Vue

#### 3. Private Invoice System
Build an invoicing tool where payment amounts are hidden from public view.

**Key Features:**
- Encrypted invoice creation
- Shielded payment processing
- Private payment confirmation

**Skills:** Node.js, basic cryptography

### Intermediate (8-16 hours)

#### 4. Privacy-Preserving Payroll
A payroll system that pays employees privately while maintaining audit trails.

**Key Features:**
- Bulk shielded payments
- Compliance reporting (selective disclosure)
- Employee payment history (private)

**Skills:** Database design, API development

#### 5. Anonymous Marketplace
A marketplace where buyers and sellers transact privately.

**Key Features:**
- Shielded escrow
- Private ratings system
- Anonymous dispute resolution

**Skills:** Smart contracts, state management

#### 6. Confidential Subscription Service
Subscription payments without revealing subscriber count or revenue.

**Key Features:**
- Recurring shielded payments
- Private subscriber analytics
- Public growth indicators

**Skills:** Cron jobs, payment processing

### Advanced (16-24 hours)

#### 7. Zero-Knowledge Identity Verification
Prove identity attributes without revealing the underlying data.

**Key Features:**
- Age verification without DOB
- KYC compliance without data exposure
- Credential revocation

**Skills:** ZK-SNARKs, identity protocols

#### 8. Private DeFi Lending
A lending platform with hidden loan amounts and collateral.

**Key Features:**
- Shielded collateral deposits
- Private loan terms
- Anonymous liquidation protection

**Skills:** DeFi protocols, risk management

#### 9. Cross-Chain Privacy Bridge
Move assets between chains privately using PrivacyLayer.

**Key Features:**
- Cross-chain shielded transfers
- Privacy preservation across networks
- Atomic swaps

**Skills:** Multi-chain development, bridges

---

## Boilerplate Code

### React + PrivacyLayer Starter

```jsx
// components/PrivacyProvider.jsx
import { createContext, useContext, useState } from 'react';
import { PrivacyLayer } from '@privacylayer/sdk';

const PrivacyContext = createContext(null);

export function PrivacyProvider({ children }) {
  const [pl, setPl] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = async (secretKey) => {
    const instance = new PrivacyLayer({
      network: 'testnet',
      secretKey
    });
    setPl(instance);
    setIsConnected(true);
  };

  return (
    <PrivacyContext.Provider value={{ pl, isConnected, connect }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
```

```jsx
// components/ShieldedTransfer.jsx
import { usePrivacy } from './PrivacyProvider';
import { useState } from 'react';

export function ShieldedTransfer() {
  const { pl, isConnected } = usePrivacy();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  const handleTransfer = async () => {
    setStatus('Creating shielded transaction...');
    try {
      const tx = await pl.createShieldedTransfer({
        recipient,
        amount,
        asset: 'USDC'
      });
      setStatus(`Success! Hash: ${tx.hash}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  if (!isConnected) return <div>Connect wallet first</div>;

  return (
    <div className="transfer-form">
      <input
        placeholder="Recipient address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleTransfer}>
        Send Shielded Transfer
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
```

### Python + PrivacyLayer Starter

```python
# privacy_app.py
from privacylayer import PrivacyLayer
from flask import Flask, request, jsonify

app = Flask(__name__)
pl = PrivacyLayer(network='testnet')

@app.route('/shield', methods=['POST'])
def create_shielded_transaction():
    data = request.json
    try:
        transaction = pl.create_shielded_transfer(
            asset=data['asset'],
            amount=data['amount'],
            recipient=data['recipient']
        )
        return jsonify({
            'success': True,
            'hash': transaction.hash,
            'status': 'pending'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True)
```

---

## Example Projects

### Example 1: Private Donation Widget

A simple React component for accepting private donations:

```jsx
// DonationWidget.jsx
import { usePrivacy }