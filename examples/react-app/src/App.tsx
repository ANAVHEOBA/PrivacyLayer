// ============================================================
// PrivacyLayer React Example — Main Application
// ============================================================
// Demonstrates a complete React integration with PrivacyLayer:
// - Wallet connection (Freighter)
// - Note generation and secure backup
// - Shielded deposits
// - ZK-proof withdrawals
// - Real-time pool state monitoring
// ============================================================

import React, { useState } from "react";
import { usePrivacyLayer } from "./hooks/usePrivacyLayer";
import {
  Note,
  Denomination,
  DENOMINATION_AMOUNTS,
} from "../shared/privacy-layer-client";

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

const CONTRACT_ID = process.env.REACT_APP_CONTRACT_ID || "YOUR_CONTRACT_ID_HERE";
const NETWORK = (process.env.REACT_APP_NETWORK as "testnet" | "mainnet") || "testnet";

// ──────────────────────────────────────────────────────────────
// Components
// ──────────────────────────────────────────────────────────────

/** Pool status display panel */
function PoolStatus({ poolState, onRefresh, loading }: {
  poolState: ReturnType<typeof usePrivacyLayer>["poolState"];
  onRefresh: () => void;
  loading: boolean;
}) {
  if (!poolState) {
    return (
      <div className="pool-status">
        <h2>Pool Status</h2>
        <p>Loading pool state...</p>
        <button onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="pool-status">
      <h2>Pool Status</h2>
      <table>
        <tbody>
          <tr>
            <td>Deposits:</td>
            <td>{poolState.depositCount}</td>
          </tr>
          <tr>
            <td>Denomination:</td>
            <td>{DENOMINATION_AMOUNTS[poolState.config.denomination]}</td>
          </tr>
          <tr>
            <td>Paused:</td>
            <td>{poolState.config.paused ? "Yes" : "No"}</td>
          </tr>
          <tr>
            <td>Current Root:</td>
            <td title={poolState.currentRoot}>
              {poolState.currentRoot.slice(0, 16)}...
            </td>
          </tr>
        </tbody>
      </table>
      <button onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}

/** Deposit form */
function DepositPanel({ onDeposit, loading }: {
  onDeposit: (denomination: Denomination) => void;
  loading: boolean;
}) {
  const [denomination, setDenomination] = useState<Denomination>(Denomination.Xlm10);

  return (
    <div className="deposit-panel">
      <h2>Deposit</h2>
      <p>
        Select a denomination and deposit into the shielded pool.
        A note will be generated that you must save securely.
      </p>

      <label htmlFor="denomination">Denomination:</label>
      <select
        id="denomination"
        value={denomination}
        onChange={(e) => setDenomination(e.target.value as Denomination)}
      >
        {Object.entries(DENOMINATION_AMOUNTS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <button
        onClick={() => onDeposit(denomination)}
        disabled={loading}
      >
        {loading ? "Processing..." : "Generate Note & Deposit"}
      </button>
    </div>
  );
}

/** Withdrawal form */
function WithdrawPanel({ onWithdraw, loading }: {
  onWithdraw: (noteStr: string, recipient: string) => void;
  loading: boolean;
}) {
  const [noteStr, setNoteStr] = useState("");
  const [recipient, setRecipient] = useState("");

  return (
    <div className="withdraw-panel">
      <h2>Withdraw</h2>
      <p>
        Paste your note backup string and specify a recipient address.
        A ZK proof will be generated to authorize the withdrawal.
      </p>

      <label htmlFor="note-input">Note Backup:</label>
      <textarea
        id="note-input"
        value={noteStr}
        onChange={(e) => setNoteStr(e.target.value)}
        placeholder="privacylayer-note-v1:..."
        rows={3}
      />

      <label htmlFor="recipient-input">Recipient Address:</label>
      <input
        id="recipient-input"
        type="text"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="G..."
      />

      <button
        onClick={() => onWithdraw(noteStr, recipient)}
        disabled={loading || !noteStr || !recipient}
      >
        {loading ? "Generating Proof..." : "Withdraw with ZK Proof"}
      </button>
    </div>
  );
}

/** Note backup display */
function NoteBackup({ note, backupStr }: {
  note: Note;
  backupStr: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(backupStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="note-backup" role="alert">
      <h3>Save Your Note!</h3>
      <p>
        <strong>WARNING:</strong> This note is the ONLY way to withdraw your funds.
        If you lose it, your deposit is permanently locked.
      </p>

      <div className="note-details">
        <p>Denomination: {DENOMINATION_AMOUNTS[note.denomination]}</p>
        <p>Commitment: {note.commitment.slice(0, 16)}...</p>
        {note.leafIndex !== undefined && <p>Leaf Index: {note.leafIndex}</p>}
      </div>

      <div className="backup-string">
        <code>{backupStr}</code>
        <button onClick={copyToClipboard}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/** Event log display */
function EventLog({ events }: {
  events: ReturnType<typeof usePrivacyLayer>["events"];
}) {
  if (events.length === 0) {
    return (
      <div className="event-log">
        <h2>Event Log</h2>
        <p>No events yet. Events will appear here as they occur.</p>
      </div>
    );
  }

  return (
    <div className="event-log">
      <h2>Event Log</h2>
      <ul>
        {events.slice(-10).reverse().map((event, i) => (
          <li key={`${event.ledger}-${i}`}>
            <span className={`event-type event-${event.type}`}>
              {event.type.toUpperCase()}
            </span>
            {" "}
            <span className="event-ledger">Ledger #{event.ledger}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main App
// ──────────────────────────────────────────────────────────────

export default function App() {
  const {
    poolState,
    events,
    loading,
    error,
    createNote,
    deposit,
    withdraw,
    refreshState,
    backupNote,
    restoreNote,
    clearError,
  } = usePrivacyLayer({
    contractId: CONTRACT_ID,
    network: NETWORK,
    pollInterval: 10000, // Poll every 10 seconds
  });

  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [currentBackup, setCurrentBackup] = useState<string>("");

  const handleDeposit = async (denomination: Denomination) => {
    try {
      // Step 1: Generate the note
      const note = await createNote(denomination);

      // Step 2: Create backup BEFORE depositing (critical for fund safety)
      const backup = backupNote(note);
      setCurrentNote(note);
      setCurrentBackup(backup);

      // Step 3: Execute the deposit
      const result = await deposit(note);
      note.leafIndex = result.leafIndex;
      setCurrentNote({ ...note });

      console.log("Deposit successful! Leaf index:", result.leafIndex);
    } catch (err) {
      console.error("Deposit failed:", err);
    }
  };

  const handleWithdraw = async (noteStr: string, recipient: string) => {
    try {
      const note = await restoreNote(noteStr.trim());
      const success = await withdraw(note, recipient);

      if (success) {
        console.log("Withdrawal successful! Funds sent to:", recipient);
        setCurrentNote(null);
        setCurrentBackup("");
      }
    } catch (err) {
      console.error("Withdrawal failed:", err);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>PrivacyLayer</h1>
        <p>Shielded transactions on Stellar/Soroban</p>
        <p className="network-badge">
          Network: {NETWORK.toUpperCase()}
        </p>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <p>{error}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}

      <main>
        <PoolStatus
          poolState={poolState}
          onRefresh={refreshState}
          loading={loading}
        />

        <DepositPanel
          onDeposit={handleDeposit}
          loading={loading}
        />

        {currentNote && (
          <NoteBackup
            note={currentNote}
            backupStr={currentBackup}
          />
        )}

        <WithdrawPanel
          onWithdraw={handleWithdraw}
          loading={loading}
        />

        <EventLog events={events} />
      </main>

      <footer>
        <p>
          PrivacyLayer React Example — MIT License
          {" | "}
          <a href="https://github.com/ANAVHEOBA/PrivacyLayer">GitHub</a>
        </p>
      </footer>
    </div>
  );
}
