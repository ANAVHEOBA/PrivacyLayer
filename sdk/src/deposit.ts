// ============================================================
// PrivacyLayer SDK — Complete Deposit Flow
// ============================================================
// Implements the end-to-end deposit flow:
//   1. Generate a new note (nullifier, secret, commitment)
//   2. Build the deposit transaction with the commitment
//   3. Sign the transaction (via user-provided signer)
//   4. Submit to the Stellar network
//   5. Parse the receipt (leaf index, tx hash, merkle root)
//
// The contract function called is:
//   deposit(from: Address, commitment: BytesN<32>) -> (u32, BytesN<32>)
//
// References:
//   - Contract: contracts/privacy_pool/src/core/deposit.rs
//   - Types: contracts/privacy_pool/src/types/state.rs
// ============================================================

import {
  DepositError,
  ErrorCode,
  NetworkError,
  ValidationError,
  WalletError,
  isPrivacyLayerError,
} from './errors';
import {
  generateNote,
  validateNote,
} from './note';
import {
  DENOMINATION_AMOUNTS,
  DepositCostEstimate,
  DepositOptions,
  DepositReceipt,
  Denomination,
  NETWORK_PASSPHRASES,
  NETWORK_RPC_URLS,
  Note,
  StellarNetwork,
  TransactionResult,
  TransactionStatus,
} from './types';

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/** Default transaction confirmation timeout (30 seconds) */
const DEFAULT_CONFIRMATION_TIMEOUT_MS = 30_000;

/** Polling interval for transaction confirmation (2 seconds) */
const CONFIRMATION_POLL_INTERVAL_MS = 2_000;

/** Default base fee for Stellar transactions (100 stroops) */
const DEFAULT_BASE_FEE = '100';

/** Soroban contract invocation overhead estimate (CPU instructions) */
const ESTIMATED_CPU_INSTRUCTIONS = 500_000;

/** Soroban contract invocation overhead estimate (memory bytes) */
const ESTIMATED_MEMORY_BYTES = 131_072; // 128 KB

// ──────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate deposit options before building a transaction.
 *
 * @param options - The deposit options to validate
 * @throws ValidationError if any option is invalid
 */
