'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const denominations = [
  { value: '100', label: '100 XLM' },
  { value: '500', label: '500 XLM' },
  { value: '1000', label: '1,000 XLM' },
  { value: '5000', label: '5,000 XLM' },
];

const assets = [
  { symbol: 'XLM', name: 'Stellar Lumens', icon: '☆' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$' },
];

export default function DepositPage() {
  const [selectedAsset, setSelectedAsset] = useState('XLM');
  const [selectedDenom, setSelectedDenom] = useState('100');
  const [isDepositing, setIsDepositing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const handleDeposit = async () => {
    setIsDepositing(true);
    // Simulate deposit process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setNote('privacylayer-v1:0xabc123...def456:nullifier:secret');
    setIsDepositing(false);
  };

  const copyNote = async () => {
    if (note) {
      await navigator.clipboard.writeText(note);
      alert('Note copied to clipboard!');
    }
  };

  return (
    <div className="container px-4 py-12 mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Deposit</h1>
        <p className="text-muted-foreground mt-2">
          Deposit funds into the shielded pool to enable private transactions.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Asset Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Select Asset</label>
          <div className="grid grid-cols-2 gap-3">
            {assets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setSelectedAsset(asset.symbol)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border transition-all',
                  selectedAsset === asset.symbol
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 ring-2 ring-teal-200 dark:ring-teal-800'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                <span className="text-2xl">{asset.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{asset.symbol}</div>
                  <div className="text-sm text-muted-foreground">{asset.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Denomination Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">Select Amount</label>
          <div className="grid grid-cols-2 gap-3">
            {denominations.map((denom) => (
              <button
                key={denom.value}
                onClick={() => setSelectedDenom(denom.value)}
                className={cn(
                  'p-3 rounded-lg border transition-all text-center',
                  selectedDenom === denom.value
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 ring-2 ring-teal-200 dark:ring-teal-800'
                    : 'border-border hover:border-muted-foreground/50'
                )}
              >
                {denom.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Or Enter Custom Amount</label>
          <div className="relative">
            <input
              type="number"
              placeholder="Enter amount"
              className="input pr-16"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {selectedAsset}
            </span>
          </div>
        </div>

        {/* Deposit Button */}
        {!note && (
          <button
            onClick={handleDeposit}
            disabled={isDepositing}
            className={cn(
              'btn btn-primary w-full py-6 text-lg',
              isDepositing && 'opacity-70 cursor-wait'
            )}
          >
            {isDepositing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                Processing Deposit...
              </>
            ) : (
              `Deposit ${selectedDenom} ${selectedAsset}`
            )}
          </button>
        )}

        {/* Generated Note */}
        {note && (
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-green-700 dark:text-green-400">Deposit Successful!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Save your private note securely. You&apos;ll need it to withdraw your funds.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">Your Private Note</label>
              <div className="flex gap-2">
                <code className="flex-1 p-3 rounded bg-muted font-mono text-xs break-all">
                  {note}
                </code>
                <button
                  onClick={copyNote}
                  className="btn btn-secondary px-3"
                  title="Copy to clipboard"
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
                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Store this note securely. If you lose it, you won&apos;t be able to withdraw your funds.
            </p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <svg
            className="h-4 w-4 text-teal-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          How it works
        </h3>
        <p className="text-sm text-muted-foreground">
          When you deposit, we generate a commitment using Poseidon hash. 
          Your note contains the nullifier and secret needed to create a ZK proof 
          for withdrawal. The on-chain Merkle tree stores only the commitment — 
          not your identity.
        </p>
      </div>
    </div>
  );
}