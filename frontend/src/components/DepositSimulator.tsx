'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Coins, 
  Wallet, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Copy,
  Hash
} from 'lucide-react';

// Denomination options matching the contract
const DENOMINATIONS = [
  { value: 'Xlm10', label: '10 XLM', amount: 100000000 },
  { value: 'Xlm100', label: '100 XLM', amount: 1000000000 },
  { value: 'Xlm1000', label: '1,000 XLM', amount: 10000000000 },
  { value: 'Usdc100', label: '100 USDC', amount: 100000000 },
  { value: 'Usdc1000', label: '1,000 USDC', amount: 1000000000 },
];

interface SimulationResult {
  gasEstimate: string;
  successProbability: number;
  estimatedTime: string;
  warnings: string[];
  commitmentPreview: string;
  leafIndex: number;
  newRoot: string;
}

export function DepositSimulator() {
  const [denomination, setDenomination] = useState(DENOMINATIONS[0]);
  const [depositorAddress, setDepositorAddress] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Validate inputs
  useEffect(() => {
    const newErrors: string[] = [];
    if (depositorAddress && !isValidStellarAddress(depositorAddress)) {
      newErrors.push('Invalid Stellar address format (expected G...)');
    }
    setErrors(newErrors);
  }, [depositorAddress]);

  const runSimulation = async () => {
    setIsSimulating(true);
    setResult(null);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Calculate simulation results
    const baseGas = 85000;
    const gasVariation = Math.floor(Math.random() * 5000);
    const gasEstimate = baseGas + gasVariation;

    // Success probability based on various factors
    let successProbability = 95;
    const warnings: string[] = [];

    if (denomination.value.startsWith('Usdc')) {
      warnings.push('USDC deposits require token approval first');
      successProbability -= 5;
    }

    if (depositorAddress && !isValidStellarAddress(depositorAddress)) {
      successProbability = 0;
      warnings.push('Invalid depositor address');
    }

    // Generate mock commitment preview
    const mockCommitment = generateMockHash();
    const mockLeafIndex = Math.floor(Math.random() * 10000);
    const mockRoot = generateMockHash();

    setResult({
      gasEstimate: gasEstimate.toLocaleString(),
      successProbability,
      estimatedTime: '3-5 seconds',
      warnings,
      commitmentPreview: mockCommitment,
      leafIndex: mockLeafIndex,
      newRoot: mockRoot,
    });

    setIsSimulating(false);
  };

  const isValidStellarAddress = (address: string): boolean => {
    return /^G[A-Z2-7]{55}$/.test(address);
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

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <Coins className="w-5 h-5 text-primary-400" />
        Deposit Simulation
      </h2>

      <div className="space-y-6">
        {/* Denomination Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Denomination
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {DENOMINATIONS.map((denom) => (
              <button
                key={denom.value}
                onClick={() => setDenomination(denom)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  denomination.value === denom.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {denom.label}
              </button>
            ))}
          </div>
        </div>

        {/* Depositor Address */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Wallet className="w-4 h-4 inline mr-1" />
            Depositor Address (optional)
          </label>
          <input
            type="text"
            value={depositorAddress}
            onChange={(e) => setDepositorAddress(e.target.value)}
            placeholder="G..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          {errors.length > 0 && (
            <p className="text-red-400 text-sm mt-1">{errors[0]}</p>
          )}
        </div>

        {/* Simulate Button */}
        <button
          onClick={runSimulation}
          disabled={isSimulating || errors.length > 0}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Simulating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Simulation
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

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <StatCard
                label="Gas Estimate"
                value={result.gasEstimate}
                unit="gas"
                icon={<Zap className="w-4 h-4" />}
              />
              <StatCard
                label="Success Rate"
                value={`${result.successProbability}%`}
                variant={result.successProbability >= 90 ? 'success' : result.successProbability >= 70 ? 'warning' : 'error'}
              />
              <StatCard
                label="Est. Time"
                value={result.estimatedTime}
              />
            </div>

            {/* Commitment Preview */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <Hash className="w-4 h-4" />
                  Commitment Preview
                </span>
                <button
                  onClick={() => copyToClipboard(result.commitmentPreview)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <code className="text-xs text-primary-300 break-all">
                {result.commitmentPreview}
              </code>
            </div>

            {/* Tree Update Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <span className="text-sm text-slate-400 block mb-1">Leaf Index</span>
                <span className="text-lg font-mono text-white">{result.leafIndex}</span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <span className="text-sm text-slate-400 block mb-1">New Root</span>
                <code className="text-xs text-accent-300 break-all">{result.newRoot.slice(0, 20)}...</code>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
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
            {result.successProbability >= 90 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-green-300">
                  Transaction is likely to succeed. Ready to deposit.
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
  icon,
  variant = 'default' 
}: { 
  label: string; 
  value: string; 
  unit?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}) {
  const colors = {
    default: 'text-white',
    success: 'text-green-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
        {icon}
        {label}
      </div>
      <span className={`text-xl font-semibold ${colors[variant]}`}>
        {value}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}