# PrivacyLayer Frontend

A Next.js frontend for the PrivacyLayer privacy pool dApp on Stellar.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Wallet**: Freighter Wallet Integration

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Freighter Wallet browser extension

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Home page
│   │   ├── deposit/      # Deposit flow
│   │   ├── withdraw/     # Withdrawal flow
│   │   └── history/      # Transaction history
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── layout/       # Layout components
│   │   └── features/     # Feature-specific components
│   └── lib/
│       ├── sdk.ts        # SDK integration
│       └── utils.ts      # Utility functions
├── public/               # Static assets
├── tailwind.config.js    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── next.config.js        # Next.js configuration
```

## Features

- **Deposit**: Deposit XLM into the privacy pool with zero-knowledge proofs
- **Withdraw**: Withdraw funds privately to any Stellar address
- **History**: View your transaction history

## Environment Variables

Create a `.env.local` file with:

```
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ID=your_contract_id
```

## License

MIT