'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  ArrowLeft, Clock, Coins, Download, ExternalLink,
  Search, Filter, ChevronDown, FileText, X,
} from 'lucide-react';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: string;
  denomination: string;
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: string;
  note?: string;
}

const MOCK_TX: Transaction[] = [
  {
    id: '1', type: 'deposit', amount: '1,000', denomination: '100 XLM × 10',
    txHash: 'x7b3f8a2c4d9e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
    status: 'confirmed', timestamp: '2026-03-31 14:23 UTC', note: 'personal savings',
  },
  {
    id: '2', type: 'withdraw', amount: '500', denomination: '100 XLM × 5',
    txHash: 'x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
    status: 'confirmed', timestamp: '2026-03-30 09:15 UTC',
  },
  {
    id: '3', type: 'deposit', amount: '100', denomination: '100 XLM × 1',
    txHash: 'x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8',
    status: 'pending', timestamp: '2026-03-29 18:45 UTC',
  },
  {
    id: '4', type: 'withdraw', amount: '1,000', denomination: '100 XLM × 10',
    txHash: 'x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
    status: 'failed', timestamp: '2026-03-28 11:30 UTC',
  },
  {
    id: '5', type: 'deposit', amount: '10,000', denomination: '100 XLM × 100',
    txHash: 'x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
    status: 'confirmed', timestamp: '2026-03-27 08:00 UTC', note: 'investment',
  },
];

type FilterType = 'all' | 'deposit' | 'withdraw';
type FilterStatus = 'all' | 'confirmed' | 'pending' | 'failed';

export default function HistoryPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => { setMounted(true); }, []);

  const filtered = useMemo(() => {
    return MOCK_TX.filter(tx => {
      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      const matchStatus = statusFilter === 'all' || tx.status === statusFilter;
      const matchSearch = search === '' ||
        tx.txHash.toLowerCase().includes(search.toLowerCase()) ||
        tx.denomination.toLowerCase().includes(search.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });
  }, [search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function exportCSV() {
    const headers = ['ID', 'Type', 'Amount', 'Denomination', 'TX Hash', 'Status', 'Timestamp', 'Note'];
    const rows = filtered.map(tx => [
      tx.id, tx.type, tx.amount, tx.denomination, tx.txHash, tx.status, tx.timestamp, tx.note || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `privacylayer-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusColors: Record<string, string> = {
    confirmed: 'text-emerald-500',
    pending: 'text-amber-500',
    failed: 'text-red-500',
  };

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
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark:text-white mb-1">Transaction History</h1>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by TX hash or denomination..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 dark:focus:ring-primary/30 dark:text-white placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => { setTypeFilter('deposit'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === 'deposit'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Deposits
            </button>
            <button
              onClick={() => { setTypeFilter('withdraw'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === 'withdraw'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              Withdrawals
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                showFilters
                  ? 'bg-slate-100 dark:bg-slate-700 border-transparent'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Status
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Status filter dropdown */}
          {showFilters && (
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
              {(['all', 'confirmed', 'pending', 'failed'] as FilterStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Transaction list */}
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-medium mb-1 dark:text-white">No transactions found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                {search ? 'Try adjusting your search or filters.' : 'Your transaction history will appear here.'}
              </p>
              {search && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            paginated.map(tx => (
              <div
                key={tx.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'deposit'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      {tx.type === 'deposit' ? (
                        <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                      ) : (
                        <Download className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold capitalize text-sm sm:text-base dark:text-white">{tx.type}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">{tx.denomination}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm sm:text-base ${
                      tx.type === 'deposit' ? 'text-emerald-500' : 'text-purple-500'
                    }`}>
                      {tx.type === 'deposit' ? '+' : '-'}{tx.amount} XLM
                    </div>
                    <div className={`text-xs font-medium capitalize ${statusColors[tx.status]}`}>
                      {tx.status}
                    </div>
                  </div>
                </div>

                {/* Note */}
                {tx.note && (
                  <div className="mb-3 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <FileText className="w-3 h-3" />
                      {tx.note}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tx.timestamp}</span>
                    <span className="sm:hidden">{tx.timestamp.split(' ')[0]}</span>
                  </div>
                  <a
                    href={`https://stellar.expert/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
