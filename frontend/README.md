# PrivacyLayer Frontend

This is the Next.js frontend for the PrivacyLayer dApp, utilizing the App Router, Tailwind CSS, TypeScript, and state management via Zustand and React Query.

## Project Structure

```
frontend/
├── app/              # Next.js App Router (pages: deposit, withdraw, history)
├── components/       # React components
│   ├── ui/           # Reusable shadcn/ui components
│   ├── layout/       # Layout components
│   └── features/     # Feature-specific components
├── lib/              # Utilities and SDK integrations
└── public/           # Static assets
```

## Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env.local` file in the root of the `frontend` directory for environment variables:
```bash
NEXT_PUBLIC_NETWORK=testnet # or public
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 4. Build for Production
```bash
npm run build
```

## Technologies Used
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- Tanstack React Query
- @stellar/freighter-api
