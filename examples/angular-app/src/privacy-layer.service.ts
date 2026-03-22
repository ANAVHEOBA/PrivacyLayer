// ============================================================
// Angular Service: PrivacyLayerService
// ============================================================
// Injectable Angular service for interacting with PrivacyLayer.
// Uses RxJS Observables for reactive state management.
//
// Usage:
//   @Component({ ... })
//   export class AppComponent {
//     constructor(private pl: PrivacyLayerService) {
//       pl.initialize({ contractId: "CABC123...", network: "testnet" });
//     }
//
//     poolState$ = this.pl.poolState$;
//     events$ = this.pl.events$;
//   }
// ============================================================

import { Injectable, OnDestroy } from "@angular/core";
import {
  BehaviorSubject,
  Observable,
  Subject,
  interval,
  takeUntil,
  switchMap,
  catchError,
  of,
  from,
  tap,
} from "rxjs";
import {
  PrivacyLayerClient,
  ClientConfig,
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  Note,
  PoolState,
  PrivacyLayerEvent,
  Denomination,
  generateNote,
  serializeNote,
  deserializeNote,
  PrivacyLayerError,
  DENOMINATION_AMOUNTS,
} from "../../shared/privacy-layer-client";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ServiceConfig {
  contractId: string;
  network: "testnet" | "mainnet";
  rpcUrl?: string;
  pollIntervalMs?: number;
}

export interface OperationState {
  loading: boolean;
  error: string | null;
}

// ──────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────

@Injectable({ providedIn: "root" })
export class PrivacyLayerService implements OnDestroy {
  // ── Subjects (internal) ──────────────────────────────────

  private readonly _poolState = new BehaviorSubject<PoolState | null>(null);
  private readonly _events = new BehaviorSubject<PrivacyLayerEvent[]>([]);
  private readonly _operationState = new BehaviorSubject<OperationState>({
    loading: false,
    error: null,
  });
  private readonly _currentNote = new BehaviorSubject<Note | null>(null);
  private readonly destroy$ = new Subject<void>();

  // ── Observables (public) ─────────────────────────────────

  /** Current pool state (null until first fetch) */
  readonly poolState$: Observable<PoolState | null> = this._poolState.asObservable();

  /** All contract events received since initialization */
  readonly events$: Observable<PrivacyLayerEvent[]> = this._events.asObservable();

  /** Loading and error state for UI binding */
  readonly operationState$: Observable<OperationState> = this._operationState.asObservable();

  /** The currently active note (null if none) */
  readonly currentNote$: Observable<Note | null> = this._currentNote.asObservable();

  // ── Internal State ───────────────────────────────────────

  private client: PrivacyLayerClient | null = null;
  private stopEventSub: (() => void) | null = null;

  // ── Lifecycle ────────────────────────────────────────────

