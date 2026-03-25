'use client'

export default function HistoryPage() {
  // TODO: Implement transaction history with SDK
  const transactions = [
    // Mock data for now
  ]

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Transaction History</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No transactions yet</p>
              <p className="text-sm mt-2">Your deposit and withdrawal history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Transaction list will be rendered here */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}