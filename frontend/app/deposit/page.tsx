'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Shield, ArrowLeft, Coins, AlertTriangle, CheckCircle,
  Loader2, ChevronDown, Eye, EyeOff, Info,
} from 'lucide-react';

const DENOMINATIONS = [
  { value: 1, label: '1', symbol: 'XLM' },
  { value: 10, label: '10', symbol: 'XLM' },
  { value: 100, label: '100', symbol: 'XLM' },
  { value: 1000, label: '1,000', symbol: 'XLM' },
  { value: 10000, label: '10,000', symbol: 'XLM' },
];

const PRESET_AMOUNTS = [1, 2, 5, 10];

export default function DepositPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selectedDenom, setSelectedDenom] = useState(100);
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [noteBackup, setNoteBackup] = useState('');
  const [depositTxHash, setDepositTxHash] = useState('');

  useEffect(() => setMounted(true), []);

  const handlePreset = (n: number) => {
    setAmount(String(n * selectedDenom));
    setCustomAmount(String(n * selectedDenom));
  };

  const handleDenomChange = (val: number) => {
    setSelectedDenom(val);
    const cur = parseInt(customAmount) || 0;
    const units = Math.floor(cur / val);
    setAmount(String(units * val));
  };

  const handleCustomAmount = (val: string) => {
    setCustomAmount(val);
    const num = parseInt(val) || 0;
    const units = Math.floor(num / selectedDenom);
    setAmount(String(units * selectedDenom));
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).freighterApi) {
      try {
        const api = (window as any).freighterApi;
        const res = await api.requestAccounts();
        if (res.address) {
          setWalletConnected(true);
          setWalletAddress(res.address);
        }
      } catch {
        setWalletConnected(false);
      }
    } else {
      // Simulate wallet for demo
      setWalletConnected(true);
      setWalletAddress('GDRW...7K2N');
    }
  };

  const handleDeposit = async () => {
    setIsDepositing(true);
    // Simulate deposit
    await new Promise(r => setTimeout(r, 2000));
    const fakeNote = `${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`;
    const fakeTx = `x${Math.random().toString(36).slice(2).padEnd(55, '0')}`;
    setNoteBackup(fakeNote);
    setDepositTxHash(fakeTx);
    setDepositSuccess(true);
    setIsDepositing(false);
  };

  if (depositSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2 dark:text-white">Deposit Successful!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your deposit of {amount} XLM has been submitted.
          </p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6 text-left">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold dark:text-white">Your Note (BACKUP NOW!)</h2>
              <button
                onClick={() => setShowNote(!showNote)}
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                {showNote ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showNote ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-400">
                  <strong>CRITICAL:</strong> This note is the ONLY way to withdraw your funds.
                  If you lose it, your funds are UNRECOVERABLE.
                </div>
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 font-mono text-sm break-all mb-4">
              {showNote ? noteBackup : noteBackup.replace(/./g, '•')}
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(noteBackup)}
              className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Copy Note
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-500 mb-6">
            Transaction: <span className="font-mono">{depositTxHash.slice(0, 20)}...</span>
          </div>

          <div className="flex gap-3 justify-center">
            <Link
              href="/withdraw"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-primary text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Make Withdrawal
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-xl font-medium dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Back Home
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
          <h1 className="text-2xl font-bold dark:text-white mb-1">Make a Deposit</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Deposit XLM into the shielded pool for private withdrawals.
          </p>
        </div>

        {/* Wallet Connection */}
        {!walletConnected ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-slate-400" />
              </div>
              <h2 className="font-semibold mb-2 dark:text-white">Connect Your Wallet</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Connect your Freighter wallet to make a deposit.
              </p>
              <button
                onClick={connectWallet}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-primary text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Connect Freighter
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div className="text-sm">
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Connected:</span>
              <span className="text-emerald-600 dark:text-emerald-500 font-mono ml-2">{walletAddress}</span>
            </div>
          </div>
        )}

        {/* Denomination Selection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <label className="block text-sm font-medium mb-3 dark:text-white">Select Denomination</label>
          <div className="grid grid-cols-5 gap-2">
            {DENOMINATIONS.map(d => (
              <button
                key={d.value}
                onClick={() => handleDenomChange(d.value)}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                  selectedDenom === d.value
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            All deposits use {selectedDenom} XLM units. Amount must be a multiple of {selectedDenom}.
          </p>
        </div>

        {/* Amount Selection */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <label className="block text-sm font-medium mb-3 dark:text-white">Number of Units</label>
          <div className="flex gap-2 mb-4">
            {PRESET_AMOUNTS.map(n => (
              <button
                key={n}
                onClick={() => handlePreset(n)}
                className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {n}×
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="number"
              value={customAmount}
              onChange={e => handleCustomAmount(e.target.value)}
              placeholder={`Enter amount (multiple of ${selectedDenom})`}
              className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-medium dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">XLM</div>
          </div>

          {amount && (
            <div className="mt-4 flex items-center justify-between py-3 px-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Deposit</span>
              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {parseInt(amount).toLocaleString()} XLM
              </span>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <strong>What happens next:</strong> After deposit, you will receive a secret note.
              This note is required to withdraw your funds. Save it securely!
            </div>
          </div>
        </div>

        {/* Deposit Button */}
        <button
          onClick={handleDeposit}
          disabled={!walletConnected || !amount || parseInt(amount) < selectedDenom || isDepositing}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-primary text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {isDepositing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Deposit...
            </>
          ) : (
            <>
              <Coins className="w-5 h-5" />
              Deposit {amount ? `${parseInt(amount).toLocaleString()} XLM` : ''}
            </>
          )}
        </button>

        <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-4">
          Network fee: ~0.1 XLM • Pool fee: 0.01%
        </p>
      </main>
    </div>
  );
}
