'use client'

import { useState } from 'react'

export default function WithdrawPage() {
  const [note, setNote] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleWithdraw = async () => {
    if (!note || !recipientAddress) return
    setIsLoading(true)
    try {
      console.log('Withdrawing to:', recipientAddress)
      alert('Withdrawal functionality will be implemented with SDK integration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Withdraw</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Your Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Paste your deposit note here..."
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg font-mono text-sm
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                         transition-colors duration-200"
              rows={4}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Stellar address (G...)"
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg font-mono text-sm
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:border-primary-500 focus:ring-1 focus:ring-primary-500
                         transition-colors duration-200"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ℹ️ Your withdrawal will be processed privately. 
              The transaction will not be linked to your original deposit.
            </p>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={!note || !recipientAddress || isLoading}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-semibold
                       hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
          >
            {isLoading ? 'Generating Proof...' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  )
}