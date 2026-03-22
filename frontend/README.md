# PrivacyLayer Frontend

Next.js frontend for the PrivacyLayer shielded pool on Stellar Soroban.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Stellar wallet (e.g., [Freighter](https://freighter.app/))

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your contract address and RPC URL
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

## Project Structure

```
frontend/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx       # Root layout with nav
│   ├── page.tsx         # Home / landing page
│   ├── deposit/         # Deposit into shielded pool
│   ├── withdraw/        # Withdraw with ZK proof
│   └── history/         # Transaction history
├── components/
│   ├── ui/              # Reusable UI components
│   ├── layout/          # Layout components (navbar, etc.)
│   └── features/        # Feature-specific components
├── lib/
│   ├── sdk.ts           # PrivacyLayer SDK integration
│   └── utils.ts         # Utility functions
├── public/              # Static assets
├── styles/
│   └── globals.css      # Global styles + Tailwind
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.mjs
```

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query** for data fetching
- **@stellar/freighter-api** for wallet connection
- **shadcn/ui** pattern for UI components

## Scripts

| Command         | Description               |
| --------------- | ------------------------- |
| `npm run dev`   | Start dev server          |
| `npm run build` | Production build          |
| `npm start`     | Start production server   |
| `npm run lint`  | Run ESLint                |
| `npm run format`| Format with Prettier      |
