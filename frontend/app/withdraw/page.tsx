export default function WithdrawPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-bold">Withdraw</h1>
      <p className="mt-2 text-gray-400">
        Withdraw from the shielded pool using a ZK proof.
      </p>
      <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <p className="text-sm text-gray-500">
          Withdraw form will be implemented with ZK proof generation and
          Soroban contract interaction.
        </p>
      </div>
    </div>
  );
}
