// ============================================================
// PrivacyLayer SDK Client — Shared TypeScript Module
// ============================================================
// This module provides a unified TypeScript client for interacting
// with the PrivacyLayer Soroban smart contract. It is used by all
// framework integration examples (React, Vue, Angular, Node.js).
//
// In a production environment, this would be the published
// @privacylayer/sdk package. For these examples, we inline the
// client logic to demonstrate the contract interaction patterns.
// ============================================================

import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
} from "@stellar/stellar-sdk";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** Fixed denomination amounts supported by the pool */
export enum Denomination {
  Xlm10 = "Xlm10",
  Xlm100 = "Xlm100",
  Xlm1000 = "Xlm1000",
  Usdc100 = "Usdc100",
  Usdc1000 = "Usdc1000",
}

/** Maps denomination to human-readable amount */
export const DENOMINATION_AMOUNTS: Record<Denomination, string> = {
  [Denomination.Xlm10]: "10 XLM",
  [Denomination.Xlm100]: "100 XLM",
  [Denomination.Xlm1000]: "1,000 XLM",
  [Denomination.Usdc100]: "100 USDC",
  [Denomination.Usdc1000]: "1,000 USDC",
};

/** A deposit note — the user's secret receipt for later withdrawal */
export interface Note {
  /** Random nullifier (32 bytes hex) */
  nullifier: string;
  /** Random secret (32 bytes hex) */
  secret: string;
  /** Poseidon2(nullifier, secret) commitment (32 bytes hex) */
  commitment: string;
  /** Leaf index in the Merkle tree (assigned after deposit) */
  leafIndex?: number;
  /** Denomination of the deposit */
  denomination: Denomination;
  /** Timestamp of when the note was created */
  createdAt: number;
}

/** Pool configuration returned by get_config_view */
export interface PoolConfig {
  admin: string;
  token: string;
  denomination: Denomination;
  treeDepth: number;
  rootHistorySize: number;
  paused: boolean;
}

/** Deposit result from the contract */
export interface DepositResult {
  leafIndex: number;
  merkleRoot: string;
}

/** Withdrawal proof inputs */
export interface WithdrawParams {
  /** The note to withdraw */
  note: Note;
  /** Recipient Stellar address */
  recipient: string;
  /** Optional relayer address (for gas-less withdrawals) */
  relayer?: string;
  /** Optional relayer fee (in stroops/microunits) */
  fee?: number;
}

/** Groth16 proof structure */
export interface Groth16Proof {
  a: Buffer;
  b: Buffer;
  c: Buffer;
}

/** Public inputs for the withdrawal proof */
export interface PublicInputs {
  root: Buffer;
  nullifierHash: Buffer;
  recipient: Buffer;
  amount: Buffer;
  relayer: Buffer;
  fee: Buffer;
}

/** Pool state snapshot for monitoring */
export interface PoolState {
  depositCount: number;
  currentRoot: string;
  config: PoolConfig;
}

/** Event types emitted by the contract */
export type EventType = "deposit" | "withdraw" | "pause" | "unpause" | "vk_updated";

export interface PrivacyLayerEvent {
  type: EventType;
  ledger: number;
  timestamp: number;
  data: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────

/** Maps contract error codes to descriptive messages */
export const CONTRACT_ERRORS: Record<number, string> = {
  1: "Contract has already been initialized",
  2: "Contract has not been initialized yet",
  10: "Caller is not the admin",
  20: "Pool is paused — deposits and withdrawals blocked",
  21: "Merkle tree is full (max 1,048,576 deposits reached)",
  30: "Wrong deposit amount — must match pool denomination",
  31: "Commitment is the zero value (not allowed)",
  40: "The provided Merkle root is not in the root history",
  41: "This nullifier has already been spent (double-spend attempt)",
  42: "Groth16 proof verification failed",
  43: "Fee exceeds the withdrawal amount",
  44: "Relayer address is non-zero but fee is zero",
  45: "Recipient address is invalid",
  50: "Verifying key has not been set",
  51: "Verifying key is malformed",
  60: "Proof point A has wrong length",
  61: "Proof point B has wrong length",
  62: "Proof point C has wrong length",
  70: "BN254 point is not on curve",
  71: "BN254 pairing check failed",
};

export class PrivacyLayerError extends Error {
  constructor(
    public readonly code: number,
    message?: string
  ) {
    super(message || CONTRACT_ERRORS[code] || `Unknown contract error: ${code}`);
    this.name = "PrivacyLayerError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ProofGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "ProofGenerationError";
  }
}

// ──────────────────────────────────────────────────────────────
// Client Configuration
// ──────────────────────────────────────────────────────────────

export interface ClientConfig {
  /** Soroban RPC endpoint URL */
  rpcUrl: string;
  /** Network passphrase (e.g., Networks.TESTNET) */
  networkPassphrase: string;
  /** PrivacyLayer contract ID (C...) */
  contractId: string;
  /** Default transaction timeout in seconds */
  txTimeoutSec?: number;
}

/** Preset configurations for known networks */
export const TESTNET_CONFIG: Partial<ClientConfig> = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: Networks.TESTNET,
  txTimeoutSec: 30,
};

