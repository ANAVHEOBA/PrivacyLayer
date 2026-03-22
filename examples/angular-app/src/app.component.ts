// ============================================================
// PrivacyLayer Angular Example — Main Component
// ============================================================
// Demonstrates a complete Angular integration with PrivacyLayer:
// - Service injection with RxJS Observables
// - Pool state monitoring with async pipe
// - Deposit and withdrawal flows
// - Event log with real-time updates
// ============================================================

import { Component, OnInit } from "@angular/core";
import { CommonModule, AsyncPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable } from "rxjs";
import { PrivacyLayerService, OperationState } from "./privacy-layer.service";
import {
  Note,
  PoolState,
  PrivacyLayerEvent,
  Denomination,
  DENOMINATION_AMOUNTS,
} from "../../shared/privacy-layer-client";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule],
  template: `
    <div class="app">
      <header>
        <h1>PrivacyLayer</h1>
        <p>Shielded transactions on Stellar/Soroban</p>
        <span class="network-badge">TESTNET</span>
      </header>

      <!-- Error Banner -->
      <div
        *ngIf="(operationState$ | async)?.error as err"
        class="error-banner"
        role="alert"
      >
        <p>{{ err }}</p>
        <button (click)="clearError()">Dismiss</button>
      </div>

      <main>
        <!-- Pool Status -->
        <section class="pool-status">
          <h2>Pool Status</h2>
          <ng-container *ngIf="poolState$ | async as state; else loadingState">
            <table>
              <tr>
                <td>Deposits:</td>
                <td>{{ state.depositCount }}</td>
              </tr>
              <tr>
                <td>Denomination:</td>
                <td>{{ getDenominationLabel(state.config.denomination) }}</td>
              </tr>
              <tr>
                <td>Paused:</td>
                <td>{{ state.config.paused ? 'Yes' : 'No' }}</td>
              </tr>
              <tr>
                <td>Current Root:</td>
                <td [title]="state.currentRoot">
                  {{ state.currentRoot.slice(0, 16) }}...
                </td>
              </tr>
            </table>
          </ng-container>
          <ng-template #loadingState>
            <p>Loading pool state...</p>
          </ng-template>
          <button
            (click)="refreshState()"
            [disabled]="(operationState$ | async)?.loading"
          >
            {{ (operationState$ | async)?.loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </section>

        <!-- Deposit Panel -->
        <section class="deposit-panel">
          <h2>Deposit</h2>
          <p>
            Select a denomination and deposit into the shielded pool.
            A note will be generated that you must save securely.
          </p>

          <label for="denomination">Denomination:</label>
          <select id="denomination" [(ngModel)]="selectedDenomination">
            <option
              *ngFor="let denom of denominationOptions"
              [value]="denom.key"
            >
              {{ denom.label }}
            </option>
          </select>

          <button
            (click)="handleDeposit()"
            [disabled]="(operationState$ | async)?.loading"
          >
            {{
              (operationState$ | async)?.loading
                ? 'Processing...'
                : 'Generate Note & Deposit'
            }}
          </button>
        </section>

        <!-- Note Backup -->
        <section
          *ngIf="currentNote$ | async as note"
          class="note-backup"
          role="alert"
        >
          <h3>Save Your Note!</h3>
          <p>
            <strong>WARNING:</strong> This note is the ONLY way to withdraw
            your funds. If you lose it, your deposit is permanently locked.
          </p>
          <div class="note-details">
            <p>Denomination: {{ getDenominationLabel(note.denomination) }}</p>
            <p>Commitment: {{ note.commitment.slice(0, 16) }}...</p>
            <p *ngIf="note.leafIndex !== undefined">
              Leaf Index: {{ note.leafIndex }}
            </p>
          </div>
          <div *ngIf="noteBackupStr" class="backup-string">
            <code>{{ noteBackupStr }}</code>
            <button (click)="copyBackup()">
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
        </section>

        <!-- Withdraw Panel -->
        <section class="withdraw-panel">
          <h2>Withdraw</h2>
          <p>
            Paste your note backup string and specify a recipient address.
            A ZK proof will be generated to authorize the withdrawal.
          </p>

          <label for="note-input">Note Backup:</label>
          <textarea
            id="note-input"
            [(ngModel)]="withdrawNoteStr"
            placeholder="privacylayer-note-v1:..."
            rows="3"
          ></textarea>

          <label for="recipient-input">Recipient Address:</label>
          <input
            id="recipient-input"
            type="text"
            [(ngModel)]="withdrawRecipient"
            placeholder="G..."
          />

          <button
            (click)="handleWithdraw()"
            [disabled]="
              (operationState$ | async)?.loading ||
              !withdrawNoteStr ||
              !withdrawRecipient
            "
          >
            {{
              (operationState$ | async)?.loading
                ? 'Generating Proof...'
                : 'Withdraw with ZK Proof'
            }}
          </button>
        </section>

        <!-- Event Log -->
        <section class="event-log">
          <h2>Event Log</h2>
          <ng-container *ngIf="events$ | async as events">
            <p *ngIf="events.length === 0">
              No events yet. Events will appear here as they occur.
            </p>
            <ul *ngIf="events.length > 0">
              <li *ngFor="let event of getRecentEvents(events); let i = index">
                <span [class]="'event-type event-' + event.type">
                  {{ event.type | uppercase }}
                </span>
                <span class="event-ledger">Ledger #{{ event.ledger }}</span>
              </li>
            </ul>
          </ng-container>
        </section>
      </main>

      <footer>
        <p>
          PrivacyLayer Angular Example — MIT License |
          <a href="https://github.com/ANAVHEOBA/PrivacyLayer">GitHub</a>
        </p>
      </footer>
    </div>
  `,
  styles: [`
    .pool-status, .deposit-panel, .withdraw-panel, .note-backup, .event-log {
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid #333;
      border-radius: 8px;
    }
    .error-banner {
      background: #ff4444;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .note-backup {
      background: #2a1a00;
      border-color: #ff8800;
    }
    .backup-string {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .backup-string code {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0.5rem;
      background: #111;
      border-radius: 4px;
    }
    .network-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #4444ff;
      color: white;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .event-type {
      font-weight: bold;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
    }
    .event-deposit { background: #004400; color: white; }
    .event-withdraw { background: #440044; color: white; }
    .event-pause { background: #444400; color: white; }
  `],
})
export class AppComponent implements OnInit {
  // ── Observables ────────────────────────────────────────────

