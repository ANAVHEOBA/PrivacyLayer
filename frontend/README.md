# PrivacyLayer Frontend

The Next.js frontend application for the PrivacyLayer ZK shielded pool on Stellar Soroban.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom theme
- **State Management**: Zustand (persisted notes store)
- **Data Fetching**: TanStack React Query
- **Wallet**: @stellar/freighter-api
- **UI Components**: Custom components inspired by shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- [Freighter Wallet](https://freighter.app/) browser extension

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_PRIVACY_POOL_CONTRACT_ID=your_contract_id_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Lint & Format

```bash
npm run lint
npm run format
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with header/footer
│   ├── page.tsx            # Dashboard / landing page
│   ├── providers.tsx       # React Query provider
│   ├── deposit/page.tsx    # Deposit page
│   ├── withdraw/page.tsx   # Withdraw page
│   └── history/page.tsx    # Transaction history page
├── components/
│   ├── ui/                 # Reusable UI primitives
│   │   ├── badge.tsx       # Badge component
│   │   ├── button.tsx      # Button with variants & loading
│   │   ├── card.tsx        # Card layout components
│   │   ├── input.tsx       # Input with error state
│   │   ├── select.tsx      # Select dropdown
│   │   └── skeleton.tsx    # Loading skeleton
│   ├── layout/             # Layout components
│   │   ├── header.tsx      # Navigation header with wallet
│   │   └── footer.tsx      # Site footer
│   └── features/           # Feature-specific components
│       ├── deposit-form.tsx       # Multi-step deposit flow
│       ├── withdraw-form.tsx      # Multi-step withdrawal flow
│       ├── pool-stats.tsx         # Pool statistics display
│       ├── transaction-history.tsx # History & notes viewer
│       └── wallet-button.tsx      # Wallet connect/disconnect
├── lib/
│   ├── constants.ts        # App-wide constants & config
│   ├── sdk.ts              # PrivacyLayer SDK integration
│   ├── store.ts            # Zustand state stores
│   ├── utils.ts            # Utility functions
│   └── wallet.ts           # Freighter wallet integration
├── styles/
│   └── globals.css         # Tailwind + custom CSS
├── public/                 # Static assets
├── .env.example            # Environment template
├── .eslintrc.json          # ESLint config
├── .prettierrc             # Prettier config
├── next.config.mjs         # Next.js config (WASM support)
├── postcss.config.mjs      # PostCSS config
├── tailwind.config.ts      # Tailwind config with custom theme
├── tsconfig.json           # TypeScript strict config
└── package.json            # Dependencies & scripts
```

## Features

### Dashboard
- Pool statistics (status, deposit count, denomination, token)
- "How It Works" guide (deposit -> wait -> withdraw)
- Technical highlights (BN254, Poseidon, Noir, fixed denominations)

### Deposit
- Multi-step flow: Select denomination -> Confirm -> Processing -> Backup note -> Complete
- Denomination selector (10/100/1000 XLM, 100/1000 USDC)
- Cryptographic note generation (nullifier + secret -> Poseidon commitment)
- Note backup with copy-to-clipboard
- Critical warning about note storage

### Withdraw
- Note input with validation
- Custom recipient address (defaults to connected wallet)
- ZK proof generation status (Noir WASM prover)
- On-chain verification status (BN254 pairing)
- Transaction confirmation

### History
- Local deposit notes (stored in browser via Zustand persist)
- On-chain activity from contract events
- Note status tracking (available/spent)

### Wallet Integration
- Freighter wallet connection/disconnection
- Address display with truncation
- Network detection
- Transaction signing

## SDK Integration

The `lib/sdk.ts` module provides typed interfaces for the PrivacyLayer contract.
When `@privacylayer/sdk` is published, replace the placeholder implementations
with actual SDK calls:

```typescript
import { PrivacyLayerSDK } from "@privacylayer/sdk";

const sdk = new PrivacyLayerSDK({
  rpcUrl: STELLAR_RPC_URL,
  contractId: PRIVACY_POOL_CONTRACT_ID,
});

// Generate note with real Poseidon hash
const note = await sdk.generateNote();

// Submit deposit
await sdk.deposit(note.commitment, signerAddress);

// Generate ZK proof and withdraw
await sdk.withdraw(noteString, recipientAddress);
```

## Design Decisions

- **Dark theme**: Matches the privacy-focused nature of the application
- **Glass morphism**: Modern UI with backdrop blur and transparency
- **Fixed denominations**: Enforced by the contract to prevent correlation attacks
- **Local note storage**: Notes never leave the browser (Zustand persist to localStorage)
- **Multi-step forms**: Guided flow prevents user errors during critical operations
- **WASM support**: Next.js config enables async WebAssembly for ZK proof generation

## License

MIT
