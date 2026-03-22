"use client";

import { WithdrawForm } from "@/components/features/withdraw-form";

export default function WithdrawPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Private Withdrawal</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Withdraw funds using your deposit note. A Groth16 zero-knowledge proof
          ensures complete privacy — no on-chain link to your deposit.
        </p>
      </div>

      <WithdrawForm />

      <div className="max-w-lg mx-auto space-y-4 text-center">
        <h3 className="text-sm font-semibold text-muted-foreground">
          How Withdrawals Work
        </h3>
        <div className="grid gap-3 text-xs text-muted-foreground">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">1.</span> Your note is
            parsed to extract the nullifier and secret.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">2.</span> The local
            Merkle tree is synced from on-chain deposit events.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">3.</span> A Groth16 ZK
            proof is generated locally via the Noir WASM prover, proving you know
            a valid commitment in the tree.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">4.</span> The proof is
            verified on-chain using native{" "}
            <code className="text-privacy-300">bn254_pairing</code> — funds are
            sent to the recipient with zero link to the deposit.
          </div>
        </div>
      </div>
    </div>
  );
}
