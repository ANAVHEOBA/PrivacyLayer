/**
 * PrivateTransfer — React component for making private transfers via PrivacyLayer.
 *
 * Usage:
 *   <PrivateTransfer programId="YourProgramId..." />
 */
import React, { useState } from 'react';
import { usePrivacyPool, type PrivateNote } from './usePrivacyPool';

interface Props {
  programId?: string;
}

export function PrivateTransfer({ programId }: Props) {
  const { loading, error, lastTx, notes, deposit, withdraw, clearError } = usePrivacyPool(programId);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedNote, setSelectedNote] = useState<PrivateNote | null>(null);

  const handleDeposit = async () => {
    const lamports = parseFloat(amount) * 1_000_000_000;
    if (isNaN(lamports) || lamports <= 0) return;
    await deposit(lamports);
    setAmount('');
  };

  const handleWithdraw = async () => {
    if (!selectedNote || !recipient) return;
    await withdraw(selectedNote, recipient);
    setSelectedNote(null);
    setRecipient('');
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h2>🔐 Private Transfer</h2>

      {error && (
        <div style={{ color: '#dc2626', background: '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
          <button onClick={clearError} style={{ marginLeft: 8, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {lastTx && (
        <div style={{ color: '#16a34a', background: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          Last tx: <code>{lastTx}</code>
        </div>
      )}

      {/* Deposit Section */}
      <fieldset style={{ borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <legend><strong>Deposit</strong></legend>
        <p style={{ fontSize: 14, color: '#666' }}>Send funds into the privacy pool. You'll receive a secret note.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            placeholder="Amount (SOL)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <button
            onClick={handleDeposit}
            disabled={loading || !amount}
            style={{ padding: '8px 16px', borderRadius: 4, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {loading ? 'Processing…' : 'Deposit'}
          </button>
        </div>
      </fieldset>

      {/* Notes */}
      {notes.length > 0 && (
        <fieldset style={{ borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <legend><strong>Your Notes ({notes.length})</strong></legend>
          <p style={{ fontSize: 14, color: '#666' }}>Select a note to withdraw privately.</p>
          {notes.map((note) => (
            <div
              key={note.commitment}
              onClick={() => setSelectedNote(note)}
              style={{
                padding: 12,
                borderRadius: 8,
                border: selectedNote?.commitment === note.commitment ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                marginBottom: 8,
                cursor: 'pointer',
              }}
            >
              <strong>{(note.amount / 1_000_000_000).toFixed(2)} SOL</strong>
              <br />
              <code style={{ fontSize: 12, color: '#888' }}>{note.commitment}</code>
            </div>
          ))}
        </fieldset>
      )}

      {/* Withdraw Section */}
      {selectedNote && (
        <fieldset style={{ borderRadius: 8, padding: 16 }}>
          <legend><strong>Withdraw</strong></legend>
          <p style={{ fontSize: 14, color: '#666' }}>
            Withdraw {(selectedNote.amount / 1_000_000_000).toFixed(2)} SOL to a new address.
            A ZK proof will break the link between your deposit and this withdrawal.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Recipient wallet address"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={loading}
              style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
            <button
              onClick={handleWithdraw}
              disabled={loading || !recipient}
              style={{ padding: '8px 16px', borderRadius: 4, background: '#059669', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              {loading ? 'Proving…' : 'Withdraw'}
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}

export default PrivateTransfer;
