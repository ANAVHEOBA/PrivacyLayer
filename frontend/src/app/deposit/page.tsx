'use client'

import { useState } from 'react'
import Link from 'next/link'

const DENOMINATIONS = [
  { value: 10, label: '10 XLM' },
  { value: 100, label: '100 XLM' },
  { value: 1000, label: '1,000 XLM' },
  { value: 10000, label: '10,000 XLM' },
]

export default function DepositPage() {
  const [selectedDenom, setSelectedDenom] = useState<number>(100)
  const [isConnected, setIsConnected] = useState(false)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-stellar rounded-lg" />
            <span className="text-xl font-bold">PrivacyLayer</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/deposit" className="text-primary font-semibold">
              Deposit
            </Link>
            <Link href="/withdraw" className="hover:text-primary transition-colors">
              Withdraw
            </Link>
            <Link href="/history" className="hover:text-primary transition-colors">
              History
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Deposit</h1>
        <p className="text-gray-400 mb-8">
          Deposit XLM into the privacy pool. You'll receive a secret note that you can use to withdraw later.
        </p>

        {/* Wallet Connection */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Wallet</h2>
            <button 
              onClick={() => setIsConnected(!isConnected)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isConnected 
                  ? 'bg-stellar/20 text-stellar' 
                  : 'bg-primary hover:bg-primary/80'
              }`}
            >
              {isConnected ? 'Connected' : 'Connect Freighter'}
            </button>
          </div>
          {isConnected && (
            <p className="text-sm text-gray-400">
              Connected to: GXXX...XXXX
            </p>
          )}
        </div>

        {/* Denomination Selection */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="font-semibold mb-4">Select Amount</h2>
          <div className="grid grid-cols-2 gap-4">
            {DENOMINATIONS.map((denom) => (
              <button
                key={denom.value}
                onClick={() => setSelectedDenom(denom.value)}
                className={`p-4 rounded-lg border transition-colors ${
                  selectedDenom === denom.value
                    ? 'border-primary bg-primary/20'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <span className="font-semibold">{denom.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Deposit Action */}
        <button 
          disabled={!isConnected}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
            isConnected
              ? 'bg-primary hover:bg-primary/80'
              : 'bg-gray-700 cursor-not-allowed'
          }`}
        >
          {isConnected ? `Deposit ${selectedDenom} XLM` : 'Connect wallet first'}
        </button>

        {/* Warning */}
        <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ <strong>Important:</strong> Save your secret note securely. 
            If you lose it, you won't be able to withdraw your funds.
          </p>
        </div>
      </div>
    </main>
  )
}