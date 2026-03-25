'use client'

export default function HistoryPage() {
  // TODO: Implement transaction history with SDK
  const transactions: any[] = []

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Transaction History</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
              <p className="text-sm mt-2 text-gray-400 dark:text-gray-500">
                Your deposit and withdrawal history will appear here
              </p>
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