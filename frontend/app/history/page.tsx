"use client";

import { TransactionHistory } from "@/components/features/transaction-history";

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">Transaction History</span>
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          View your deposit notes and on-chain pool activity. Your local notes
          are stored in your browser and never sent to any server.
        </p>
      </div>

      <TransactionHistory />
    </div>
  );
}
