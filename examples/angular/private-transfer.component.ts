/**
 * PrivateTransferComponent — Angular standalone component for PrivacyLayer.
 * Uses signals and async pipe for reactive state management.
 */
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PrivateNote {
  amount: number;
  commitment: string;
  nullifier: string;
  secret: Uint8Array;
  depositTx?: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

@Component({
  selector: 'app-private-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="privacy-transfer">
      <h2>🔐 Private Transfer</h2>

      <!-- Error -->
      <div *ngIf="error()" class="alert alert-error">
        {{ error() }}
        <button (click)="error.set(null)">✕</button>
      </div>

      <!-- Success -->
      <div *ngIf="lastTx()" class="alert alert-success">
        Last tx: <code>{{ lastTx() }}</code>
      </div>

      <!-- Deposit -->
      <fieldset>
        <legend><strong>Deposit</strong></legend>
        <p class="hint">Send funds into the privacy pool.</p>
        <div class="row">
          <input
            type="number"
            placeholder="Amount (SOL)"
            [(ngModel)]="depositAmount"
            [disabled]="loading()"
          />
          <button (click)="handleDeposit()" [disabled]="loading() || !depositAmount">
            {{ loading() ? 'Processing…' : 'Deposit' }}
          </button>
        </div>
      </fieldset>

      <!-- Notes -->
      <fieldset *ngIf="notes().length > 0">
        <legend><strong>Your Notes ({{ notes().length }})</strong></legend>
        <div
          *ngFor="let note of notes()"
          class="note-card"
          [class.selected]="selectedNote()?.commitment === note.commitment"
          (click)="selectedNote.set(note)"
        >
          <strong>{{ (note.amount / 1_000_000_000).toFixed(2) }} SOL</strong>
          <br />
          <code>{{ note.commitment }}</code>
        </div>
      </fieldset>

      <!-- Withdraw -->
      <fieldset *ngIf="selectedNote()">
        <legend><strong>Withdraw</strong></legend>
        <p class="hint">
          Withdraw {{ (selectedNote()!.amount / 1_000_000_000).toFixed(2) }} SOL privately.
        </p>
        <div class="row">
          <input
            type="text"
            placeholder="Recipient wallet address"
            [(ngModel)]="recipient"
            [disabled]="loading()"
          />
          <button
            (click)="handleWithdraw()"
            [disabled]="loading() || !recipient"
            class="btn-withdraw"
          >
            {{ loading() ? 'Proving…' : 'Withdraw' }}
          </button>
        </div>
      </fieldset>
    </div>
  `,
  styles: [`
    .privacy-transfer { max-width: 480px; margin: 0 auto; font-family: system-ui; }
    fieldset { border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .hint { font-size: 14px; color: #666; }
    .row { display: flex; gap: 8px; }
    input { flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
    button { padding: 8px 16px; border-radius: 4px; background: #7c3aed; color: #fff; border: none; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-withdraw { background: #059669; }
    .note-card { padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 8px; cursor: pointer; }
    .note-card.selected { border: 2px solid #7c3aed; }
    .note-card code { font-size: 12px; color: #888; }
    .alert { padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .alert-error { color: #dc2626; background: #fef2f2; }
    .alert-success { color: #16a34a; background: #f0fdf4; }
  `],
})
export class PrivateTransferComponent {
  loading = signal(false);
  error = signal<string | null>(null);
  lastTx = signal<string | null>(null);
  notes = signal<PrivateNote[]>([]);
  selectedNote = signal<PrivateNote | null>(null);

  depositAmount = 0;
  recipient = '';

  async handleDeposit(): Promise<void> {
    if (!this.depositAmount || this.depositAmount <= 0) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const amount = this.depositAmount * 1_000_000_000;
      const secret = crypto.getRandomValues(new Uint8Array(32));
      const nullifierBytes = crypto.getRandomValues(new Uint8Array(32));

      const commitment = `0x${toHex(secret).slice(0, 16)}`;
      const nullifier = `0x${toHex(nullifierBytes).slice(0, 16)}`;

      const tx = `sim_deposit_${Date.now()}`;

      this.notes.update((prev) => [...prev, { amount, commitment, nullifier, secret, depositTx: tx }]);
      this.lastTx.set(tx);
      this.depositAmount = 0;
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      this.loading.set(false);
    }
  }

  async handleWithdraw(): Promise<void> {
    const note = this.selectedNote();
    if (!note || !this.recipient) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const tx = `sim_withdraw_${Date.now()}`;

      this.notes.update((prev) => prev.filter((n) => n.commitment !== note.commitment));
      this.lastTx.set(tx);
      this.selectedNote.set(null);
      this.recipient = '';
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      this.loading.set(false);
    }
  }
}
