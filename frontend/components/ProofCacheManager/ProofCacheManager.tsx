'use client';

/**
 * ProofCacheManager Component
 *
 * Provides a UI for managing the proof cache:
 * - View cache statistics (entries, size, expiry)
 * - Clear all cached proofs
 * - Prune expired entries
 * - View individual cache entries
 *
 * Privacy: All cache keys are Poseidon hashes — no raw proof inputs are displayed.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface CacheEntry {
  key: string;
  createdAt: number;
  expiresAt: number;
  size: number;
}

interface CacheStats {
  entryCount: number;
  totalSizeBytes: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  expiredEntries: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return 'expired';
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

function shortKey(key: string): string {
  if (key.length <= 16) return key;
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}

export default function ProofCacheManager() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Dynamically import SDK to avoid SSR issues
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const sdk = await import('../../sdk/src/proofCache');
      const s = sdk.getCacheStats() as CacheStats;
      setStats(s);

      // Rebuild entry list from metadata
      const meta = JSON.parse(localStorage.getItem('pl_proof_cache_meta') || '[]') as CacheEntry[];
      setEntries(meta);
    } catch (err) {
      console.error('Failed to load cache stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleClearAll = useCallback(async () => {
    if (!confirm('Clear all cached proofs? This cannot be undone.')) return;
    setLoading(true);
    try {
      const sdk = await import('../../sdk/src/proofCache');
      sdk.clearAllCache();
      setMessage('Cache cleared successfully.');
      void loadStats();
    } catch (err) {
      setMessage('Failed to clear cache.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const handlePrune = useCallback(async () => {
    setLoading(true);
    try {
      const sdk = await import('../../sdk/src/proofCache');
      const pruned = sdk.pruneExpiredCache() as number;
      setMessage(`Pruned ${pruned} expired entries.`);
      void loadStats();
    } catch (err) {
      setMessage('Failed to prune expired entries.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  const handleInvalidateEntry = useCallback(async (key: string) => {
    if (!confirm(`Invalidate cache entry ${shortKey(key)}?`)) return;
    try {
      const sdk = await import('../../sdk/src/proofCache');
      sdk.invalidateCache(key);
      setMessage(`Entry ${shortKey(key)} invalidated.`);
      void loadStats();
    } catch (err) {
      setMessage('Failed to invalidate entry.');
      console.error(err);
    }
  }, [loadStats]);

  const activeEntries = entries.filter(e => e.expiresAt > Date.now());
  const expiredEntriesList = entries.filter(e => e.expiresAt <= Date.now());

  return (
    <div style={{
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif',
      color: '#1a1a1a',
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
        🔐 Proof Cache Manager
      </h2>

      {message && (
        <div style={{
          padding: '8px 12px',
          background: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          {message}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}>
          {[
            { label: 'Total Entries', value: stats.entryCount },
            { label: 'Active', value: stats.entryCount - stats.expiredEntries },
            { label: 'Expired', value: stats.expiredEntries },
            { label: 'Size', value: formatBytes(stats.totalSizeBytes) },
            { label: 'Oldest', value: formatDate(stats.oldestEntry) },
            { label: 'Newest', value: formatDate(stats.newestEntry) },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => void loadStats()}
          disabled={loading}
          style={btnStyle('#f3f4f6', '#374151')}
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => void handlePrune()}
          disabled={loading}
          style={btnStyle('#fef3c7', '#92400e')}
        >
          🧹 Prune Expired
        </button>
        <button
          onClick={() => void handleClearAll()}
          disabled={loading}
          style={btnStyle('#fee2e2', '#991b1b')}
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Privacy Note */}
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '20px',
        padding: '8px 12px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '6px',
      }}>
        🔒 <strong>Privacy Note:</strong> Cache keys are Poseidon hashes of proof inputs —
        no raw private data is stored in the browser cache.
      </div>

      {/* Active Entries */}
      {activeEntries.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            Active Entries ({activeEntries.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Cache Key (Poseidon Hash)</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Expires In</th>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeEntries.map(entry => (
                <tr key={entry.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle} title={entry.key}>{shortKey(entry.key)}</td>
                  <td style={tdStyle}>{formatDate(entry.createdAt)}</td>
                  <td style={tdStyle}>{timeUntil(entry.expiresAt)}</td>
                  <td style={tdStyle}>{formatBytes(entry.size)}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => void handleInvalidateEntry(entry.key)}
                      style={{ ...btnStyle('#fee2e2', '#991b1b'), fontSize: '12px', padding: '4px 8px' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Expired Entries */}
      {expiredEntriesList.length > 0 && (
        <>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            Expired Entries ({expiredEntriesList.length}) — Prune to remove
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', opacity: 0.6 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Cache Key</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Expired At</th>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {expiredEntriesList.map(entry => (
                <tr key={entry.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle} title={entry.key}>{shortKey(entry.key)}</td>
                  <td style={tdStyle}>{formatDate(entry.createdAt)}</td>
                  <td style={tdStyle}>{formatDate(entry.expiresAt)}</td>
                  <td style={tdStyle}>{formatBytes(entry.size)}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => void handleInvalidateEntry(entry.key)}
                      style={{ ...btnStyle('#fee2e2', '#991b1b'), fontSize: '12px', padding: '4px 8px' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {entries.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          No cache entries. Proofs you generate will appear here.
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  border: '1px solid transparent',
  borderRadius: '6px',
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
});

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px',
  fontWeight: 600,
  color: '#374151',
};

const tdStyle: React.CSSProperties = {
  padding: '8px',
  verticalAlign: 'middle',
};
