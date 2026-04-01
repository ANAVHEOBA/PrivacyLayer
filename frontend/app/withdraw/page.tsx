'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Shield, ArrowLeft, AlertTriangle, CheckCircle,
  Loader2, Eye, EyeOff, Info, Zap,
} from 'lucide-react';

export default function WithdrawPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  const isValidStellarAddress = (addr: string) => {
    return addr.startsWith('G') && addr.length === 56;
  };

  const handleGenerateProof = async () => {
    if (!note) {
      setError('Please enter your note');
      return;
    }
    if (!note.includes(':')) {
      setError('Invalid note format');
      return;
    }
    setError('');
    setIsGeneratingProof(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsGeneratingProof(false);
  };

  const handleWithdraw = async () => {
    if (!isValidStellarAddress(recipient)) {
      setError('Please enter a valid Stellar address (starts with G, 56 characters)');
      return;
    }
    setError('');
    setIsWithdrawing(true);
    await new Promise(r => setTimeout(r, 3000));
    const fakeTx = `x${Math.random().toString(36).slice(2).padEnd(55, '0')}`;
    setWithdrawTxHash(fakeTx);
    setWithdrawSuccess(true);
    setIsWithdrawing(false);
  };

  if (withdrawSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2 dark:text-white">Withdrawal Successful!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your withdrawal has been submitted to the network.
          </p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6 text-left">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-500">Status</span>
                <span className="text-emerald-500 font-medium">Confirmed</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-500">Recipient</span>
                <span className="font-mono text-sm dark:text-white">{recipient.slice(0, 8)}...{recipient.slice(-6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-500">Transaction</span>
                <span className="font-mono text-xs dark:text-white">{withdrawTxHash.slice(0, 20)}...</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <Link
              href="/history"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-primary text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              View History
            </Link>
            <Link
              href="/deposit"
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl font-medium dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              New Deposit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex-1" />
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Shield className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5 text-purple-600" />
              )}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold dark:text-white mb-1">Make a Withdrawal</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Withdraw your deposited funds using your secret note.
          </p>
        </div>

        {/* Step 1: Enter Note */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
            <h2 className="font-semibold dark:text-white">Enter Your Note</h2>
          </div>

          <div className="relative">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="nullifier:secret (e.g., abc123...:xyz789...)"
              rows={3}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <button
              onClick={() => setShowNote(!showNote)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showNote ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleGenerateProof}
            disabled={!note || isGeneratingProof || !note.includes(':')}
            className="w-full mt-3 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGeneratingProof ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Proof...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Generate ZK Proof
              </>
            )}
          </button>
        </div>

        {/* Step 2: Enter Recipient */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
            <h2 className="font-semibold dark:text-white">Enter Recipient Address</h2>
          </div>

          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="GDRW...7K2N"
            className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Privacy tip:</strong> Use a fresh wallet address that has never received funds before for maximum privacy.
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <strong>How it works:</strong> ZK proofs verify your deposit without revealing the deposit details on-chain. Withdrawal typically takes 30-120 seconds.
            </div>
          </div>
        </div>

        {/* Withdraw Button */}
        <button
          onClick={handleWithdraw}
          disabled={!note || !recipient || !isValidStellarAddress(recipient) || isWithdrawing}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-primary text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {isWithdrawing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Withdrawal...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Withdraw
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-4">
          Network fee: ~0.1 XLM • Proof is generated locally
        </p>
      </main>
    </div>
  );
}