  /**
   * Initialize the service with contract configuration.
   * Must be called once before any operations.
   *
   * @param config - Contract and network configuration
   */
  initialize(config: ServiceConfig): void {
    const networkConfig = config.network === "mainnet" ? MAINNET_CONFIG : TESTNET_CONFIG;
    const clientConfig: ClientConfig = {
      ...networkConfig,
      contractId: config.contractId,
      rpcUrl: config.rpcUrl || networkConfig.rpcUrl!,
      networkPassphrase: networkConfig.networkPassphrase!,
    };

    this.client = new PrivacyLayerClient(clientConfig);

    // Subscribe to contract events
    this.stopEventSub = this.client.subscribeToEvents((event) => {
      const current = this._events.getValue();
      this._events.next([...current.slice(-99), event]);
    });

    // Initial state fetch
    this.refreshState();

    // Start polling if configured
    const pollMs = config.pollIntervalMs || 10000;
    if (pollMs > 0) {
      interval(pollMs)
        .pipe(
          takeUntil(this.destroy$),
          switchMap(() => from(this.fetchPoolState())),
          catchError((err) => {
            console.error("[PrivacyLayer] Poll error:", err);
            return of(null);
          })
        )
        .subscribe((state) => {
          if (state) this._poolState.next(state);
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopEventSub?.();
  }

  // ── Operations ───────────────────────────────────────────

  /**
   * Generate a new deposit note.
   *
   * @param denomination - Pool denomination for this deposit
   * @returns Observable that emits the generated Note
   */
  createNote(denomination: Denomination): Observable<Note> {
    return from(generateNote(denomination)).pipe(
      tap((note) => this._currentNote.next(note)),
      catchError((err) => {
        this.setError(`Note generation failed: ${err.message}`);
        throw err;
      })
    );
  }

  /**
   * Execute a deposit into the shielded pool.
   *
   * In a production app, this would integrate with a wallet service
   * (e.g., Freighter) for transaction signing.
   *
   * @param note - The deposit note
   * @returns Observable with deposit result
   */
  deposit(note: Note): Observable<{ leafIndex: number; root: string }> {
    this.setLoading(true);

    return new Observable((subscriber) => {
      // Production integration with Freighter wallet:
      //
      // 1. Get public key from Freighter
      // 2. Build transaction via client.deposit()
      // 3. Sign with Freighter
      // 4. Submit and wait for confirmation
      // 5. Update note with leaf index
      //
      // Example:
      //   const { publicKey } = await freighter.getAddress();
      //   const result = await this.client.deposit(keypair, note);
      //   note.leafIndex = result.leafIndex;
      //   this._currentNote.next(note);
      //   this.refreshState();

      subscriber.error(new Error(
        "Deposit requires Freighter wallet integration. " +
        "See the Angular example README for setup instructions."
      ));
      this.setLoading(false);
    });
  }

  /**
   * Withdraw from the shielded pool using a ZK proof.
   *
   * @param noteStr - Serialized note backup string
   * @param recipient - Stellar address of the withdrawal recipient
   * @returns Observable that emits true on success
   */
  withdraw(noteStr: string, recipient: string): Observable<boolean> {
    this.setLoading(true);

    return from(this.executeWithdraw(noteStr, recipient)).pipe(
      tap((success) => {
        if (success) {
          this._currentNote.next(null);
          this.refreshState();
        }
        this.setLoading(false);
      }),
      catchError((err) => {
        this.setError(
          err instanceof PrivacyLayerError
            ? `Contract error [${err.code}]: ${err.message}`
            : err.message
        );
        this.setLoading(false);
        throw err;
      })
    );
  }

  /**
   * Check if a nullifier has been spent.
   *
   * @param nullifierHash - Hex-encoded nullifier hash
   * @returns Observable that emits true if spent
   */
  checkNullifier(nullifierHash: string): Observable<boolean> {
    if (!this.client) throw new Error("Service not initialized");
    return from(this.client.isSpent(nullifierHash));
  }

  /**
   * Manually refresh the pool state.
   */
  refreshState(): void {
    this.fetchPoolState()
      .then((state) => this._poolState.next(state))
      .catch((err) => console.error("[PrivacyLayer] Refresh error:", err));
  }

  /**
   * Serialize a note for secure backup.
   */
  backupNote(note: Note): string {
    return serializeNote(note);
  }

  /**
   * Restore a note from its serialized form.
   */
  restoreNote(serialized: string): Observable<Note> {
    return from(deserializeNote(serialized));
  }

  /**
   * Clear the current error state.
   */
  clearError(): void {
    const current = this._operationState.getValue();
    this._operationState.next({ ...current, error: null });
  }

  /**
   * Get available denominations.
   */
  getDenominations(): Record<Denomination, string> {
    return DENOMINATION_AMOUNTS;
  }

  // ── Private Helpers ──────────────────────────────────────

  private async fetchPoolState(): Promise<PoolState> {
    if (!this.client) throw new Error("Service not initialized");
    return this.client.getPoolState();
  }

  private async executeWithdraw(noteStr: string, recipient: string): Promise<boolean> {
    if (!this.client) throw new Error("Service not initialized");
    const note = await deserializeNote(noteStr);
    return this.client.withdraw({ note, recipient });
  }

  private setLoading(loading: boolean): void {
    const current = this._operationState.getValue();
    this._operationState.next({ ...current, loading });
  }

  private setError(error: string): void {
    this._operationState.next({ loading: false, error });
  }
}