export function validateDepositOptions(options: DepositOptions): void {
  // Source address must be a valid Stellar public key (G...)
  if (!options.sourceAddress || !/^G[A-Z2-7]{55}$/.test(options.sourceAddress)) {
    throw new ValidationError(
      ErrorCode.INVALID_ADDRESS,
      'Source address must be a valid Stellar public key (G...)',
      { field: 'sourceAddress' },
    );
  }

  // Contract ID must be a valid Soroban contract address (C...)
  if (!options.contractId || !/^C[A-Z2-7]{55}$/.test(options.contractId)) {
    throw new DepositError(
      ErrorCode.INVALID_CONTRACT_ID,
      'Contract ID must be a valid Soroban contract address (C...)',
      { phase: 'build' },
    );
  }

  // Denomination must be valid
  if (!Object.values(Denomination).includes(options.denomination)) {
    throw new ValidationError(
      ErrorCode.INVALID_AMOUNT,
      `Invalid denomination: ${options.denomination}`,
      {
        field: 'denomination',
        constraint: `Must be one of: ${Object.values(Denomination).join(', ')}`,
      },
    );
  }

  // Signer must be provided
  if (typeof options.signer !== 'function') {
    throw new DepositError(
      ErrorCode.SIGNER_REQUIRED,
      'A signer function is required for deposit transactions',
      { phase: 'sign' },
    );
  }

  // If a pre-generated note is provided, validate it
  if (options.note) {
    validateNote(options.note);

    // Note denomination must match requested denomination
    if (options.note.denomination !== options.denomination) {
      throw new ValidationError(
        ErrorCode.INVALID_AMOUNT,
        'Note denomination does not match deposit denomination',
        {
          field: 'note.denomination',
          details: {
            noteType: options.note.denomination,
            requestedType: options.denomination,
          },
        },
      );
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Transaction Building
// ──────────────────────────────────────────────────────────────

/**
 * Build an unsigned Soroban deposit transaction.
 *
 * The transaction invokes the privacy pool contract's `deposit` function
 * with the depositor's address and the note commitment.
 *
 * @param options - Deposit options including source address, contract ID, etc.
 * @param note    - The deposit note containing the commitment
 * @returns The unsigned transaction XDR (base64)
 * @throws DepositError if transaction building fails
 *
 * @example
 * ```typescript
 * const note = generateNote(Denomination.Xlm100, 'testnet');
 * const txXdr = await buildDepositTransaction({
 *   sourceAddress: 'GABC...',
 *   contractId: 'CABC...',
 *   denomination: Denomination.Xlm100,
 *   network: 'testnet',
 *   signer: mySignerFn,
 * }, note);
 * ```
 */
export async function buildDepositTransaction(
  options: DepositOptions,
  note: Note,
): Promise<string> {
  try {
    const rpcUrl = options.rpcUrl ?? NETWORK_RPC_URLS[options.network];
    const networkPassphrase = NETWORK_PASSPHRASES[options.network];

    // Dynamically import Stellar SDK to avoid hard dependency at import time
    const stellar = await import('@stellar/stellar-sdk');
    const { SorobanRpc, TransactionBuilder, Contract, Address, xdr } = stellar;

    // Connect to Soroban RPC
    const server = new SorobanRpc.Server(rpcUrl);

    // Load the source account
    const sourceAccount = await server.getAccount(options.sourceAddress).catch(
      (err: Error) => {
        throw new NetworkError(
          ErrorCode.NETWORK_UNREACHABLE,
          `Failed to load source account: ${err.message}`,
          { cause: err, endpoint: rpcUrl },
        );
      },
    );

    // Build the contract invocation
    const contract = new Contract(options.contractId);

    // Convert commitment hex to a 32-byte buffer for BytesN<32>
    const commitmentBuffer = Buffer.from(note.commitment, 'hex');

    // Build the transaction
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: DEFAULT_BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'deposit',
          // from: Address (the depositor)
          Address.fromString(options.sourceAddress).toScVal(),
          // commitment: BytesN<32>
          xdr.ScVal.scvBytes(commitmentBuffer),
        ),
      )
      .setTimeout(30)
      .build();

    // Simulate the transaction to get proper resource estimates
    const simulated = await server.simulateTransaction(transaction).catch(
      (err: Error) => {
        throw new DepositError(
          ErrorCode.DEPOSIT_SIMULATION_FAILED,
          `Transaction simulation failed: ${err.message}`,
          { cause: err, phase: 'build' },
        );
      },
    );

    // Check simulation result
    if (SorobanRpc.Api.isSimulationError(simulated)) {
      const errorMsg = 'error' in simulated
        ? String((simulated as unknown as Record<string, unknown>).error)
        : 'Unknown simulation error';
      throw new DepositError(
        ErrorCode.DEPOSIT_SIMULATION_FAILED,
        `Deposit simulation failed: ${errorMsg}`,
        {
          phase: 'build',
          details: { simulationError: errorMsg },
        },
      );
    }

    // Prepare the transaction with proper resource limits from simulation
    const preparedTx = SorobanRpc.assembleTransaction(transaction, simulated).build();

    return preparedTx.toXDR();
  } catch (error: unknown) {
    if (isPrivacyLayerError(error)) {
      throw error;
    }
    throw new DepositError(
      ErrorCode.DEPOSIT_SIMULATION_FAILED,
      `Failed to build deposit transaction: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : undefined,
        phase: 'build',
      },
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Transaction Submission
// ──────────────────────────────────────────────────────────────

/**
 * Submit a signed transaction to the Stellar network and wait
 * for confirmation.
 *
 * @param signedTxXdr  - The signed transaction XDR (base64)
 * @param network      - The Stellar network
 * @param rpcUrl       - Optional custom RPC URL
 * @param timeoutMs    - Timeout for waiting on confirmation
 * @returns The transaction result
 * @throws DepositError if submission or confirmation fails
 */
export async function submitTransaction(
  signedTxXdr: string,
  network: StellarNetwork,
  rpcUrl?: string,
  timeoutMs: number = DEFAULT_CONFIRMATION_TIMEOUT_MS,
): Promise<TransactionResult> {
  try {
    const url = rpcUrl ?? NETWORK_RPC_URLS[network];
    const stellar = await import('@stellar/stellar-sdk');
    const { SorobanRpc, TransactionBuilder } = stellar;

    const server = new SorobanRpc.Server(url);
    const networkPassphrase = NETWORK_PASSPHRASES[network];

    // Reconstruct the transaction from XDR
    const transaction = TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase);

    // Submit the transaction
    const sendResponse = await server.sendTransaction(transaction).catch(
      (err: Error) => {
        throw new NetworkError(
          ErrorCode.TRANSACTION_FAILED,
          `Failed to submit transaction: ${err.message}`,
          { cause: err, isRetryable: true, endpoint: url },
        );
      },
    );

    const hash = sendResponse.hash;

    // Check for immediate errors
    if (sendResponse.status === 'ERROR') {
      throw new DepositError(
        ErrorCode.TRANSACTION_FAILED,
        `Transaction submission returned error status`,
        {
          phase: 'submit',
          details: { hash, status: sendResponse.status },
        },
      );
    }

    // Poll for confirmation
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const txResponse = await server.getTransaction(hash).catch(
        (err: Error) => {
          throw new NetworkError(
            ErrorCode.RPC_ERROR,
            `Failed to check transaction status: ${err.message}`,
            { cause: err, isRetryable: true, endpoint: url },
          );
        },
      );

      if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        // Parse the return value from the contract call
        const returnValue = parseDepositReturnValue(txResponse as unknown as Record<string, unknown>);

        return {
          status: TransactionStatus.SUCCESS,
          hash,
          ledger: txResponse.latestLedger,
          returnValue,
        };
      }

      if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        return {
          status: TransactionStatus.FAILED,
          hash,
          errorMessage: 'Transaction failed on-chain',
        };
      }

      // Still pending — wait and poll again
      await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
    }

    // Timeout reached
    throw new DepositError(
      ErrorCode.DEPOSIT_TIMEOUT,
      `Transaction confirmation timed out after ${timeoutMs}ms`,
      {
        phase: 'confirm',
        isRetryable: true,
        details: { hash, timeoutMs },
      },
    );
  } catch (error: unknown) {
    if (isPrivacyLayerError(error)) {
      throw error;
    }
    throw new DepositError(
      ErrorCode.TRANSACTION_FAILED,
      `Transaction submission failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : undefined,
        phase: 'submit',
      },
    );
  }
}

