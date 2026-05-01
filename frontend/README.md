# PrivacyLayer Frontend

Next.js frontend for the PrivacyLayer privacy pool dApp.

## Setup

1. Install dependencies:
   npm install

2. Copy environment variables:
   cp .env.example .env.local

3. Fill in your values in `.env.local`

4. Start dev server:
   npm run dev

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

## Stack

- Next.js 14 App Router
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui
- Zustand
- React Query
- Stellar Freighter API