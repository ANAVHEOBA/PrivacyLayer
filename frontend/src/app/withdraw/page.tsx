'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WithdrawPage() {
  const [note, setNote] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawComplete, setWithdrawComplete] = useState(false);

  const handleWithdraw = async () => {
    if (!note || !recipientAddress) return;
    
    setIsWithdrawing(true);
    // Simulate withdrawal process
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setWithdrawComplete(true);
    setIsWithdrawing(false);
  };

  return (
    <div className="container px-4 py-12 mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Withdraw</h1>
        <p className="text-muted-foreground mt-2">
          Withdraw your funds privately to any address using your deposit note.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Note Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Your Private Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="privacylayer-v1:0x..."
            className="input min-h-[100px] font-mono text-sm"
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Enter the note you received when you deposited funds.
          </p>
        </div>

        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium mb-2">Recipient Address</label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="G..."
            className="input font-mono"
          />
          <p className="text-xs text-muted-foreground mt-2">
            The address where you want to receive your funds. Can be any Stellar address.
          </p>
        </div>

        {/* Withdrawal Info */}
        {note && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border space-y-3">
            <h3 className="font-medium">Withdrawal Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Amount:</span>
              </div>
              <div className="font-medium">100 XLM</div>
              <div>
                <span className="text-muted-foreground">Relayer Fee:</span>
              </div>
              <div>0.1 XLM</div>
              <div>
                <span className="text-muted-foreground">You&apos;ll receive:</span>
              </div>
              <div className="font-medium text-green-600 dark:text-green-400">99.9 XLM</div>
            </div>
          </div>
        )}

        {/* Withdraw Button */}
        {!withdrawComplete && (
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !note || !recipientAddress}
            className={cn(
              'btn btn-primary w-full py-6 text-lg',
              (isWithdrawing || !note || !recipientAddress) && 'opacity-70 cursor-not-allowed'
            )}
          >
            {isWithdrawing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating ZK Proof...
              </>
            ) : (
              'Withdraw Privately'
            )}
          </button>
        )}

        {/* Success Message */}
        {withdrawComplete && (
          <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-green-700 dark:text-green-400">Withdrawal Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your funds have been sent to the recipient address. No on-chain link exists 
                  between this withdrawal and your original deposit.
                </p>
              </div>
            </div>

            <div className="p-3 rounded bg-muted">
              <div className="text-xs text-muted-foreground mb-1">Transaction Hash</div>
              <code className="text-sm font-mono break-all">
                0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Info */}
      <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-border">
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <svg
            className="h-4 w-4 text-teal-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
          Zero-Knowledge Privacy
        </h3>
        <p className="text-sm text-muted-foreground">
          Your withdrawal is processed using a Groth16 ZK proof. The proof demonstrates 
          that you know the nullifier and secret for a commitment in the Merkle tree, 
          without revealing which commitment is yours. This ensures complete financial privacy.
        </p>
      </div>
    </div>
  );
}