'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpFromLine, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  XCircle,
  Copy,
  ShieldCheck,
  Hash,
  Wallet,
  Percent
} from 'lucide-react';

interface WithdrawParams {
  nullifier: string;
  secret: string;
  root: string;
  recipient: string;
  relayer: string;
  fee: string;
}

interface SimulationResult {
  gasEstimate: string;
  successProbability: number;
  estimatedTime: string;
  warnings: string[];
  errors: string[];
  nullifierHash: string;
  proofValid: boolean;
  rootValid: boolean;
  nullifierUnspent: boolean;
  estimatedNetAmount: string;
  feeAmount: string;
}

export function WithdrawSimulator() {
  const [params, setParams] = useState<WithdrawParams>({
    nullifier: '',
    secret: '',
    root: '',
    recipient: '',
    relayer: '',
    fee: '0',
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate inputs
  useEffect(() => {
    const errors: string[] = [];
    
    if (params.recipient && !isValidStellarAddress(params.recipient)) {
      errors.push('Invalid recipient address format');
    }
    
    if (params.relayer && !isValidStellarAddress(params.relayer)) {
      errors.push('Invalid relayer address format');
    }
    
    if (params.fee && parseFloat(params.fee) < 0) {
      errors.push('Fee cannot be negative');
    }

    setValidationErrors(errors);
  }, [params]);

  const runSimulation = async () => {
    setIsSimulating(true);
    setResult(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Calculate simulation results
    const baseGas = 120000; // Higher for withdrawal due to ZK verification
    const gasVariation = Math.floor(Math.random() * 10000);
    const gasEstimate = baseGas + gasVariation;

    // Success probability based on various factors
    let successProbability = 90;
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate nullifier and secret
    if (!params.nullifier || !params.secret) {
      errors.push('Nullifier and secret are required');
      successProbability = 0;
    } else if (!isValidHex(params.nullifier)) {
      errors.push('Invalid nullifier format (expected hex)');
      successProbability -= 30;
    }

    // Validate root
    const rootValid = params.root ? isValidHex(params.root) : false;
    if (!rootValid && params.root) {
      warnings.push('Root may not be in the current history buffer');
    }

    // Validate recipient
    const recipientValid = params.recipient ? isValidStellarAddress(params.recipient) : false;
    if (!recipientValid && params.recipient) {
      errors.push('Invalid recipient address');
      successProbability -= 20;
    }

    // Validate fee
    const feeValue = parseFloat(params.fee) || 0;
    if (feeValue > 10) {
      warnings.push('Fee exceeds typical amounts - verify relayer terms');
      successProbability -= 5;
    }

    // Check for common issues
    if (params.relayer && feeValue === 0) {
      warnings.push('Relayer specified but fee is 0 - transaction may be rejected');
    }

    // Generate mock nullifier hash
    const nullifierHash = generateMockHash();
    
    // Simulate nullifier check
    const nullifierUnspent = Math.random() > 0.1; // 90% chance unspent

    if (!nullifierUnspent) {
      errors.push('Nullifier already spent - double spend detected');
      successProbability = 0;
    }

    // Calculate amounts
    const denomination = 100; // Default denomination
    const feeAmount = feeValue.toFixed(2);
    const netAmount = (denomination - feeValue).toFixed(2);

    setResult({
      gasEstimate: gasEstimate.toLocaleString(),
      successProbability: Math.max(0, successProbability),
      estimatedTime: '5-8 seconds',
      warnings,
      errors,
      nullifierHash,
      proofValid: successProbability > 50,
      rootValid,
      nullifierUnspent,
      estimatedNetAmount: netAmount,
      feeAmount,
    });

    setIsSimulating(false);
  };

  const isValidStellarAddress = (address: string): boolean => {
    return /^G[A-Z2-7]{55}$/.test(address);
  };

  const isValidHex = (value: string): boolean => {
    return /^(0x)?[0-9a-fA-F]+$/.test(value);
  };

  const generateMockHash = (): string => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const updateParam = (key: keyof WithdrawParams, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <ArrowUpFromLine className="w-5 h-5 text-accent-400" />
        Withdraw Simulation
      </h2>

      <div className="space-y-6">
        {/* Note Parameters */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent-400" />
            Note Parameters (from your deposit)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nullifier</label>
              <input
                type="text"
                value={params.nullifier}
                onChange={(e) => updateParam('nullifier', e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Secret</label>
              <input
                type="text"
                value={params.secret}
                onChange={(e) => updateParam('secret', e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>
        </div>

        {/* Merkle Root */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Hash className="w-4 h-4 inline mr-1" />
            Merkle Root (at deposit time)
          </label>
          <input
            type="text"
            value={params.root}
            onChange={(e) => updateParam('root', e.target.value)}
            placeholder="0x..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            The root must be in the contract&apos;s historical root buffer
          </p>
        </div>

        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Wallet className="w-4 h-4 inline mr-1" />
            Recipient Address
          </label>
          <input
            type="text"
            value={params.recipient}
            onChange={(e) => updateParam('recipient', e.target.value)}
            placeholder="G..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
          />
        </div>

        {/* Relayer Options */}
        <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
          <h3 className="text-sm font-medium text-slate-300 mb-4">Relayer Options (optional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Relayer Address</label>
              <input
                type="text"
                value={params.relayer}
                onChange={(e) => updateParam('relayer', e.target.value)}
                placeholder="G..."
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                <Percent className="w-3 h-3 inline mr-1" />
                Fee (XLM/USDC)
              </label>
              <input
                type="number"
                value={params.fee}
                onChange={(e) => updateParam('fee', e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
              <XCircle className="w-4 h-4" />
              Input Errors
            </div>
            <ul className="text-sm text-red-200 space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Simulate Button */}
        <button
          onClick={runSimulation}
          disabled={isSimulating || validationErrors.length > 0}
          className="w-full bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Withdrawal Simulation
            </>
          )}
        </button>

        {/* Simulation Results */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-slate-700 pt-6 mt-6"
          >
            <h3 className="text-lg font-medium mb-4">Simulation Results</h3>

            {/* Verification Status */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <VerificationBadge
                label="Proof Valid"
                valid={result.proofValid}
              />
              <VerificationBadge
                label="Root Known"
                valid={result.rootValid}
              />
              <VerificationBadge
                label="Nullifier Unspent"
                valid={result.nullifierUnspent}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label="Gas Estimate"
                value={result.gasEstimate}
                unit="gas"
              />
              <StatCard
                label="Success Rate"
                value={`${result.successProbability}%`}
                variant={result.successProbability >= 90 ? 'success' : result.successProbability >= 70 ? 'warning' : 'error'}
              />
              <StatCard
                label="Net Amount"
                value={result.estimatedNetAmount}
                unit="XLM"
              />
              <StatCard
                label="Est. Time"
                value={result.estimatedTime}
              />
            </div>

            {/* Nullifier Hash */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Nullifier Hash</span>
                <button
                  onClick={() => copyToClipboard(result.nullifierHash)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="text-xs text-accent-300 break-all">
                {result.nullifierHash}
              </code>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-red-400 font-medium mb-2">
                  <XCircle className="w-4 h-4" />
                  Errors Detected
                </div>
                <ul className="text-sm text-red-200 space-y-1">
                  {result.errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </div>
                <ul className="text-sm text-amber-200 space-y-1">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Indicator */}
            {result.successProbability >= 90 && result.errors.length === 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-green-300">
                  All checks passed. Ready to withdraw.
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  unit,
  variant = 'default' 
}: { 
  label: string; 
  value: string; 
  unit?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const colors = {
    default: 'text-white',
    success: 'text-green-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <span className={`text-lg font-semibold ${colors[variant]}`}>
        {value}
        {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function VerificationBadge({ label, valid }: { label: string; valid: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      valid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {valid ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}