// ──────────────────────────────────────────────────────────────
// Receipt Parsing
// ──────────────────────────────────────────────────────────────

/**
 * Parse the deposit contract return value from a transaction response.
 *
 * The contract returns `(u32, BytesN<32>)` = (leaf_index, new_merkle_root).
 *
 * @param txResponse - The transaction response from Soroban RPC
 * @returns Parsed leaf index and merkle root
 */
export function parseDepositReturnValue(
  txResponse: Record<string, unknown>,
): { leafIndex: number; merkleRoot: string } | undefined {
  try {
    // The return value is in resultMetaXdr
    const resultMeta = txResponse.resultMetaXdr as string | undefined;
    if (!resultMeta) {
      return undefined;
    }

    // Try to extract from returnValue if available (Stellar SDK v12+)
    const returnValue = txResponse.returnValue as Record<string, unknown> | undefined;
    if (returnValue) {
      // Soroban returns a tuple (vec) of [u32, bytes32]
      const values = returnValue as { _value?: Array<{ _value: unknown }> };
      if (values._value && Array.isArray(values._value) && values._value.length === 2) {
        const leafIndex = Number(values._value[0]._value);
        const rootBytes = values._value[1]._value;
        const merkleRoot = Buffer.isBuffer(rootBytes)
          ? rootBytes.toString('hex')
          : String(rootBytes);

        return { leafIndex, merkleRoot };
      }
    }

    return undefined;
  } catch {
    // If parsing fails, return undefined rather than throwing
    return undefined;
  }
}

