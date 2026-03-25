'use client'

import { useState } from 'react'

const DENOMINATIONS = [
  { value: 1, label: '1 XLM' },
  { value: 10, label: '10 XLM' },
  { value: 100, label: '100 XLM' },
  { value: 1000, label: '1000 XLM' },
]

export default function DepositPage() {
  const [selectedDenomination, setSelectedDenomination] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDeposit = async () => {
    if (!selectedDenomination) return
    setIsLoading(true)
    try {
      console.log('Depositing:', selectedDenomination)
      alert('Deposit functionality will be implemented with SDK integration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Deposit</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Denomination</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {DENOMINATIONS.map((denom) => (
              <button
                key={denom.value}
                onClick={() => setSelectedDenomination(denom.value)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 font-medium
                  ${selectedDenomination === denom.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
              >
                {denom.label}
              </button>
            ))}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Important:</strong> After deposit, you will receive a note. 
              Save this note securely - it is required to withdraw your funds!
            </p>
          </div>

          <button
            onClick={handleDeposit}
            disabled={!selectedDenomination || isLoading}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-semibold
                       hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
          >
            {isLoading ? 'Processing...' : 'Deposit'}
          </button>
        </div>
      </div>
    </div>
  )
}