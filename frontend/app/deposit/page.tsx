"use client";

import { DepositForm } from "@/components/features/deposit-form";
import { PoolStats } from "@/components/features/pool-stats";

export default function DepositPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Shielded Deposit</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Deposit a fixed denomination into the privacy pool. You will receive a
          secret note that serves as your withdrawal key.
        </p>
      </div>

      <PoolStats />
      <DepositForm />

      <div className="max-w-lg mx-auto space-y-4 text-center">
        <h3 className="text-sm font-semibold text-muted-foreground">
          How Deposits Work
        </h3>
        <div className="grid gap-3 text-xs text-muted-foreground">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">1.</span> A random
            nullifier and secret are generated locally in your browser.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">2.</span> A Poseidon
            hash commitment is computed:{" "}
            <code className="text-privacy-300">
              commitment = Poseidon(nullifier, secret)
            </code>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">3.</span> The
            commitment is inserted into the on-chain Merkle tree (depth 20).
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <span className="font-medium text-foreground">4.</span> Your note
            (nullifier + secret) is shown once. Save it — it is the only way to
            withdraw.
          </div>
        </div>
      </div>
    </div>
  );
}
