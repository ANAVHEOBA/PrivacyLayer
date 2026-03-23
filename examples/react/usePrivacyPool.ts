/**
 * usePrivacyPool — React hook for PrivacyLayer privacy pool operations.
 *
 * Provides deposit, withdraw, and proof generation with loading/error states.
 */
import { useState, useCallback } from 'react';

/** A private note representing a deposit in the privacy pool. */
export interface PrivateNote {
  amount: number;
  commitment: string;
  nullifier: string;
  secret: Uint8Array;
  depositTx?: string;
}

interface PoolState {
  loading: boolean;
  error: string | null;
  lastTx: string | null;
  notes: PrivateNote[];
}

/** Convert bytes to hex string. */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a cryptographic commitment for a deposit. */
function createCommitment(amount: number): { commitment: string; nullifier: string; secret: Uint8Array } {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const nullifierBytes = crypto.getRandomValues(new Uint8Array(32));
  // In production: use Pedersen hash from Noir circuit
  const commitment = `0x${toHex(secret).slice(0, 16)}`;
  const nullifier = `0x${toHex(nullifierBytes).slice(0, 16)}`;
  return { commitment, nullifier, secret };
}

export function usePrivacyPool(programId?: string) {
  const [state, setState] = useState<PoolState>({
    loading: false,
    error: null,
    lastTx: null,
    notes: [],
  });

  /**
   * Deposit funds into the privacy pool.
   * Creates a secret note and submits the commitment on-chain.
   */
  const deposit = useCallback(async (amount: number): Promise<PrivateNote | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const { commitment, nullifier, secret } = createCommitment(amount);

      // In production: submit deposit transaction to Solana program
      // const tx = await program.methods.deposit(commitment, amount).rpc();
      const tx = `sim_deposit_${Date.now()}`;

      const note: PrivateNote = { amount, commitment, nullifier, secret, depositTx: tx };
      setState((s) => ({
        ...s,
        loading: false,
        lastTx: tx,
        notes: [...s.notes, note],
      }));

      return note;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deposit failed';
      setState((s) => ({ ...s, loading: false, error: message }));
      return null;
    }
  }, []);

  /**
   * Withdraw funds using a ZK proof.
   * The proof demonstrates note ownership without revealing which note.
   */
  const withdraw = useCallback(async (note: PrivateNote, recipient: string): Promise<string | null> => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // In production:
      // 1. Fetch current Merkle root from on-chain
      // 2. Generate Noir proof with private inputs (secret, nullifier, Merkle path)
      // 3. Submit withdraw transaction with proof
      // const proof = await noir.generateProof(circuit, { secret: note.secret, ... });
      // const tx = await program.methods.withdraw(proof, nullifierHash, recipient, amount).rpc();
      const tx = `sim_withdraw_${Date.now()}`;

      setState((s) => ({
        ...s,
        loading: false,
        lastTx: tx,
        notes: s.notes.filter((n) => n.commitment !== note.commitment),
      }));

      return tx;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Withdrawal failed';
      setState((s) => ({ ...s, loading: false, error: message }));
      return null;
    }
  }, []);

  /** Clear any error state. */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    ...state,
    deposit,
    withdraw,
    clearError,
  };
}
