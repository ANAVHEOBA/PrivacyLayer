export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20 text-center">
      <h1 className="text-5xl font-bold tracking-tight">
        Private transactions on{" "}
        <span className="text-stellar">Stellar</span>
      </h1>
      <p className="max-w-2xl text-lg text-gray-400">
        Deposit XLM or USDC into a shielded pool, then withdraw to any address
        using a zero-knowledge proof — with no on-chain link between deposit
        and withdrawal.
      </p>
      <div className="flex gap-4">
        <a
          href="/deposit"
          className="rounded-lg bg-primary-600 px-6 py-3 font-medium transition-colors hover:bg-primary-700"
        >
          Deposit
        </a>
        <a
          href="/withdraw"
          className="rounded-lg border border-gray-700 px-6 py-3 font-medium transition-colors hover:border-gray-500"
        >
          Withdraw
        </a>
      </div>
    </div>
  );
}
