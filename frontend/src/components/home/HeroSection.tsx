import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-teal-100 dark:bg-teal-900 rounded-full blur-3xl opacity-30" />
      </div>

      <div className="container px-4 py-20 md:py-32 mx-auto">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Badge */}
          <div className="badge badge-primary">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 dark:bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            Live on Stellar Testnet
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-4xl">
            Private Transactions on{' '}
            <span className="text-primary">Stellar</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            The first ZK-proof shielded pool on Soroban. Deposit XLM or USDC, 
            then withdraw to any address with zero-knowledge proofs — 
            no on-chain link between deposit and withdrawal.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link
              href="/deposit"
              className="btn btn-primary px-8 py-6 text-lg"
            >
              Start Depositing
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <Link
              href="/docs"
              className="btn btn-outline px-8 py-6 text-lg"
            >
              Read Documentation
            </Link>
          </div>

          {/* Stats preview */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-border w-full max-w-2xl">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                $2.5M+
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Deposited
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                1,200+
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Private Withdrawals
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground">
                $0.01
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Avg Transaction Fee
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}