/**
 * Input validation utilities for PrivacyLayer SDK
 */

import { isValidPublicKey, isValidSecretKey } from '../crypto/keys';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate contract ID format
 * Soroban contract IDs are 56-character base32 strings
 */
export function validateContractId(contractId: string): ValidationResult {
  if (!contractId || contractId.length === 0) {
    return { valid: false, error: 'Contract ID is required' };
  }

  // Soroban contract IDs are typically 56 characters
  if (contractId.length !== 56) {
    return {
      valid: false,
      error: `Invalid contract ID length: expected 56, got ${contractId.length}`,
    };
  }

  // Check valid base32 characters
  const base32Regex = /^[A-Z2-7]+$/;
  if (!base32Regex.test(contractId)) {
    return { valid: false, error: 'Contract ID contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validate amount for shielded transactions
 */
export function validateAmount(amount: bigint | string | number): ValidationResult {
  if (amount === null || amount === undefined) {
    return { valid: false, error: 'Amount is required' };
  }

  let amountBigInt: bigint;

  try {
    amountBigInt = BigInt(amount);
  } catch {
    return { valid: false, error: 'Amount must be a valid integer' };
  }

  if (amountBigInt <= BigInt(0)) {
    return { valid: false, error: 'Amount must be positive' };
  }

  // Check for overflow (Stellar uses 64-bit integers)
  const MAX_AMOUNT = BigInt('9223372036854775807'); // i64::MAX
  if (amountBigInt > MAX_AMOUNT) {
    return { valid: false, error: 'Amount exceeds maximum allowed value' };
  }

  return { valid: true };
}

/**
 * Validate asset code
 */
export function validateAssetCode(assetCode: string): ValidationResult {
  if (!assetCode || assetCode.length === 0) {
    return { valid: false, error: 'Asset code is required' };
  }

  // Alphanumeric 4 or 12 character maximum
  if (assetCode.length > 12) {
    return { valid: false, error: 'Asset code must be 12 characters or less' };
  }

  // Valid characters: letters, digits
  const validRegex = /^[a-zA-Z0-9]+$/;
  if (!validRegex.test(assetCode)) {
    return { valid: false, error: 'Asset code must be alphanumeric' };
  }

  return { valid: true };
}

/**
 * Validate Stellar address
 */
export function validateAddress(address: string): ValidationResult {
  if (!address || address.length === 0) {
    return { valid: false, error: 'Address is required' };
  }

  if (!isValidPublicKey(address)) {
    return { valid: false, error: 'Invalid Stellar public key' };
  }

  return { valid: true };
}

/**
 * Validate secret key
 */
export function validateSecretKey(secretKey: string): ValidationResult {
  if (!secretKey || secretKey.length === 0) {
    return { valid: false, error: 'Secret key is required' };
  }

  if (!isValidSecretKey(secretKey)) {
    return { valid: false, error: 'Invalid Stellar secret key' };
  }

  return { valid: true };
}

/**
 * Validate byte array length
 */
export function validateByteArray(
  data: Uint8Array,
  expectedLength: number,
  fieldName: string
): ValidationResult {
  if (!data || !(data instanceof Uint8Array)) {
    return { valid: false, error: `${fieldName} must be a Uint8Array` };
  }

  if (data.length !== expectedLength) {
    return {
      valid: false,
      error: `${fieldName} must be ${expectedLength} bytes, got ${data.length}`,
    };
  }

  return { valid: true };
}

/**
 * Validate network identifier
 */
export function validateNetwork(network: string): ValidationResult {
  const validNetworks = ['mainnet', 'testnet', 'futurenet'];

  if (!network || network.length === 0) {
    return { valid: false, error: 'Network is required' };
  }

  if (!validNetworks.includes(network)) {
    return {
      valid: false,
      error: `Invalid network: must be one of ${validNetworks.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Validate deposit parameters
 */
export function validateDepositParams(params: {
  amount: bigint | string | number;
  asset: string;
  recipientCommitment: Uint8Array;
}): ValidationResult {
  const amountValidation = validateAmount(params.amount);
  if (!amountValidation.valid) return amountValidation;

  const assetValidation = validateAssetCode(params.asset);
  if (!assetValidation.valid) return assetValidation;

  const commitmentValidation = validateByteArray(
    params.recipientCommitment,
    32,
    'recipientCommitment'
  );
  if (!commitmentValidation.valid) return commitmentValidation;

  return { valid: true };
}

/**
 * Validate withdrawal parameters
 */
export function validateWithdrawParams(params: {
  nullifier: Uint8Array;
  proof: Uint8Array;
  root: Uint8Array;
}): ValidationResult {
  const nullifierValidation = validateByteArray(params.nullifier, 32, 'nullifier');
  if (!nullifierValidation.valid) return nullifierValidation;

  const proofValidation = validateByteArray(params.proof, 256, 'proof');
  if (!proofValidation.valid) return proofValidation;

  const rootValidation = validateByteArray(params.root, 32, 'root');
  if (!rootValidation.valid) return rootValidation;

  return { valid: true };
}
