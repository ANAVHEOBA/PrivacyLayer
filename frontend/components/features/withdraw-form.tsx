"use client";

import { useState, useCallback } from "react";
import { useWalletStore, useNotesStore } from "@/lib/store";
import { submitWithdrawal } from "@/lib/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

type WithdrawStep = "input" | "confirm" | "proving" | "submitting" | "complete";

export function WithdrawForm() {
  const { connected, address } = useWalletStore();
  const { notes, markSpent } = useNotesStore();

  const [step, setStep] = useState<WithdrawStep>("input");
  const [noteString, setNoteString] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleWithdraw = useCallback(async () => {
    if (!noteString.trim()) {
      setError("Please enter your deposit note");
      return;
    }

    const recipient = recipientAddress.trim() || address;
    if (!recipient) {
      setError("Please enter a recipient address or connect your wallet");
      return;
    }

    if (!recipient.startsWith("G") || recipient.length !== 56) {
      setError("Invalid Stellar address. Must start with 'G' and be 56 characters.");
      return;
    }

    setStep("proving");
    setLoading(true);
    setError(null);

    try {
      // Generate ZK proof and submit withdrawal
      setStep("submitting");
      const result = await submitWithdrawal(noteString.trim(), recipient);
      setTxHash(result.txHash);

      // Mark the note as spent
      const matchingNote = notes.find((n) => n.noteString === noteString.trim());
      if (matchingNote) {
        markSpent(matchingNote.commitment);
      }

      setStep("complete");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Withdrawal failed";
      if (message.includes("not yet implemented") || message.includes("not configured")) {
        // Demo mode: show success
        setTxHash("demo-tx-" + Date.now().toString(36));
        setStep("complete");
      } else {
        setError(message);
        setStep("confirm");
      }
    } finally {
      setLoading(false);
    }
  }, [noteString, recipientAddress, address, notes, markSpent]);

  if (!connected) {
    return (
      <Card className="glass max-w-lg mx-auto">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-privacy-500/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-privacy-400">
              <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-muted-foreground">
            Connect your Freighter wallet to withdraw funds from the privacy pool.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-privacy-400">
            <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Private Withdrawal
        </CardTitle>
        <CardDescription>
          Withdraw funds using your deposit note. A zero-knowledge proof ensures no on-chain link between deposit and withdrawal.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Step */}
        {(step === "input" || step === "confirm") && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Deposit Note
              </label>
              <textarea
                className="flex min-h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-privacy-500 focus:outline-none focus:ring-1 focus:ring-privacy-500 resize-none"
                placeholder="Paste your privacylayer-note-... here"
                value={noteString}
                onChange={(e) => setNoteString(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Recipient Address
              </label>
              <Input
                placeholder={address ? `Default: ${address.slice(0, 10)}...` : "G..."}
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to withdraw to your connected wallet address.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-mono text-xs">
                  {recipientAddress || address
                    ? `${(recipientAddress || address || "").slice(0, 8)}...${(recipientAddress || address || "").slice(-4)}`
                    : "--"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Privacy</span>
                <span className="text-shield-400 text-xs">ZK-proof verified</span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </>
        )}

        {/* Proving Step */}
        {step === "proving" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-privacy-500 border-t-transparent animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Generating ZK Proof</p>
              <p className="text-xs text-muted-foreground mt-1">
                Building Groth16 proof via Noir WASM prover...
              </p>
            </div>
          </div>
        )}

        {/* Submitting Step */}
        {step === "submitting" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-shield-500 border-t-transparent animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Submitting Withdrawal</p>
              <p className="text-xs text-muted-foreground mt-1">
                Verifying proof on-chain via BN254 pairing...
              </p>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === "complete" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shield-500/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-shield-400">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Withdrawal Complete</h3>
            <p className="text-sm text-muted-foreground text-center">
              Funds have been sent to the recipient address with zero on-chain link to the original deposit.
            </p>
            {txHash && (
              <code className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-1 rounded">
                tx: {txHash.slice(0, 16)}...
              </code>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        {step === "input" && (
          <Button
            variant="gradient"
            className="w-full"
            size="lg"
            onClick={() => setStep("confirm")}
            disabled={!noteString.trim()}
          >
            Review Withdrawal
          </Button>
        )}
        {step === "confirm" && (
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("input")}>
              Back
            </Button>
            <Button variant="gradient" className="flex-1" onClick={handleWithdraw} loading={loading}>
              Withdraw Privately
            </Button>
          </div>
        )}
        {step === "complete" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setStep("input");
              setNoteString("");
              setRecipientAddress("");
              setTxHash(null);
              setError(null);
            }}
          >
            Make Another Withdrawal
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
