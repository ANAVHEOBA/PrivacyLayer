'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function WithdrawPage() {
  const [note, setNote] = useState('')
  const [recipient, setRecipient] = useState('')
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
            <Link href="/deposit" className="hover:text-primary transition-colors">
              Deposit
            </Link>
            <Link href="/withdraw" className="text-primary font-semibold">
              Withdraw
            </Link>
            <Link href="/history" className="hover:text-primary transition-colors">
              History
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Withdraw</h1>
        <p className="text-gray-400 mb-8">
          Use your secret note to withdraw funds to any Stellar address.
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
        </div>

        {/* Secret Note Input */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="font-semibold mb-4">Secret Note</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Paste your secret note here..."
            className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>

        {/* Recipient Address */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="font-semibold mb-4">Recipient Address</h2>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="G..."
            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
          <p className="text-sm text-gray-400 mt-2">
            The address where you want to receive the withdrawn funds.
          </p>
        </div>

        {/* Withdraw Action */}
        <button 
          disabled={!isConnected || !note || !recipient}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-colors ${
            isConnected && note && recipient
              ? 'bg-primary hover:bg-primary/80'
              : 'bg-gray-700 cursor-not-allowed'
          }`}
        >
          {isConnected && note && recipient ? 'Generate ZK Proof & Withdraw' : 'Complete all fields'}
        </button>

        {/* Info */}
        <div className="mt-8 p-4 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-primary text-sm">
            💡 Your withdrawal will be processed with a zero-knowledge proof, 
            ensuring no link between your deposit and this withdrawal.
          </p>
        </div>
      </div>
    </main>
  )
}