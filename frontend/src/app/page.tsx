import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-stellar rounded-lg" />
            <span className="text-xl font-bold">PrivacyLayer</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/deposit" className="hover:text-primary transition-colors">
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6">
            Privacy-Preserving Transactions
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-stellar">
              on Stellar
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Deposit fixed-denomination XLM or USDC into a shielded pool, 
            then withdraw to any address using zero-knowledge proofs — 
            with no on-chain link between deposit and withdrawal.
          </p>
          <div className="flex gap-4 justify-center">
            <Link 
              href="/deposit" 
              className="px-6 py-3 bg-primary hover:bg-primary/80 rounded-lg font-semibold transition-colors"
            >
              Start Depositing
            </Link>
            <Link 
              href="/history" 
              className="px-6 py-3 border border-white/20 hover:border-primary rounded-lg font-semibold transition-colors"
            >
              View History
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Zero-Knowledge Proofs</h3>
            <p className="text-gray-400">Prove you own deposited funds without revealing your identity or transaction history.</p>
          </div>
          
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="w-12 h-12 bg-stellar/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-stellar" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Stellar Protocol 25</h3>
            <p className="text-gray-400">Built on native BN254 and Poseidon primitives in Soroban smart contracts.</p>
          </div>
          
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Compliance-Forward</h3>
            <p className="text-gray-400">Open-source, auditable code with transparent cryptographic operations.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400">
          <p>Built with Noir ZK circuits and Soroban smart contracts</p>
          <p className="mt-2 text-sm">⚠️ Unaudited - Do not use in production</p>
        </div>
      </footer>
    </main>
  )
}