# PrivacyLayer Frontend - Freighter Wallet Integration

> Wallet integration module for PrivacyLayer — ZK-proof shielded pool on Stellar Soroban

## Overview

This module provides a complete Freighter wallet integration for the PrivacyLayer frontend:

- **Wallet Connection** — Connect/disconnect Freighter wallet
- **Public Key Management** — Get and display Stellar public keys
- **Network Switching** — Switch between Testnet, Mainnet, and Futurenet
- **Transaction Signing** — Sign Soroban transactions with Freighter
- **State Persistence** — Zustand store with localStorage persistence
- **Error Handling** — Comprehensive error handling for all wallet operations

## Project Structure

```
frontend/
├── lib/
│   ├── wallet.ts      # Core Freighter wallet integration
│   └── store.ts       # Zustand state management
├── components/wallet/
│   ├── ConnectButton.tsx    # Connect/disconnect button
│   ├── WalletInfo.tsx       # Display wallet info
│   ├── NetworkSelector.tsx  # Network switcher dropdown
│   └── InstallPrompt.tsx    # Freighter install prompt
├── src/
│   ├── main.tsx       # React entry point
│   ├── App.tsx        # Demo application
│   └── styles/index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:3000

## Usage

### Connect Wallet

```typescript
import { connectWallet } from "./lib/wallet";

try {
  const publicKey = await connectWallet();
  console.log("Connected:", publicKey);
} catch (error) {
  if (error.code === "NOT_INSTALLED") {
    // Show install prompt
  }
}
```

### Sign Transaction

```typescript
import { signTransactionWithWallet } from "./lib/wallet";

const signedTx = await signTransactionWithWallet(transactionXDR, "TESTNET");
```

### Switch Network

```typescript
import { switchWalletNetwork } from "./lib/wallet";

await switchWalletNetwork("MAINNET");
```

## Components

### `<ConnectButton />`
Button that handles connect/disconnect flow with loading and error states.

### `<WalletInfo />`
Displays connected wallet's public key, network, and copy-to-clipboard.

### `<NetworkSelector />`
Dropdown for switching between Stellar networks (Testnet/Mainnet/Futurenet).

### `<InstallPrompt />`
Shown when Freighter is not detected, with install link and supported browsers.

## Error Codes

| Code | Description |
|------|-------------|
| `NOT_INSTALLED` | Freighter wallet not installed |
| `USER_REJECTED` | User rejected the wallet request |
| `NETWORK_MISMATCH` | Wallet network doesn't match expected |
| `SIGNATURE_FAILED` | Transaction signing failed |
| `NOT_CONNECTED` | Wallet not connected |
| `UNKNOWN` | Unknown error occurred |

## Tech Stack

- **React 18** — UI framework
- **Vite** — Build tool
- **TypeScript** — Type safety
- **Zustand** — State management
- **Tailwind CSS** — Styling
- **@stellar/freighter-api** — Freighter wallet API

## SEO Implementation

This frontend implements comprehensive SEO optimizations as part of the PrivacyLayer bounty program:

### Meta Tags
- Primary meta tags (title, description, keywords, author, robots)
- Open Graph tags for social sharing (Facebook, LinkedIn)
- Twitter Card tags for Twitter sharing
- Canonical URL for preventing duplicate content issues

### Structured Data (JSON-LD)
- **Organization** — Brand identity and social links
- **WebApplication** — App metadata for search engines
- **BreadcrumbList** — Navigation path for better indexing
- **FAQPage** — Common questions about PrivacyLayer

### Technical SEO
- **robots.txt** — Crawler instructions (`public/robots.txt`)
- **sitemap.xml** — XML sitemap for search engine indexing (`public/sitemap.xml`)
- **Custom favicon** — Branded SVG favicon (`public/favicon.svg`)

### Performance
- ES modules for better caching (vendor chunking)
- Optimized dependencies pre-bundled
- Semantic HTML with proper heading hierarchy (h1 → h2 → h3)
- Accessible SVG icons with ARIA labels

### Lighthouse Scores (Expected)
- SEO: 90+
- Accessibility: 90+
- Best Practices: 90+
- Performance: 85+
