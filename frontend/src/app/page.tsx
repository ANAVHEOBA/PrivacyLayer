import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center p-8 md:p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-4 bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
          PrivacyLayer
        </h1>
        <p className="text-center text-lg md:text-xl mb-12 text-gray-600 dark:text-gray-400">
          A privacy-preserving pool on Stellar using zero-knowledge proofs
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/deposit"
            className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-6 transition-all duration-200 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg"
          >
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 dark:text-white">
              Deposit 💰
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Deposit funds into the privacy pool with zero-knowledge proofs
            </p>
          </Link>

          <Link
            href="/withdraw"
            className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-6 transition-all duration-200 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg"
          >
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 dark:text-white">
              Withdraw 🔒
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Withdraw funds from the pool privately to any address
            </p>
          </Link>

          <Link
            href="/history"
            className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-6 transition-all duration-200 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-lg"
          >
            <h2 className="mb-3 text-2xl font-semibold text-gray-900 dark:text-white">
              History 📊
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              View your deposit and withdrawal history
            </p>
          </Link>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by Stellar • Zero-Knowledge Proofs • Noir Circuits
          </p>
        </div>
      </div>
    </main>
  )
}