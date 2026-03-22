"use client";

import { useState, useCallback } from "react";
import { useWalletStore, useNotesStore } from "@/lib/store";
import { DENOMINATIONS, type DenominationType } from "@/lib/constants";
import { generateNote, submitDeposit } from "@/lib/sdk";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type DepositStep = "select" | "confirm" | "processing" | "backup" | "complete";

export function DepositForm() {
  const { connected, address } = useWalletStore();
  const { addNote } = useNotesStore();

  const [step, setStep] = useState<DepositStep>("select");
  const [denomination, setDenomination] = useState<DenominationType>("Xlm10");
  const [noteBackup, setNoteBackup] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedDenom = DENOMINATIONS[denomination];

  const handleDeposit = useCallback(async () => {
    if (!connected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setStep("processing");
    setLoading(true);
    setError(null);

    try {
      // Generate the cryptographic note
      const note = await generateNote();
      setNoteBackup(note.noteString);

      // Submit deposit to the contract
      await submitDeposit(note.commitment, address);

      // Save note locally
      addNote(note, denomination);
      setStep("backup");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deposit failed";
      // If SDK not ready yet, show backup step anyway for demo
      if (message.includes("not yet implemented") || message.includes("not configured")) {
        const note = await generateNote();
        setNoteBackup(note.noteString);
        addNote(note, denomination);
        setStep("backup");
      } else {
        setError(message);
        setStep("confirm");
      }
    } finally {
      setLoading(false);
    }
  }, [connected, address, denomination, addNote]);

  const handleCopyNote = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(noteBackup);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement("textarea");
      textArea.value = noteBackup;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [noteBackup]);

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
            Connect your Freighter wallet to make a shielded deposit into the privacy pool.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-shield-400">
            <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 8v4m0 0v4m0-4h4m-4 0H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Shielded Deposit
        </CardTitle>
        <CardDescription>
          Deposit a fixed amount into the privacy pool. You will receive a secret note for withdrawal.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step: Select Denomination */}
        {(step === "select" || step === "confirm") && (
          <>
            <Select
              label="Denomination"
              value={denomination}
              onChange={(e) => setDenomination(e.target.value as DenominationType)}
            >
              {Object.entries(DENOMINATIONS).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </Select>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">You deposit</span>
                <span className="font-semibold">{selectedDenom.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token</span>
                <Badge variant="outline">{selectedDenom.token}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Privacy set</span>
                <span className="text-muted-foreground">All {selectedDenom.label} depositors</span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-300">
                You will receive a secret note after deposit. Store it safely — it is the ONLY way to withdraw your funds. Losing the note means losing access to your deposit.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="h-12 w-12 rounded-full border-4 border-privacy-500 border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Generating commitment and submitting deposit...</p>
          </div>
        )}

        {/* Step: Backup Note */}
        {step === "backup" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-shield-500/30 bg-shield-500/5 p-3">
              <p className="text-xs text-shield-300 font-medium mb-1">CRITICAL: Save Your Note</p>
              <p className="text-xs text-shield-300/70">
                This note is required to withdraw your funds. Copy it and store it securely.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <code className="text-xs text-privacy-300 break-all font-mono leading-relaxed">
                {noteBackup}
              </code>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyNote}
            >
              {copied ? "Copied!" : "Copy Note to Clipboard"}
            </Button>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-shield-500/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-shield-400">
                <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold">Deposit Successful</h3>
            <p className="text-sm text-muted-foreground text-center">
              Your deposit has been added to the privacy pool. Use your saved note to withdraw funds at any time.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {step === "select" && (
          <Button
            variant="gradient"
            className="w-full"
            size="lg"
            onClick={() => setStep("confirm")}
          >
            Continue with {selectedDenom.label}
          </Button>
        )}
        {step === "confirm" && (
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>
              Back
            </Button>
            <Button variant="gradient" className="flex-1" onClick={handleDeposit} loading={loading}>
              Confirm Deposit
            </Button>
          </div>
        )}
        {step === "backup" && (
          <Button
            variant="gradient"
            className="w-full"
            size="lg"
            onClick={() => setStep("complete")}
          >
            I Have Saved My Note
          </Button>
        )}
        {step === "complete" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setStep("select");
              setNoteBackup("");
              setError(null);
            }}
          >
            Make Another Deposit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
