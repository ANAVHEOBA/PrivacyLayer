export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Transaction History</h1>
      <p className="mt-2 text-gray-400">
        View your shielded pool transactions.
      </p>
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <p className="text-sm text-gray-500">
          Transaction history will be implemented with local note tracking and
          on-chain event indexing.
        </p>
      </div>
    </div>
  );
}
