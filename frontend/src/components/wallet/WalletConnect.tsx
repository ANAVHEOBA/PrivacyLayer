'use client';

import { useState } from 'react';
import { cn, truncateAddress } from '@/lib/utils';

// Mock wallet state - would integrate with Freighter in production
interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
}

export function WalletConnect({ className }: { className?: string }) {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: null,
  });
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    
    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // In production, this would use @stellar/freighter-api
    setWallet({
      connected: true,
      address: 'GCKFBEIWKVQXVKYQUXQYUNBQXAHTQXA5AHKQYJNQYQZJQYQZJQYQ',
      balance: '1,234.56',
    });
    
    setLoading(false);
  };

  const handleDisconnect = () => {
    setWallet({
      connected: false,
      address: null,
      balance: null,
    });
  };

  if (loading) {
    return (
      <button
        className={cn(
          'btn btn-primary gap-2 opacity-70 cursor-wait',
          className
        )}
        disabled
      >
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Connecting...
      </button>
    );
  }

  if (!wallet.connected) {
    return (
      <button
        onClick={handleConnect}
        className={cn('btn btn-primary gap-2', className)}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
          />
        </svg>
        Connect Wallet
      </button>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Balance */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-sm">
        <span className="text-muted-foreground">Balance:</span>
        <span className="font-medium">{wallet.balance} XLM</span>
      </div>
      
      {/* Address + Disconnect */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-muted-foreground hidden sm:inline">
          {truncateAddress(wallet.address || '', 4)}
        </span>
        <button
          onClick={handleDisconnect}
          className="btn btn-secondary text-sm py-1.5"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}