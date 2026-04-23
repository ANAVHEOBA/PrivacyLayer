/**
 * PrivacyLayer SDK – Utility Functions
 */

import {
  Soroban,
  xdr,
  Transaction,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { DepositError, DepositErrorCode } from './types';

// ─── Minimal server interface (✅ THIS FIXES EVERYTHING) ─────

interface SorobanServer {
  simulateTransaction(tx: Transaction): Promise<any>;
  getTransaction(hash: string): Promise<any>;
}

// ─── Retry Logic ─────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Soroban Utilities ───────────────────────────────────────

export async function simulateOrThrow(
  server: SorobanServer,
  tx: Transaction
): Promise<any> {
  const sim = await server.simulateTransaction(tx);

  if ('error' in sim) {
    throw new DepositError(
      DepositErrorCode.SIMULATION_FAILED,
      `Transaction simulation failed: ${sim.error}`,
      sim
    );
  }

  if ('restorePreamble' in sim) {
    throw new DepositError(
      DepositErrorCode.SIMULATION_FAILED,
      'Contract ledger entry requires restoration before deposit',
      sim
    );
  }

  return sim;
}

export async function waitForTransaction(
  server: SorobanServer,
  txHash: string,
  pollIntervalMs = 2000,
  timeoutMs = 60_000
): Promise<any> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await server.getTransaction(txHash);

    if (response.status === 'SUCCESS') {
      return response;
    }

    if (response.status === 'FAILED') {
      throw new DepositError(
        DepositErrorCode.SUBMISSION_FAILED,
        `Transaction ${txHash} was rejected`,
        response
      );
    }

    await sleep(pollIntervalMs);
  }

  throw new DepositError(
    DepositErrorCode.TIMEOUT,
    `Transaction ${txHash} not confirmed in time`
  );
}

// ─── Parsing ─────────────────────────────────────────────────

export function parseDepositReturnValue(
  returnValue: xdr.ScVal
): { leafIndex: number; merkleRoot: Uint8Array } {
  try {
    const vec = returnValue.vec();

    if (!vec || vec.length === 0) {
      throw new Error('Invalid return structure');
    }

    const inner = vec[0] ? vec[0].vec() : vec;

    if (!inner || inner.length !== 2) {
      throw new Error('Expected tuple of length 2');
    }

    const leafIndex = inner[0].u32();
    const rootBytes = inner[1].bytes();

    if (!rootBytes || rootBytes.length !== 32) {
      throw new Error('Invalid merkle root length');
    }

    return {
      leafIndex,
      merkleRoot: new Uint8Array(rootBytes),
    };
  } catch (err) {
    throw new DepositError(
      DepositErrorCode.PARSE_ERROR,
      'Failed to parse deposit return value',
      err
    );
  }
}

// ─── Error Mapping ───────────────────────────────────────────

export function mapContractError(errorStr: string): DepositError {
  if (errorStr.includes('PoolPaused')) {
    return new DepositError(
      DepositErrorCode.POOL_PAUSED,
      'The privacy pool is currently paused'
    );
  }

  if (errorStr.includes('ZeroCommitment')) {
    return new DepositError(
      DepositErrorCode.ZERO_COMMITMENT,
      'Commitment must not be zero'
    );
  }

  if (errorStr.includes('TreeFull')) {
    return new DepositError(
      DepositErrorCode.TREE_FULL,
      'Merkle tree is full'
    );
  }

  if (errorStr.toLowerCase().includes('insufficient')) {
    return new DepositError(
      DepositErrorCode.INSUFFICIENT_BALANCE,
      'Insufficient balance'
    );
  }

  return new DepositError(
    DepositErrorCode.SUBMISSION_FAILED,
    `Contract error: ${errorStr}`
  );
}

// ─── Utils ───────────────────────────────────────────────────

export function stroopsToXlm(stroops: bigint): string {
  return (Number(stroops) / 10_000_000).toFixed(7);
}

export const DEFAULT_BASE_FEE = BigInt(BASE_FEE);