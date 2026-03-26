'use client';

import { TransactionSimulator } from '@/components/TransactionSimulator';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">PrivacyLayer</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Transaction Simulator - Preview deposits and withdrawals before execution
          </p>
        </header>

        {/* Transaction Simulator */}
        <TransactionSimulator />

        {/* Footer */}
        <footer className="text-center mt-16 text-slate-500 text-sm">
          <p>Powered by Stellar Soroban • Protocol 25 BN254 & Poseidon</p>
        </footer>
      </div>
    </main>
  );
}