export const MAINNET_CONFIG: Partial<ClientConfig> = {
  rpcUrl: "https://soroban.stellar.org",
  networkPassphrase: Networks.PUBLIC,
  txTimeoutSec: 30,
};

// ──────────────────────────────────────────────────────────────
// Cryptographic Utilities
// ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random 32-byte hex string.
 * Uses Web Crypto API (browser) or Node.js crypto module.
 */
export function randomBytes32(): string {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    const buf = new Uint8Array(32);
    globalThis.crypto.getRandomValues(buf);
    return Buffer.from(buf).toString("hex");
  }
  // Node.js fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Compute Poseidon2 hash of two field elements.
 *
 * NOTE: In production, this would use a WASM module compiled from the
 * Noir circuit's Poseidon2 implementation to ensure hash compatibility
 * with the on-chain contract. For this example, we simulate the hash.
 *
 * @param left - First field element (hex string)
 * @param right - Second field element (hex string)
 * @returns Hash result as hex string
 */
export async function poseidon2Hash(left: string, right: string): Promise<string> {
  // PLACEHOLDER: In production, load the WASM Poseidon2 module
  // import { poseidon2 } from '@privacylayer/poseidon2-wasm';
  // return poseidon2([left, right]);

  // For demonstration, we use a simplified hash simulation.
  // DO NOT use this in production — it is not cryptographically correct.
  const crypto = typeof globalThis.crypto !== "undefined"
    ? globalThis.crypto
    : require("crypto").webcrypto;

  const data = new TextEncoder().encode(left + right);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hashBuffer).toString("hex");
}

// ──────────────────────────────────────────────────────────────
// Note Management
// ──────────────────────────────────────────────────────────────

/**
 * Generate a new deposit note with random nullifier and secret.
 *
 * The note must be securely stored by the user — losing it means
 * the deposited funds cannot be withdrawn.
 *
 * @param denomination - Pool denomination for this deposit
 * @returns A new Note with commitment computed via Poseidon2
 */
export async function generateNote(denomination: Denomination): Promise<Note> {
  const nullifier = randomBytes32();
  const secret = randomBytes32();
  const commitment = await poseidon2Hash(nullifier, secret);

  return {
    nullifier,
    secret,
    commitment,
    denomination,
    createdAt: Date.now(),
  };
}

/**
 * Serialize a note to a compact string for backup/storage.
 * Format: "privacylayer-note-v1:<nullifier>:<secret>:<denomination>"
 */
export function serializeNote(note: Note): string {
  return `privacylayer-note-v1:${note.nullifier}:${note.secret}:${note.denomination}`;
}

/**
 * Deserialize a note from its compact string representation.
 * @throws Error if the format is invalid
 */
export async function deserializeNote(serialized: string): Promise<Note> {
  const parts = serialized.split(":");
  if (parts.length !== 4 || parts[0] !== "privacylayer-note-v1") {
    throw new Error("Invalid note format. Expected: privacylayer-note-v1:<nullifier>:<secret>:<denomination>");
  }

  const [, nullifier, secret, denominationStr] = parts;
  const denomination = denominationStr as Denomination;

  if (!Object.values(Denomination).includes(denomination)) {
    throw new Error(`Invalid denomination: ${denominationStr}`);
  }

  const commitment = await poseidon2Hash(nullifier, secret);

  return {
    nullifier,
    secret,
    commitment,
    denomination,
    createdAt: Date.now(),
  };
}

