import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          PrivacyLayer
        </h1>
        <p className="text-center text-lg mb-12 text-gray-600 dark:text-gray-400">
          A privacy-preserving pool on Stellar using zero-knowledge proofs
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/deposit"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Deposit 💰
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Deposit funds into the privacy pool
            </p>
          </Link>

          <Link
            href="/withdraw"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Withdraw 🔒
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Withdraw funds from the pool privately
            </p>
          </Link>

          <Link
            href="/history"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              History 📊
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              View your transaction history
            </p>
          </Link>
        </div>
      </div>
    </main>
  )
}