/**
 * Parse a deposit receipt from a transaction result and note.
 *
 * @param txResult  - The transaction result
 * @param note      - The deposit note
 * @param options   - The original deposit options
 * @returns A complete DepositReceipt
 * @throws DepositError if the transaction failed
 */
export function parseDepositReceipt(
  txResult: TransactionResult,
  note: Note,
  options: DepositOptions,
): DepositReceipt {
  if (txResult.status !== TransactionStatus.SUCCESS) {
    throw new DepositError(
      ErrorCode.TRANSACTION_FAILED,
      txResult.errorMessage ?? 'Deposit transaction failed',
      {
        phase: 'confirm',
        details: {
          hash: txResult.hash,
          status: txResult.status,
        },
      },
    );
  }

  const leafIndex = txResult.returnValue?.leafIndex ?? 0;
  const merkleRoot = txResult.returnValue?.merkleRoot ?? '';

  return {
    note,
    leafIndex,
    merkleRoot,
    transactionHash: txResult.hash,
    ledgerNumber: txResult.ledger ?? 0,
    confirmedAt: new Date().toISOString(),
    denominationAmount: DENOMINATION_AMOUNTS[options.denomination],
    contractId: options.contractId,
    network: options.network,
  };
}

// ──────────────────────────────────────────────────────────────
// Gas Estimation
// ──────────────────────────────────────────────────────────────

/**
 * Estimate the cost of a deposit transaction.
 *
 * This provides an approximate cost including:
 *   - The transaction fee (gas)
 *   - The deposit denomination amount
 *   - CPU and memory resource estimates
 *
 * For exact fees, use `buildDepositTransaction()` which simulates
 * the transaction and returns precise resource limits.
 *
 * @param denomination - The deposit denomination
 * @param network      - The Stellar network
 * @param rpcUrl       - Optional custom RPC URL
 * @returns Cost estimate for the deposit
 *
 * @example
 * ```typescript
 * const estimate = await estimateDepositCost(Denomination.Xlm100, 'testnet');
 * console.log(`Total cost: ${estimate.totalCost} stroops`);
 * ```
 */
export async function estimateDepositCost(
  denomination: Denomination,
  network: StellarNetwork,
  rpcUrl?: string,
): Promise<DepositCostEstimate> {
  // Validate denomination
  if (!Object.values(Denomination).includes(denomination)) {
    throw new ValidationError(
      ErrorCode.INVALID_AMOUNT,
      `Invalid denomination: ${denomination}`,
      { field: 'denomination' },
    );
  }

  const depositAmount = DENOMINATION_AMOUNTS[denomination];

  // Base fee estimate: Soroban contract calls typically cost more than
  // basic transactions. We estimate based on known gas patterns.
  // The actual fee will be determined by transaction simulation.
  let estimatedFee: bigint;

  try {
    const url = rpcUrl ?? NETWORK_RPC_URLS[network];
    const stellar = await import('@stellar/stellar-sdk');
    const { SorobanRpc } = stellar;

    const server = new SorobanRpc.Server(url);
    const health = await server.getHealth();

    // Use ledger close time to estimate network congestion
    // Base fee is typically 100 stroops, but can be higher under load
    // Network is healthy — use standard fee estimate
    if (health.status === 'healthy') {
      estimatedFee = 100_000n; // ~0.01 XLM typical for Soroban calls
    } else {
      estimatedFee = 150_000n; // slightly higher if degraded
    }
  } catch {
    // If we cannot reach the network, use a conservative estimate
    estimatedFee = 200_000n; // ~0.02 XLM conservative estimate
  }

  const totalCost = estimatedFee + depositAmount;

  // Minimum balance includes the deposit amount, fee, and base reserve
  // Stellar accounts need a minimum of 1 XLM (10M stroops) base reserve
  // plus 0.5 XLM per subentry
  const minimumBalance = totalCost + 15_000_000n; // + 1.5 XLM buffer

  return {
    estimatedFee,
    depositAmount,
    totalCost,
    minimumBalance,
    cpuInstructions: ESTIMATED_CPU_INSTRUCTIONS,
    memoryBytes: ESTIMATED_MEMORY_BYTES,
  };
}

