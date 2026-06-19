# Workshop 2: Project Template

This is a complete Next.js project template for building privacy-enabled applications.

---

## Project Structure

```
private-payments/
├── app/
│   ├── page.tsx              # Home page
│   ├── deposit/
│   │   └── page.tsx          # Deposit page
│   ├── withdraw/
│   │   └── page.tsx          # Withdraw page
│   └── layout.tsx            # App layout
├── components/
│   ├── DepositForm.tsx       # Deposit component
│   ├── WithdrawForm.tsx      # Withdraw component
│   ├── BalanceDisplay.tsx    # Balance display
│   └── Navbar.tsx            # Navigation
├── lib/
│   ├── privacy.ts            # PrivacyLayer client
│   └── stellar.ts            # Stellar utilities
├── hooks/
│   ├── usePrivacyClient.ts   # Client hook
│   └── useWallet.ts          # Wallet hook
├── styles/
│   └── globals.css           # Global styles
├── .env.local                # Environment variables
├── package.json
└── README.md
```

---

## Getting Started

```bash
# Clone template
npx create-next-app -e https://github.com/PrivacyLayer/private-payments-template

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Run development server
npm run dev
```

---

## Core Files

### lib/privacy.ts
```typescript
import { PrivacyLayer, Network } from '@privacylayer/sdk';

let client: PrivacyLayer | null = null;

export async function getClient(): Promise<PrivacyLayer> {
  if (!client) {
    client = new PrivacyLayer({
      network: process.env.NEXT_PUBLIC_NETWORK as Network || 'testnet',
    });
    await client.connect();
  }
  return client;
}

export async function deposit(amount: string, asset: string = 'XLM') {
  const client = await getClient();
  return client.deposit({ amount, asset });
}

export async function withdraw(note: string, recipient: string) {
  const client = await getClient();
  return client.withdraw({ note, recipientAddress: recipient });
}

export async function getBalance(note?: string) {
  const client = await getClient();
  return client.getBalance({ note });
}
```

### hooks/usePrivacyClient.ts
```typescript
import { useState, useEffect } from 'react';
import { PrivacyLayer } from '@privacylayer/sdk';
import { getClient } from '@/lib/privacy';

export function usePrivacyClient() {
  const [client, setClient] = useState<PrivacyLayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getClient()
      .then(setClient)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { client, loading, error };
}
```

### components/DepositForm.tsx
```typescript
'use client';

import { useState } from 'react';
import { usePrivacyClient } from '@/hooks/usePrivacyClient';

export function DepositForm() {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { client } = usePrivacyClient();

  const handleDeposit = async () => {
    if (!client || !amount) return;
    
    setLoading(true);
    try {
      const result = await client.deposit({
        amount,
        asset: 'XLM'
      });
      setNote(result.note);
    } catch (err) {
      console.error(err);
      alert('Deposit failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4">Deposit</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Amount (XLM)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 bg-gray-800 rounded-lg text-white"
            placeholder="10"
          />
        </div>

        <button
          onClick={handleDeposit}
          disabled={loading || !amount}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Deposit'}
        </button>

        {note && (
          <div className="p-4 bg-yellow-900/50 rounded-lg">
            <p className="text-yellow-200 font-semibold mb-2">
              ⚠️ Save this note securely!
            </p>
            <code className="block p-2 bg-gray-800 rounded text-xs break-all">
              {note}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
```

### components/WithdrawForm.tsx
```typescript
'use client';

import { useState } from 'react';
import { usePrivacyClient } from '@/hooks/usePrivacyClient';
import { Keypair } from 'stellar-sdk';

export function WithdrawForm() {
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const { client } = usePrivacyClient();

  const generateFreshAddress = () => {
    const keypair = Keypair.random();
    setRecipient(keypair.publicKey());
    // In production, save the secret securely!
    alert(`Fresh address generated!\nPublic: ${keypair.publicKey()}\n\nSave your secret securely!`);
  };

  const handleWithdraw = async () => {
    if (!client || !note || !recipient) return;
    
    setLoading(true);
    try {
      const result = await client.withdraw({
        note,
        recipientAddress: recipient
      });
      setTxHash(result.txHash);
    } catch (err) {
      console.error(err);
      alert('Withdrawal failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-xl">
      <h2 className="text-xl font-bold mb-4">Withdraw</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Deposit Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-3 bg-gray-800 rounded-lg text-white h-24"
            placeholder="Your saved deposit note..."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Recipient Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="flex-1 p-3 bg-gray-800 rounded-lg text-white"
              placeholder="G..."
            />
            <button
              onClick={generateFreshAddress}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              Generate Fresh
            </button>
          </div>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={loading || !note || !recipient}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Withdraw'}
        </button>

        {txHash && (
          <div className="p-4 bg-green-900/50 rounded-lg">
            <p className="text-green-200 font-semibold mb-2">
              ✅ Withdrawal successful!
            </p>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              View transaction →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Security Checklist

Before deploying to production, ensure:

### Key Management
- [ ] Implement encrypted note storage
- [ ] Add hardware wallet support
- [ ] Create backup/recovery flow
- [ ] Never log or expose notes

### Operational Security
- [ ] Add random withdrawal delays
- [ ] Implement fresh address generation
- [ ] Warn users about timing attacks
- [ ] Add Tor/VPN recommendations

### Smart Contract Security
- [ ] Verify contract addresses on load
- [ ] Implement transaction simulation
- [ ] Add error handling for all edge cases
- [ ] Test with small amounts first

---

## Testing

```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

---

## Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

---

## License

MIT