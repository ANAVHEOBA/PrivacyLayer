'use client'

import Link from 'next/link'

// Mock data for demonstration
const MOCK_TRANSACTIONS = [
  {
    id: '1',
    type: 'deposit',
    amount: 100,
    status: 'confirmed',
    timestamp: '2024-03-27 10:30',
    hash: 'abc123...def456',
  },
  {
    id: '2',
    type: 'withdraw',
    amount: 100,
    status: 'confirmed',
    timestamp: '2024-03-27 12:45',
    hash: 'ghi789...jkl012',
  },
]

export default function HistoryPage() {
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
            <Link href="/withdraw" className="hover:text-primary transition-colors">
              Withdraw
            </Link>
            <Link href="/history" className="text-primary font-semibold">
              History
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
        <p className="text-gray-400 mb-8">
          View your deposit and withdrawal history.
        </p>

        {/* Transaction List */}
        <div className="space-y-4">
          {MOCK_TRANSACTIONS.map((tx) => (
            <div 
              key={tx.id}
              className="bg-white/5 rounded-xl border border-white/10 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-green-500/20' : 'bg-blue-500/20'
                  }`}>
                    {tx.type === 'deposit' ? (
                      <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold capitalize">{tx.type}</h3>
                    <p className="text-sm text-gray-400">{tx.timestamp}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{tx.amount} XLM</p>
                  <p className={`text-sm ${
                    tx.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                <span className="text-gray-500">Hash: </span>
                <code className="bg-white/5 px-2 py-1 rounded">{tx.hash}</code>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {MOCK_TRANSACTIONS.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No transactions yet</p>
            <Link 
              href="/deposit" 
              className="inline-block mt-4 px-6 py-2 bg-primary hover:bg-primary/80 rounded-lg font-medium transition-colors"
            >
              Make your first deposit
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}