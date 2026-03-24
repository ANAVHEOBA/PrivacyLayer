/**
 * Validation utilities
 */

import { isValidFieldElement, isValidBytes32 } from './crypto';
import { Denomination } from '../types';

/**
 * Validate Stellar address
 */
export function isValidStellarAddress(address: string): boolean {
  // Stellar addresses start with G and are 56 characters long
  const pattern = /^G[A-Z0-9]{55}$/;
  return pattern.test(address);
}

/**
 * Validate contract ID (Soroban contract address)
 */
export function isValidContractId(contractId: string): boolean {
  // Contract IDs start with C and are 56 characters long
  const pattern = /^C[A-Z0-9]{55}$/;
  return pattern.test(contractId);
}

/**
 * Validate amount is positive integer
 */
export function isValidAmount(amount: bigint | number | string): boolean {
  try {
    const value = BigInt(amount);
    return value > 0n;
  } catch {
    return false;
  }
}

/**
 * Validate denomination
 */
export function isValidDenomination(denomination: number): boolean {
  return Object.values(Denomination).includes(denomination as Denomination);
}

/**
 * Validate hex string length
 */
export function validateHexLength(hex: string, expectedBytes: number): boolean {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return cleanHex.length === expectedBytes * 2;
}

/**
 * Validate note structure
 */
export function validateNote(note: {
  nullifier: string;
  secret: string;
  commitment: string;
  denomination: number;
}): string[] {
  const errors: string[] = [];

  if (!isValidFieldElement(note.nullifier)) {
    errors.push('Invalid nullifier field element');
  }
  if (!isValidFieldElement(note.secret)) {
    errors.push('Invalid secret field element');
  }
  if (!isValidBytes32(note.commitment)) {
    errors.push('Invalid commitment format (must be 32 bytes hex)');
  }
  if (!isValidDenomination(note.denomination)) {
    errors.push('Invalid denomination');
  }

  return errors;
}

/**
 * Validate network configuration
 */
export function validateNetworkConfig(config: {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
}): string[] {
  const errors: string[] = [];

  if (!config.rpcUrl || typeof config.rpcUrl !== 'string') {
    errors.push('Invalid rpcUrl');
  }
  if (!config.networkPassphrase || typeof config.networkPassphrase !== 'string') {
    errors.push('Invalid networkPassphrase');
  }
  if (config.contractId && !isValidContractId(config.contractId)) {
    errors.push('Invalid contractId');
  }

  return errors;
}

/**
 * Validate fee doesn't exceed amount
 */
export function validateFee(fee: bigint, amount: bigint): boolean {
  return fee >= 0n && fee <= amount;
}
