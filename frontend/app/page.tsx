"use client";

import Link from "next/link";
import { PoolStats } from "@/components/features/pool-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWalletStore } from "@/lib/store";

export default function DashboardPage() {
  const { connected } = useWalletStore();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-shield-500 animate-pulse" />
          Powered by Stellar Protocol 25
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="gradient-text">Private Transactions</span>
          <br />
          on Stellar
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Deposit XLM or USDC into a shielded pool, then withdraw to any address
          using a zero-knowledge proof — with{" "}
          <span className="text-foreground font-medium">
            no on-chain link
          </span>{" "}
          between deposit and withdrawal.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/deposit">
            <Button variant="gradient" size="xl">
              Make a Deposit
            </Button>
          </Link>
          <Link href="/withdraw">
            <Button variant="outline" size="xl">
              Withdraw Funds
            </Button>
          </Link>
        </div>
      </section>

      {/* Pool Stats */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Pool Overview</h2>
        <PoolStats />
      </section>

      {/* How It Works */}
      <section className="space-y-6 py-8">
        <h2 className="text-xl font-semibold text-center">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="glass glass-hover">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-shield-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-shield-400">
                  <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="font-semibold">1. Deposit</h3>
              <p className="text-sm text-muted-foreground">
                Deposit a fixed amount into the shielded pool. Receive a secret
                note as your withdrawal key.
              </p>
            </CardContent>
          </Card>

          <Card className="glass glass-hover">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-privacy-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-privacy-400">
                  <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="font-semibold">2. Wait</h3>
              <p className="text-sm text-muted-foreground">
                Your deposit joins the anonymity set. The more deposits, the
                stronger your privacy guarantee.
              </p>
            </CardContent>
          </Card>

          <Card className="glass glass-hover">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-privacy-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-privacy-400">
                  <path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="font-semibold">3. Withdraw</h3>
              <p className="text-sm text-muted-foreground">
                Generate a ZK proof using your note and withdraw to any
                address — no link to your deposit.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Highlights */}
      <section className="space-y-6 py-8">
        <h2 className="text-xl font-semibold text-center">Built on Protocol 25</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="glass glass-hover">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold text-privacy-400">BN254 Pairing Verification</h3>
              <p className="text-sm text-muted-foreground">
                Groth16 proof verification using native BN254 elliptic curve
                operations — no external libraries needed.
              </p>
            </CardContent>
          </Card>
          <Card className="glass glass-hover">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold text-shield-400">Poseidon Hash Commitments</h3>
              <p className="text-sm text-muted-foreground">
                ZK-friendly Poseidon2 hash for commitment generation. Native
                Soroban host function — minimal gas cost.
              </p>
            </CardContent>
          </Card>
          <Card className="glass glass-hover">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold text-privacy-400">Noir ZK Circuits</h3>
              <p className="text-sm text-muted-foreground">
                Privacy circuits written in Noir. Merkle tree inclusion proofs
                and nullifier verification compiled to Groth16.
              </p>
            </CardContent>
          </Card>
          <Card className="glass glass-hover">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold text-shield-400">Fixed Denominations</h3>
              <p className="text-sm text-muted-foreground">
                Fixed deposit amounts (10/100/1000 XLM, 100/1000 USDC) prevent
                amount-based correlation attacks.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