// ──────────────────────────────────────────────────────────────
// PrivacyLayer Client
// ──────────────────────────────────────────────────────────────

/**
 * Main client for interacting with the PrivacyLayer contract.
 *
 * Usage:
 * ```typescript
 * const client = new PrivacyLayerClient({
 *   ...TESTNET_CONFIG,
 *   contractId: "CABC123...",
 * });
 *
 * // Generate note and deposit
 * const note = await generateNote(Denomination.Xlm10);
 * const result = await client.deposit(keypair, note);
 *
 * // Later: withdraw to a different address
 * await client.withdraw({ note, recipient: "G..." });
 * ```
 */
export class PrivacyLayerClient {
  private readonly server: SorobanRpc.Server;
  private readonly contract: Contract;
  private readonly config: Required<ClientConfig>;

  constructor(config: ClientConfig) {
    this.config = {
      txTimeoutSec: 30,
      ...config,
    };
    this.server = new SorobanRpc.Server(this.config.rpcUrl);
    this.contract = new Contract(this.config.contractId);
  }

  // ── Deposit ────────────────────────────────────────────────

  /**
   * Deposit funds into the shielded pool.
   *
   * This transfers the denomination amount from the depositor's account
   * and inserts the note's commitment into the on-chain Merkle tree.
   *
   * @param depositorKeypair - Keypair of the depositor (must have funds)
   * @param note - The deposit note (generated via generateNote)
   * @returns DepositResult with leaf index and new Merkle root
   * @throws PrivacyLayerError on contract errors
   * @throws NetworkError on RPC communication failures
   */
  async deposit(depositorKeypair: Keypair, note: Note): Promise<DepositResult> {
    try {
      const account = await this.server.getAccount(depositorKeypair.publicKey());

      const commitmentBytes = Buffer.from(note.commitment, "hex");

      const tx = new TransactionBuilder(account, {
        fee: "100000",
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(
          this.contract.call(
            "deposit",
            nativeToScVal(depositorKeypair.publicKey(), { type: "address" }),
            xdr.ScVal.scvBytes(commitmentBytes)
          )
        )
        .setTimeout(this.config.txTimeoutSec)
        .build();

      const preparedTx = await this.server.prepareTransaction(tx);
      preparedTx.sign(depositorKeypair);

      const response = await this.server.sendTransaction(preparedTx);
      const result = await this.waitForTransaction(response.hash);

      return this.parseDepositResult(result);
    } catch (err) {
      if (err instanceof PrivacyLayerError) throw err;
      throw new NetworkError(`Deposit failed: ${(err as Error).message}`, err as Error);
    }
  }

  // ── Withdrawal ─────────────────────────────────────────────

  /**
   * Withdraw funds from the shielded pool using a ZK proof.
   *
   * This generates a Groth16 proof that the caller knows the preimage
   * of a commitment in the Merkle tree, then submits it to the contract.
   *
   * @param params - Withdrawal parameters (note, recipient, optional relayer)
   * @returns true on successful withdrawal
   * @throws PrivacyLayerError on contract errors
   * @throws ProofGenerationError if ZK proof generation fails
   * @throws NetworkError on RPC communication failures
   */
  async withdraw(params: WithdrawParams): Promise<boolean> {
    try {
      // Step 1: Sync Merkle tree from contract events
      const leaves = await this.syncMerkleLeaves();

      // Step 2: Generate Merkle inclusion proof
      const merkleProof = this.generateMerkleProof(leaves, params.note);

      // Step 3: Generate ZK proof via Noir WASM prover
      const { proof, publicInputs } = await this.generateWithdrawProof(
        params,
        merkleProof
      );

      // Step 4: Submit proof to contract
      // Note: withdrawal transactions can be submitted by anyone (including relayers)
      // because the proof itself authorizes the withdrawal
      const result = await this.submitWithdrawProof(proof, publicInputs);

      return result;
    } catch (err) {
      if (err instanceof PrivacyLayerError) throw err;
      if (err instanceof ProofGenerationError) throw err;
      throw new NetworkError(`Withdrawal failed: ${(err as Error).message}`, err as Error);
    }
  }

  // ── View Functions ─────────────────────────────────────────

  /** Get the current Merkle root */
  async getRoot(): Promise<string> {
    const result = await this.callView("get_root");
    return this.parseBytes32(result);
  }

  /** Get total number of deposits */
  async getDepositCount(): Promise<number> {
    const result = await this.callView("deposit_count");
    return this.parseU32(result);
  }

  /** Check if a Merkle root is in the historical buffer */
  async isKnownRoot(root: string): Promise<boolean> {
    const rootBytes = Buffer.from(root, "hex");
    const result = await this.callView("is_known_root", [
      xdr.ScVal.scvBytes(rootBytes),
    ]);
    return this.parseBool(result);
  }

  /** Check if a nullifier has been spent */
  async isSpent(nullifierHash: string): Promise<boolean> {
    const nullBytes = Buffer.from(nullifierHash, "hex");
    const result = await this.callView("is_spent", [
      xdr.ScVal.scvBytes(nullBytes),
    ]);
    return this.parseBool(result);
  }

  /** Get pool configuration */
  async getConfig(): Promise<PoolConfig> {
    const result = await this.callView("get_config_view");
    return this.parsePoolConfig(result);
  }

  /** Get a full pool state snapshot */
  async getPoolState(): Promise<PoolState> {
    const [depositCount, currentRoot, config] = await Promise.all([
      this.getDepositCount(),
      this.getRoot(),
      this.getConfig(),
    ]);

    return { depositCount, currentRoot, config };
  }

  // ── Event Monitoring ───────────────────────────────────────

  /**
   * Fetch contract events within a ledger range.
   *
   * @param startLedger - Start ledger sequence number
   * @param endLedger - End ledger sequence (optional, defaults to latest)
   * @returns Array of parsed PrivacyLayer events
   */
  async getEvents(
    startLedger: number,
    endLedger?: number
  ): Promise<PrivacyLayerEvent[]> {
    const response = await this.server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [this.config.contractId],
        },
      ],
      limit: 100,
    });

    return response.events
      .filter((e) => !endLedger || e.ledger <= endLedger)
      .map((e) => this.parseEvent(e));
  }

  /**
   * Subscribe to contract events with polling.
   *
   * @param callback - Called for each new event
   * @param pollIntervalMs - Polling interval in milliseconds (default: 5000)
   * @returns A stop function to cancel the subscription
   */
  subscribeToEvents(
    callback: (event: PrivacyLayerEvent) => void,
    pollIntervalMs: number = 5000
  ): () => void {
    let lastLedger = 0;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;

      try {
        if (lastLedger === 0) {
          const latestLedger = await this.server.getLatestLedger();
          lastLedger = latestLedger.sequence - 100; // Start 100 ledgers back
        }

        const events = await this.getEvents(lastLedger + 1);
        for (const event of events) {
          callback(event);
          if (event.ledger > lastLedger) {
            lastLedger = event.ledger;
          }
        }
      } catch (err) {
        console.error("[PrivacyLayer] Event polling error:", err);
      }

      if (!stopped) {
        setTimeout(poll, pollIntervalMs);
      }
    };

    poll();

    return () => {
      stopped = true;
    };
  }

  // ── Private Helpers ────────────────────────────────────────

  private async callView(method: string, args: xdr.ScVal[] = []): Promise<xdr.ScVal> {
    try {
      const account = await this.server.getAccount(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
      );

      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: this.config.networkPassphrase,
      })
        .addOperation(this.contract.call(method, ...args))
        .setTimeout(this.config.txTimeoutSec)
        .build();

      const response = await this.server.simulateTransaction(tx);

      if ("error" in response) {
        throw new NetworkError(`Simulation failed: ${response.error}`);
      }

      if (!("result" in response) || !response.result) {
        throw new NetworkError("No result from simulation");
      }

      return response.result.retval;
    } catch (err) {
      if (err instanceof NetworkError) throw err;
      throw new NetworkError(`View call ${method} failed: ${(err as Error).message}`, err as Error);
    }
  }

  private async waitForTransaction(hash: string): Promise<SorobanRpc.Api.GetTransactionResponse> {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      const txResponse = await this.server.getTransaction(hash);
      if (txResponse.status === "SUCCESS") return txResponse;
      if (txResponse.status === "FAILED") {
        throw new PrivacyLayerError(0, `Transaction failed: ${hash}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new NetworkError(`Transaction ${hash} timed out after ${maxAttempts}s`);
  }

  private async syncMerkleLeaves(): Promise<string[]> {
    // Fetch all deposit events to reconstruct the Merkle tree
    const latestLedger = await this.server.getLatestLedger();
    const startLedger = Math.max(1, latestLedger.sequence - 100_000);

    const events = await this.getEvents(startLedger);
    return events
      .filter((e) => e.type === "deposit")
      .map((e) => e.data.commitment as string);
  }

  private generateMerkleProof(
    leaves: string[],
    note: Note
  ): { pathElements: string[]; pathIndices: number[] } {
    // Find the leaf index for our commitment
    const leafIndex = note.leafIndex ?? leaves.indexOf(note.commitment);
    if (leafIndex === -1) {
      throw new ProofGenerationError("Commitment not found in Merkle tree");
    }

    // Build Merkle path (depth = 20)
    const TREE_DEPTH = 20;
    const pathElements: string[] = [];
    const pathIndices: number[] = [];

    // NOTE: In production, this would compute the actual Poseidon2 Merkle path.
    // The tree uses the same Poseidon2 hash as the commitment scheme.
    for (let level = 0; level < TREE_DEPTH; level++) {
      const isRight = (leafIndex >> level) & 1;
      pathIndices.push(isRight);
      // Placeholder: actual sibling hash would come from tree reconstruction
      pathElements.push("0".repeat(64));
    }

    return { pathElements, pathIndices };
  }

  private async generateWithdrawProof(
    params: WithdrawParams,
    merkleProof: { pathElements: string[]; pathIndices: number[] }
  ): Promise<{ proof: Groth16Proof; publicInputs: PublicInputs }> {
    // NOTE: In production, this would invoke the Noir WASM prover:
    //
    // import { generateProof } from '@privacylayer/noir-prover-wasm';
    // const { proof, publicInputs } = await generateProof({
    //   nullifier: params.note.nullifier,
    //   secret: params.note.secret,
    //   pathElements: merkleProof.pathElements,
    //   pathIndices: merkleProof.pathIndices,
    //   root: currentRoot,
    //   recipient: params.recipient,
    //   relayer: params.relayer || ZERO_ADDRESS,
    //   fee: params.fee || 0,
    // });

    throw new ProofGenerationError(
      "ZK proof generation requires the Noir WASM prover module. " +
      "See the PrivacyLayer SDK documentation for setup instructions."
    );
  }

  private async submitWithdrawProof(
    proof: Groth16Proof,
    publicInputs: PublicInputs
  ): Promise<boolean> {
    // This would build and submit the withdraw transaction
    // Implementation depends on the proof format from the Noir prover
    throw new Error("Not yet implemented — requires Noir prover integration");
  }

  private parseDepositResult(response: SorobanRpc.Api.GetTransactionResponse): DepositResult {
    // Parse (u32, BytesN<32>) tuple from the response
    // Actual parsing depends on the soroban-sdk encoding
    return {
      leafIndex: 0,
      merkleRoot: "0".repeat(64),
    };
  }

  private parseBytes32(val: xdr.ScVal): string {
    const bytes = val.bytes();
    return Buffer.from(bytes).toString("hex");
  }

  private parseU32(val: xdr.ScVal): number {
    return val.u32();
  }

  private parseBool(val: xdr.ScVal): boolean {
    return val.b();
  }

  private parsePoolConfig(val: xdr.ScVal): PoolConfig {
    // Parse the PoolConfig struct from ScVal
    // In production, use the generated contract bindings
    return {
      admin: "",
      token: "",
      denomination: Denomination.Xlm10,
      treeDepth: 20,
      rootHistorySize: 30,
      paused: false,
    };
  }

  private parseEvent(event: SorobanRpc.Api.EventResponse): PrivacyLayerEvent {
    const topic = event.topic?.[0]?.toString() || "unknown";
    let eventType: EventType = "deposit";

    if (topic.includes("deposit")) eventType = "deposit";
    else if (topic.includes("withdraw")) eventType = "withdraw";
    else if (topic.includes("pause")) eventType = "pause";
    else if (topic.includes("unpause")) eventType = "unpause";
    else if (topic.includes("vk")) eventType = "vk_updated";

    return {
      type: eventType,
      ledger: event.ledger,
      timestamp: Date.now(),
      data: { raw: event.value },
    };
  }
}
