# PrivacyLayer Frontend

Next.js dApp for PrivacyLayer - the first ZK-proof shielded pool on Stellar Soroban.

## Features

- 🔐 Freighter wallet integration
- 🎨 Tailwind CSS styling
- 📦 Zustand state management
- 🔧 TypeScript support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn or pnpm
- [Freighter Wallet](https://www.freighter.app/) browser extension

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/             # React components
│   └── wallet/             # Wallet-related components
│       ├── ConnectButton.tsx   # Connect/disconnect button
│       ├── WalletInfo.tsx      # Display connected wallet info
│       ├── NetworkSelector.tsx # Network switcher
│       └── InstallPrompt.tsx   # Prompt to install Freighter
├── lib/                    # Utility libraries
│   ├── wallet.ts           # Freighter wallet functions
│   └── store.ts            # Zustand state management
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Wallet Integration

### Using Wallet Functions

```typescript
import { 
  connectWallet, 
  disconnectWallet, 
  signTransactionWithWallet 
} from '@/lib/wallet';

// Connect wallet
const result = await connectWallet();
if (result.error) {
  console.error(result.error);
} else {
  console.log('Connected:', result.publicKey);
}

// Sign a transaction
const { signedTxXdr, error } = await signTransactionWithWallet(transactionXdr);
```

### Using Wallet Store

```typescript
import { useWalletStore, useWalletPublicKey } from '@/lib/store';

function MyComponent() {
  const publicKey = useWalletPublicKey();
  const connect = useWalletStore((state) => state.connect);
  const disconnect = useWalletStore((state) => state.disconnect);
  
  return (
    <div>
      {publicKey ? (
        <button onClick={disconnect}>Disconnect</button>
      ) : (
        <button onClick={connect}>Connect</button>
      )}
    </div>
  );
}
```

## Components

### ConnectButton

A button that handles wallet connection/disconnection.

```tsx
import ConnectButton from '@/components/wallet/ConnectButton';

<ConnectButton />
```

### WalletInfo

Displays connected wallet information.

```tsx
import WalletInfo from '@/components/wallet/WalletInfo';

<WalletInfo />
```

### NetworkSelector

Network selection dropdown (info only, actual network change must be done in Freighter).

```tsx
import NetworkSelector from '@/components/wallet/NetworkSelector';

<NetworkSelector />
```

### InstallPrompt

Prompts users to install Freighter if not detected.

```tsx
import InstallPrompt from '@/components/wallet/InstallPrompt';

<InstallPrompt />
```

## Environment Variables

Create a `.env.local` file for environment-specific configuration:

```env
NEXT_PUBLIC_NETWORK=TESTNET
NEXT_PUBLIC_CONTRACT_ID=your_contract_id
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Freighter API Documentation](https://github.com/stellar/freighter)
- [Stellar SDK Documentation](https://developers.stellar.org/docs)
- [Zustand Documentation](https://github.com/pmndrs/zustand)