  poolState$: Observable<PoolState | null>;
  events$: Observable<PrivacyLayerEvent[]>;
  operationState$: Observable<OperationState>;
  currentNote$: Observable<Note | null>;

  // ── Local State ────────────────────────────────────────────

  selectedDenomination: Denomination = Denomination.Xlm10;
  noteBackupStr = "";
  copied = false;
  withdrawNoteStr = "";
  withdrawRecipient = "";

  denominationOptions = Object.entries(DENOMINATION_AMOUNTS).map(
    ([key, label]) => ({ key: key as Denomination, label })
  );

  // ── Constructor ────────────────────────────────────────────

  constructor(private readonly plService: PrivacyLayerService) {
    this.poolState$ = this.plService.poolState$;
    this.events$ = this.plService.events$;
    this.operationState$ = this.plService.operationState$;
    this.currentNote$ = this.plService.currentNote$;
  }

  ngOnInit(): void {
    // Initialize with your contract ID
    this.plService.initialize({
      contractId: "YOUR_CONTRACT_ID_HERE",
      network: "testnet",
      pollIntervalMs: 10000,
    });
  }

  // ── Handlers ───────────────────────────────────────────────

  handleDeposit(): void {
    this.plService.createNote(this.selectedDenomination).subscribe({
      next: (note) => {
        this.noteBackupStr = this.plService.backupNote(note);
        this.plService.deposit(note).subscribe({
          next: (result) => {
            console.log("Deposit successful! Leaf index:", result.leafIndex);
          },
          error: (err) => {
            console.error("Deposit failed:", err);
          },
        });
      },
      error: (err) => {
        console.error("Note generation failed:", err);
      },
    });
  }

  handleWithdraw(): void {
    this.plService
      .withdraw(this.withdrawNoteStr.trim(), this.withdrawRecipient)
      .subscribe({
        next: (success) => {
          if (success) {
            console.log("Withdrawal successful!");
            this.withdrawNoteStr = "";
            this.withdrawRecipient = "";
            this.noteBackupStr = "";
          }
        },
        error: (err) => {
          console.error("Withdrawal failed:", err);
        },
      });
  }

  refreshState(): void {
    this.plService.refreshState();
  }

  clearError(): void {
    this.plService.clearError();
  }

  async copyBackup(): Promise<void> {
    await navigator.clipboard.writeText(this.noteBackupStr);
    this.copied = true;
    setTimeout(() => (this.copied = false), 2000);
  }

  getDenominationLabel(denom: Denomination): string {
    return DENOMINATION_AMOUNTS[denom] || denom;
  }

  getRecentEvents(events: PrivacyLayerEvent[]): PrivacyLayerEvent[] {
    return [...events].slice(-10).reverse();
  }
}
