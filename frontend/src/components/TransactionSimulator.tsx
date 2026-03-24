'use client';

import { useState } from 'react';
import { DepositSimulator } from './DepositSimulator';
import { WithdrawSimulator } from './WithdrawSimulator';
import { motion } from 'framer-motion';
import { ArrowDownToLine, ArrowUpFromLine, Shield, Zap, AlertTriangle } from 'lucide-react';

type SimulationTab = 'deposit' | 'withdraw';

export function TransactionSimulator() {
  const [activeTab, setActiveTab] = useState<SimulationTab>('deposit');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab Selector */}
      <div className="flex justify-center mb-8">
        <div className="glass-card p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'deposit'
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'withdraw'
                ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw
          </button>
        </div>
      </div>

      {/* Simulator Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'deposit' ? <DepositSimulator /> : <WithdrawSimulator />}
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <InfoCard
          icon={<Shield className="w-5 h-5" />}
          title="Privacy First"
          description="All simulations run locally. No data is sent to any server."
        />
        <InfoCard
          icon={<Zap className="w-5 h-5" />}
          title="Real-time Estimation"
          description="Gas estimates based on current network conditions."
        />
        <InfoCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Error Prediction"
          description="Identify potential issues before submitting transactions."
        />
      </div>
    </div>
  );
}

function InfoCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass-card p-4 flex items-start gap-3">
      <div className="text-primary-400 mt-0.5">{icon}</div>
      <div>
        <h4 className="font-medium text-white mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}