// ──────────────────────────────────────────────────────────────
// Complete Deposit Flow
// ──────────────────────────────────────────────────────────────

/**
 * Execute the complete deposit flow end-to-end.
 *
 * This is the primary entry point for depositing into the privacy pool.
 * It orchestrates the full flow:
 *
 *   1. **Generate note** — create random nullifier, secret, commitment
 *   2. **Build transaction** — construct the Soroban contract call
 *   3. **Sign transaction** — delegate to user-provided signer
 *   4. **Submit transaction** — send to Stellar network
 *   5. **Parse receipt** — extract leaf index, merkle root, tx hash
 *
 * @param options - Complete deposit options
 * @returns A DepositReceipt with the note and on-chain confirmation
 * @throws DepositError for deposit-specific failures
 * @throws ValidationError for invalid inputs
 * @throws NetworkError for RPC/network failures
 * @throws WalletError for signing failures
 *
 * @example
 * ```typescript
 * import { deposit, Denomination } from '@privacylayer/sdk';
 *
 * const receipt = await deposit({
 *   sourceAddress: 'GABC...XYZ',
 *   contractId: 'CABC...XYZ',
 *   denomination: Denomination.Xlm100,
 *   network: 'testnet',
 *   signer: async (txXdr, networkPassphrase) => {
 *     // Sign with Freighter wallet
 *     return await freighter.signTransaction(txXdr, { networkPassphrase });
 *   },
 * });
 *
 * console.log(`Deposit confirmed! Leaf index: ${receipt.leafIndex}`);
 * console.log(`Transaction: ${receipt.transactionHash}`);
 *
 * // IMPORTANT: Store the note securely!
 * // You need it to withdraw later.
 * saveSecurely(receipt.note);
 * ```
 */
export async function deposit(options: DepositOptions): Promise<DepositReceipt> {
  // ── Step 0: Validate all inputs ─────────────────────────
  validateDepositOptions(options);

  // ── Step 1: Generate or use provided note ───────────────
  const note: Note = options.note ?? generateNote(options.denomination, options.network);

  try {
    // ── Step 2: Build unsigned transaction ───────────────
    const unsignedTxXdr = await buildDepositTransaction(options, note);

    // ── Step 3: Sign the transaction ────────────────────
    const networkPassphrase = NETWORK_PASSPHRASES[options.network];

    let signedTxXdr: string;
    try {
      signedTxXdr = await options.signer(unsignedTxXdr, networkPassphrase);
    } catch (error: unknown) {
      // Classify signing errors
      const msg = error instanceof Error ? error.message.toLowerCase() : '';

      if (msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')) {
        throw new WalletError(
          ErrorCode.USER_REJECTED,
          'User rejected the deposit transaction',
          { cause: error instanceof Error ? error : undefined },
        );
      }

      throw new WalletError(
        ErrorCode.WALLET_NOT_CONNECTED,
        `Transaction signing failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }

    if (!signedTxXdr) {
      throw new WalletError(
        ErrorCode.WALLET_NOT_CONNECTED,
        'Signer returned an empty transaction',
      );
    }

    // ── Step 4: Submit and wait for confirmation ────────
    const timeoutMs = options.confirmationTimeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS;
    const txResult = await submitTransaction(
      signedTxXdr,
      options.network,
      options.rpcUrl,
      timeoutMs,
    );

    // ── Step 5: Parse receipt ───────────────────────────
    const receipt = parseDepositReceipt(txResult, note, options);

    return receipt;
  } catch (error: unknown) {
    if (isPrivacyLayerError(error)) {
      throw error;
    }

    throw new DepositError(
      ErrorCode.INTERNAL_ERROR,
      `Deposit failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error instanceof Error ? error : undefined,
        phase: 'submit',
      },
    );
  }
}
