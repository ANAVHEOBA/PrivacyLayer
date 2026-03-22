"use client";

import { useEffect } from "react";
import { useHistoryStore, useNotesStore } from "@/lib/store";
import { truncateAddress, getDenominationLabel } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionHistory() {
  const { deposits, withdrawals, loading, error, refreshHistory } = useHistoryStore();
  const { notes } = useNotesStore();

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const hasData = deposits.length > 0 || withdrawals.length > 0 || notes.length > 0;

  return (
    <div className="space-y-6">
      {/* Local Notes (from localStorage) */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Your Deposit Notes</CardTitle>
          <CardDescription>
            Notes stored locally in your browser. Keep backups of these notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No deposit notes found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make a deposit to generate a secret note.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <div
                  key={note.commitment}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">Note #{index + 1}</span>
                      <Badge variant={note.spent ? "destructive" : "success"}>
                        {note.spent ? "Spent" : "Available"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getDenominationLabel(note.denomination)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                      {note.commitment.slice(0, 16)}...{note.commitment.slice(-8)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(note.timestamp).toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* On-chain History */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">On-chain Activity</CardTitle>
          <CardDescription>
            Recent deposits and withdrawals from the privacy pool contract events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 text-center py-4">{error}</p>
          ) : !hasData ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No on-chain activity yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activity will appear here once the privacy pool contract is deployed and transactions are made.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {deposits.map((deposit) => (
                <div
                  key={deposit.txHash}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-shield-500/20 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-shield-400">
                      <path d="M12 5v14m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Deposit</span>
                      <Badge variant="success">Confirmed</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      Leaf #{deposit.leafIndex} | {truncateAddress(deposit.commitment, 8)}
                    </p>
                  </div>
                </div>
              ))}
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.txHash}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-privacy-500/20 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-privacy-400">
                      <path d="M12 19V5m0 0l-6 6m6-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Withdrawal</span>
                      <Badge variant="default">ZK-Verified</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      To: {truncateAddress(withdrawal.recipient, 8)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
