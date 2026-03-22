export default function DepositPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-bold">Deposit</h1>
      <p className="mt-2 text-gray-400">
        Deposit XLM or USDC into the shielded pool.
      </p>
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <p className="text-sm text-gray-500">
          Deposit form will be implemented with @stellar/freighter-api and
          @privacylayer/sdk integration.
        </p>
      </div>
    </div>
  );
}
