# PrivacyLayer Frontend

Next.js frontend for PrivacyLayer - the first ZK-proof shielded pool on Stellar Soroban.

## Features

- 🌗 **Dark Mode Support** - System preference detection, manual toggle, and localStorage persistence
- 🔐 **Wallet Integration** - Freighter wallet support for Stellar
- 🎨 **Modern UI** - Tailwind CSS with CSS variables for theming
- ⚡ **Performance** - Next.js 14 with App Router

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Dark Mode

The dark mode implementation includes:

- **System preference detection** - Automatically matches your OS theme
- **Manual toggle** - Click the sun/moon icon in the header
- **Keyboard shortcut** - Press `Ctrl+K` (or `Cmd+K` on Mac) to toggle
- **Persistence** - Your preference is saved in localStorage
- **No flash** - Script injection prevents flash of unstyled content

## Tech Stack

- [Next.js 14](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [next-themes](https://github.com/pacocoursey/next-themes) - Theme management
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk) - Stellar integration
- [Freighter](https://www.freighter.app/) - Wallet connection