/**
 * PrivacyLayer TypeScript SDK
 *
 * A comprehensive SDK for interacting with PrivacyLayer privacy pools
 * on Stellar Soroban. Provides utilities for deposits, withdrawals,
 * and zero-knowledge proof generation.
 *
 * @module @privacylayer/sdk
 * @example
 * ```typescript
 * import { PrivacyLayerSDK, NETWORKS, generateNote } from '@privacylayer/sdk';
 *
 * // Initialize SDK
 * const sdk = new PrivacyLayerSDK({ network: NETWORKS.testnet });
 *
 * // Generate a deposit note
 * const note = await generateNote(100);
 * console.log('Commitment:', note.commitment);
 * ```
 */

// ============================================================
// Type Exports
// ============================================================
export {
  Denomination,
  type Note,
  type DepositReceipt,
  type NetworkConfig,
  type MerkleProof,
  type WithdrawParams,
  type WithdrawalProof,
  TransactionStatus,
  type TransactionResult,
  type PoolState,
  type SDKOptions,
} from './types';

// ============================================================
// Constants
// ============================================================
export {
  SDK_VERSION,
  MERKLE_TREE_DEPTH,
  FIELD_SIZE,
  ZERO_VALUE,
  NETWORKS,
  DEFAULT_GAS,
  SUPPORTED_ASSETS,
  FIELD_ELEMENT_SIZE,
  TRANSACTION_TIMEOUTS,
} from './constants';

// ============================================================
// Crypto Utilities
// ============================================================
export {
  randomFieldElement,
  randomHex,
  initPedersen,
  pedersenHash,
  pedersenHashHex,
  sha256,
  computeCommitment,
  computeCommitmentHex,
  computeNullifierHash,
  computeZeroLeaf,
  generateNote,
} from './utils/crypto';

// ============================================================
// Encoding Utilities
// ============================================================
export {
  hexToBytes,
  bytesToHex,
  toBase64,
  fromBase64,
  bigintToHex,
  hexToBigint,
  arrayToHex,
  hexToArray,
  concatHex,
  hexEquals,
  padHex,
  stripLeadingZeros,
  formatHex,
} from './utils/encoding';

// ============================================================
// Validation Utilities
// ============================================================
export {
  isValidStellarAddress,
  isValidHex,
  isFieldElement,
  isValidFieldElementHex,
  isValidDenomination,
  isValidAmount,
  isValidNote,
  isValidMerkleProof,
  isValidContractId,
  assert,
  validateWithdrawParams,
} from './utils/validation';

// ============================================================
// Backup and Recovery Utilities
// ============================================================
export {
  type EncryptedBackup,
  type PlainBackup,
  type BackupVerificationResult,
  type ImportResult,
  encryptNotes,
  decryptNotes,
  exportNotesToJson,
  importNotesFromJson,
  exportEncryptedBackup,
  importEncryptedBackup,
  noteToQRData,
  qrDataToNote,
  notesToQRData,
  verifyBackup,
  detectBackupFormat,
  checkPasswordStrength,
} from './utils/backup';

// ============================================================
// SDK Class
// ============================================================
import type {
  NetworkConfig,
  SDKOptions,
  Note,
  DepositReceipt,
  WithdrawParams,
  PoolState,
  TransactionResult,
} from './types';
import { TransactionStatus } from './types';
import { SDK_VERSION, TRANSACTION_TIMEOUTS } from './constants';
import { generateNote, computeCommitmentHex, computeNullifierHash } from './utils/crypto';
import { bigintToHex, hexToBigint } from './utils/encoding';
import {
  isValidStellarAddress,
  isValidNote,
  isValidDenomination,
  assert,
} from './utils/validation';

/**
 * PrivacyLayer SDK class for interacting with privacy pools.
 *
 * @example
 * ```typescript
 * const sdk = new PrivacyLayerSDK({ network: NETWORKS.testnet });
 *
 * // Create a deposit
 * const deposit = await sdk.deposit(100);
 *
 * // Withdraw
 * const result = await sdk.withdraw({
 *   note: deposit.note,
 *   merkleProof: deposit.proof,
 *   recipient: 'G...'
 * });
 * ```
 */
export class PrivacyLayerSDK {
  private config: SDKOptions;
  private initialized = false;

  /**
   * Create a new PrivacyLayer SDK instance.
   * @param options - SDK configuration options
   */
  constructor(options: SDKOptions) {
    this.config = options;
  }

  /**
   * Get the SDK version.
   */
  static get version(): string {
    return SDK_VERSION;
  }

  /**
   * Get the current network configuration.
   */
  get network(): NetworkConfig {
    return this.config.network;
  }

  /**
   * Initialize the SDK (loads crypto parameters).
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Initialize Pedersen hash
    const { initPedersen } = await import('./utils/crypto');
    await initPedersen();

    this.initialized = true;

    if (this.config.debug) {
      console.log(`[PrivacyLayer SDK] Initialized on ${this.config.network.name || 'network'}`);
    }
  }

  /**
   * Ensure SDK is initialized before operations.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SDK not initialized. Call await sdk.init() first.');
    }
  }

  /**
   * Generate a new deposit note.
   * @param denomination - Deposit denomination
   * @returns Generated note
   */
  async createNote(denomination: number): Promise<Note> {
    assert(isValidDenomination(denomination), 'Invalid denomination');

    const { nullifier, secret, commitment } = await generateNote(denomination);

    return {
      nullifier,
      secret,
      commitment,
      denomination,
    };
  }

  /**
   * Compute the commitment for a note.
   * @param nullifier - Nullifier hex string
   * @param secret - Secret hex string
   * @returns Commitment hex string
   */
  async computeCommitment(nullifier: string, secret: string): Promise<string> {
    this.ensureInitialized();
    return computeCommitmentHex(nullifier, secret);
  }

  /**
   * Get the current pool state.
   * Note: This requires integration with the deployed contract.
   * @returns Pool state
   */
  async getPoolState(): Promise<PoolState> {
    this.ensureInitialized();

    // TODO: Implement actual contract call
    // For now, return placeholder
    return {
      root: '0'.repeat(64),
      depositCount: 0,
      totalValue: 0n,
    };
  }

  /**
   * Deposit into the privacy pool.
   * @param denomination - Amount to deposit
   * @returns Deposit receipt and generated note
   */
  async deposit(denomination: number): Promise<{
    note: Note;
    receipt: DepositReceipt;
  }> {
    this.ensureInitialized();
    assert(isValidDenomination(denomination), 'Invalid denomination');

    const note = await this.createNote(denomination);

    // TODO: Implement actual contract interaction
    // For now, return placeholder receipt
    const receipt: DepositReceipt = {
      commitment: note.commitment,
      leafIndex: 0,
      transactionHash: '0'.repeat(64),
      timestamp: Math.floor(Date.now() / 1000),
    };

    if (this.config.debug) {
      console.log(`[PrivacyLayer SDK] Deposit created with commitment: ${note.commitment}`);
    }

    return { note, receipt };
  }

  /**
   * Withdraw from the privacy pool.
   * @param params - Withdrawal parameters
   * @returns Transaction result
   */
  async withdraw(params: WithdrawParams): Promise<TransactionResult> {
    this.ensureInitialized();

    const { note, merkleProof, recipient, relayer } = params;

    // Validate inputs
    assert(isValidNote(note), 'Invalid note');
    assert(isValidStellarAddress(recipient), 'Invalid recipient address');

    if (relayer) {
      assert(isValidStellarAddress(relayer), 'Invalid relayer address');
    }

    // Compute nullifier hash
    const nullifierBigint = hexToBigint(note.nullifier);
    const rootBigint = hexToBigint(merkleProof.root);
    const nullifierHash = await computeNullifierHash(nullifierBigint, rootBigint);

    if (this.config.debug) {
      console.log(`[PrivacyLayer SDK] Withdrawal with nullifier hash: ${bigintToHex(nullifierHash)}`);
    }

    // TODO: Implement actual ZK proof generation and contract call
    // For now, return placeholder
    return {
      status: TransactionStatus.PENDING,
      hash: '0'.repeat(64),
    };
  }

  /**
   * Wait for a transaction to be confirmed.
   * @param hash - Transaction hash
   * @param timeout - Timeout in milliseconds
   * @returns Transaction result
   */
  async waitForTransaction(hash: string, _timeout = TRANSACTION_TIMEOUTS.confirmation): Promise<TransactionResult> {
    // TODO: Implement actual transaction monitoring
    return {
      status: TransactionStatus.SUCCESS,
      hash,
    };
  }
}

// Default export
export default PrivacyLayerSDK;