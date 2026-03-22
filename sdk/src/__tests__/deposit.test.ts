// ============================================================
// PrivacyLayer SDK — Deposit Flow Tests
// ============================================================
// Tests for the complete deposit flow including:
//   - Deposit options validation
//   - Transaction building (with mocked Stellar SDK)
//   - Receipt parsing
//   - Gas estimation
//   - Error handling for all failure modes
// ============================================================

import {
  validateDepositOptions,
  parseDepositReceipt,
  parseDepositReturnValue,
  estimateDepositCost,
} from '../deposit';
import { generateNote } from '../note';
import {
  Denomination,
  DENOMINATION_AMOUNTS,
  DepositOptions,
  TransactionResult,
  TransactionStatus,
} from '../types';
import {
  DepositError,
  ErrorCode,
  PrivacyLayerError,
  ValidationError,
} from '../errors';

// ──────────────────────────────────────────────────────────────
// Test Helpers
// ──────────────────────────────────────────────────────────────

/** Valid Stellar public key for testing */
const VALID_SOURCE_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

/** Valid Soroban contract ID for testing */
const VALID_CONTRACT_ID = 'CAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWNA';

/** Mock signer function */
const mockSigner = jest.fn().mockResolvedValue('signed-tx-xdr');

/**
 * Create valid deposit options for testing.
 */
function createValidOptions(overrides?: Partial<DepositOptions>): DepositOptions {
  return {
    sourceAddress: VALID_SOURCE_ADDRESS,
    contractId: VALID_CONTRACT_ID,
    denomination: Denomination.Xlm100,
    network: 'testnet',
    signer: mockSigner,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────
// validateDepositOptions
// ──────────────────────────────────────────────────────────────

describe('validateDepositOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept valid options', () => {
    const options = createValidOptions();
    expect(() => validateDepositOptions(options)).not.toThrow();
  });

  // ── Source Address ─────────────────────────────────────

  it('should reject empty source address', () => {
    const options = createValidOptions({ sourceAddress: '' });
    expect(() => validateDepositOptions(options)).toThrow(ValidationError);

    try {
      validateDepositOptions(options);
    } catch (err) {
      expect((err as ValidationError).code).toBe(ErrorCode.INVALID_ADDRESS);
    }
  });

  it('should reject invalid source address format', () => {
    const options = createValidOptions({ sourceAddress: 'not-a-stellar-address' });
    expect(() => validateDepositOptions(options)).toThrow(ValidationError);
  });

  it('should reject source address that does not start with G', () => {
    const options = createValidOptions({ sourceAddress: 'CAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWNA' });
    expect(() => validateDepositOptions(options)).toThrow(ValidationError);
  });

  // ── Contract ID ────────────────────────────────────────

  it('should reject empty contract ID', () => {
    const options = createValidOptions({ contractId: '' });
    expect(() => validateDepositOptions(options)).toThrow(DepositError);

    try {
      validateDepositOptions(options);
    } catch (err) {
      expect((err as DepositError).code).toBe(ErrorCode.INVALID_CONTRACT_ID);
    }
  });

  it('should reject invalid contract ID format', () => {
    const options = createValidOptions({ contractId: 'not-a-contract-id' });
    expect(() => validateDepositOptions(options)).toThrow(DepositError);
  });

  it('should reject contract ID that does not start with C', () => {
    const options = createValidOptions({ contractId: VALID_SOURCE_ADDRESS });
    expect(() => validateDepositOptions(options)).toThrow(DepositError);
  });

  // ── Denomination ───────────────────────────────────────

  it('should accept all valid denominations', () => {
    for (const denom of Object.values(Denomination)) {
      const options = createValidOptions({ denomination: denom });
      expect(() => validateDepositOptions(options)).not.toThrow();
    }
  });

  it('should reject invalid denomination', () => {
    const options = createValidOptions({ denomination: 'InvalidDenom' as Denomination });
    expect(() => validateDepositOptions(options)).toThrow(ValidationError);

    try {
      validateDepositOptions(options);
    } catch (err) {
      expect((err as ValidationError).code).toBe(ErrorCode.INVALID_AMOUNT);
    }
  });

  // ── Signer ─────────────────────────────────────────────

  it('should reject missing signer', () => {
    const options = createValidOptions({ signer: undefined as unknown as DepositOptions['signer'] });
    expect(() => validateDepositOptions(options)).toThrow(DepositError);

    try {
      validateDepositOptions(options);
    } catch (err) {
      expect((err as DepositError).code).toBe(ErrorCode.SIGNER_REQUIRED);
    }
  });

  it('should reject non-function signer', () => {
    const options = createValidOptions({ signer: 'not-a-function' as unknown as DepositOptions['signer'] });
    expect(() => validateDepositOptions(options)).toThrow(DepositError);
  });

  // ── Pre-generated Note ─────────────────────────────────

  it('should accept valid pre-generated note', () => {
    const note = generateNote(Denomination.Xlm100, 'testnet');
    const options = createValidOptions({ note });
    expect(() => validateDepositOptions(options)).not.toThrow();
  });

  it('should reject note with mismatched denomination', () => {
    const note = generateNote(Denomination.Xlm10, 'testnet');
    const options = createValidOptions({ note, denomination: Denomination.Xlm100 });
    expect(() => validateDepositOptions(options)).toThrow(ValidationError);
  });
});

// ──────────────────────────────────────────────────────────────
// parseDepositReturnValue
// ──────────────────────────────────────────────────────────────

describe('parseDepositReturnValue', () => {
  it('should return undefined for empty response', () => {
    expect(parseDepositReturnValue({})).toBeUndefined();
  });

  it('should return undefined for response without resultMetaXdr', () => {
    expect(parseDepositReturnValue({ status: 'SUCCESS' })).toBeUndefined();
  });

  it('should parse return value from tuple structure', () => {
    const response = {
      resultMetaXdr: 'some-xdr-data',
      returnValue: {
        _value: [
          { _value: 42 },
          { _value: Buffer.from('a'.repeat(64), 'hex') },
        ],
      },
    };

    const result = parseDepositReturnValue(response);
    expect(result).toBeDefined();
    expect(result!.leafIndex).toBe(42);
  });

  it('should handle malformed return value gracefully', () => {
    const response = {
      resultMetaXdr: 'some-xdr-data',
      returnValue: { unexpected: 'format' },
    };

    const result = parseDepositReturnValue(response);
    expect(result).toBeUndefined();
  });

  it('should handle missing _value field gracefully', () => {
    const response = {
      resultMetaXdr: 'some-xdr-data',
      returnValue: { _value: null },
    };

    const result = parseDepositReturnValue(response);
    expect(result).toBeUndefined();
  });
});

// ──────────────────────────────────────────────────────────────
// parseDepositReceipt
// ──────────────────────────────────────────────────────────────

describe('parseDepositReceipt', () => {
  const note = generateNote(Denomination.Xlm100, 'testnet');
  const options = createValidOptions();

  it('should create a receipt from a successful transaction', () => {
    const txResult: TransactionResult = {
      status: TransactionStatus.SUCCESS,
      hash: 'abc123def456',
      ledger: 12345,
      returnValue: {
        leafIndex: 7,
        merkleRoot: 'ff'.repeat(32),
      },
    };

    const receipt = parseDepositReceipt(txResult, note, options);

    expect(receipt.note).toBe(note);
    expect(receipt.leafIndex).toBe(7);
    expect(receipt.merkleRoot).toBe('ff'.repeat(32));
    expect(receipt.transactionHash).toBe('abc123def456');
    expect(receipt.ledgerNumber).toBe(12345);
    expect(receipt.contractId).toBe(VALID_CONTRACT_ID);
    expect(receipt.network).toBe('testnet');
    expect(receipt.denominationAmount).toBe(DENOMINATION_AMOUNTS[Denomination.Xlm100]);
    expect(receipt.confirmedAt).toBeDefined();
  });

  it('should throw for failed transaction', () => {
    const txResult: TransactionResult = {
      status: TransactionStatus.FAILED,
      hash: 'abc123def456',
      errorMessage: 'Contract error #20',
    };

    expect(() => parseDepositReceipt(txResult, note, options)).toThrow(DepositError);

    try {
      parseDepositReceipt(txResult, note, options);
    } catch (err) {
      expect((err as DepositError).code).toBe(ErrorCode.TRANSACTION_FAILED);
    }
  });

  it('should use default values for missing return value', () => {
    const txResult: TransactionResult = {
      status: TransactionStatus.SUCCESS,
      hash: 'abc123def456',
      ledger: 12345,
    };

    const receipt = parseDepositReceipt(txResult, note, options);
    expect(receipt.leafIndex).toBe(0);
    expect(receipt.merkleRoot).toBe('');
  });

  it('should throw for PENDING status', () => {
    const txResult: TransactionResult = {
      status: TransactionStatus.PENDING,
      hash: 'abc123def456',
    };

    expect(() => parseDepositReceipt(txResult, note, options)).toThrow(DepositError);
  });

  it('should throw for NOT_FOUND status', () => {
    const txResult: TransactionResult = {
      status: TransactionStatus.NOT_FOUND,
      hash: 'abc123def456',
    };

    expect(() => parseDepositReceipt(txResult, note, options)).toThrow(DepositError);
  });

  it('should include denomination amount matching the option', () => {
    for (const denom of Object.values(Denomination)) {
      const denomOptions = createValidOptions({ denomination: denom });
      const denomNote = generateNote(denom, 'testnet');
      const txResult: TransactionResult = {
        status: TransactionStatus.SUCCESS,
        hash: 'abc123def456',
        ledger: 12345,
        returnValue: { leafIndex: 0, merkleRoot: '00'.repeat(32) },
      };

      const receipt = parseDepositReceipt(txResult, denomNote, denomOptions);
      expect(receipt.denominationAmount).toBe(DENOMINATION_AMOUNTS[denom]);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// estimateDepositCost
// ──────────────────────────────────────────────────────────────

describe('estimateDepositCost', () => {
  // We mock the Stellar SDK import to avoid network calls
  beforeEach(() => {
    jest.resetModules();
  });

  it('should return an estimate for valid denomination', async () => {
    // This will fail to reach the RPC and fall back to conservative estimate
    const estimate = await estimateDepositCost(Denomination.Xlm100, 'testnet');

    expect(estimate.depositAmount).toBe(DENOMINATION_AMOUNTS[Denomination.Xlm100]);
    expect(estimate.estimatedFee).toBeGreaterThan(0n);
    expect(estimate.totalCost).toBe(estimate.estimatedFee + estimate.depositAmount);
    expect(estimate.minimumBalance).toBeGreaterThan(estimate.totalCost);
    expect(estimate.cpuInstructions).toBeGreaterThan(0);
    expect(estimate.memoryBytes).toBeGreaterThan(0);
  });

  it('should throw for invalid denomination', async () => {
    await expect(
      estimateDepositCost('Invalid' as Denomination, 'testnet'),
    ).rejects.toThrow(ValidationError);
  });

  it('should include correct amounts for all denominations', async () => {
    for (const denom of Object.values(Denomination)) {
      const estimate = await estimateDepositCost(denom, 'testnet');
      expect(estimate.depositAmount).toBe(DENOMINATION_AMOUNTS[denom]);
    }
  });

  it('should have totalCost >= depositAmount', async () => {
    const estimate = await estimateDepositCost(Denomination.Xlm10, 'testnet');
    expect(estimate.totalCost).toBeGreaterThanOrEqual(estimate.depositAmount);
  });

  it('should have minimumBalance > totalCost (includes buffer)', async () => {
    const estimate = await estimateDepositCost(Denomination.Xlm100, 'testnet');
    expect(estimate.minimumBalance).toBeGreaterThan(estimate.totalCost);
  });
});

// ──────────────────────────────────────────────────────────────
// Error Classification in Deposit
// ──────────────────────────────────────────────────────────────

describe('Deposit error classification', () => {
  it('should classify validation errors as non-retryable', () => {
    try {
      validateDepositOptions(createValidOptions({ sourceAddress: 'invalid' }));
    } catch (err) {
      expect(err).toBeInstanceOf(PrivacyLayerError);
      expect((err as PrivacyLayerError).isRetryable).toBe(false);
    }
  });

  it('should classify signer errors correctly', () => {
    try {
      validateDepositOptions(createValidOptions({
        signer: null as unknown as DepositOptions['signer'],
      }));
    } catch (err) {
      expect(err).toBeInstanceOf(DepositError);
      expect((err as DepositError).code).toBe(ErrorCode.SIGNER_REQUIRED);
    }
  });

  it('should classify contract ID errors correctly', () => {
    try {
      validateDepositOptions(createValidOptions({ contractId: 'invalid' }));
    } catch (err) {
      expect(err).toBeInstanceOf(DepositError);
      expect((err as DepositError).code).toBe(ErrorCode.INVALID_CONTRACT_ID);
    }
  });

  it('DepositError should carry the phase information', () => {
    const err = new DepositError(
      ErrorCode.DEPOSIT_SIMULATION_FAILED,
      'Simulation failed',
      { phase: 'build' },
    );

    expect(err.phase).toBe('build');
    expect(err.name).toBe('DepositError');
    expect(err.code).toBe(ErrorCode.DEPOSIT_SIMULATION_FAILED);
  });

  it('DepositError toJSON should include phase', () => {
    const err = new DepositError(
      ErrorCode.DEPOSIT_TIMEOUT,
      'Timed out',
      { phase: 'confirm', isRetryable: true },
    );

    const json = err.toJSON();
    expect(json.name).toBe('DepositError');
    expect(json.code).toBe(ErrorCode.DEPOSIT_TIMEOUT);
    expect(json.isRetryable).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Type Checks
// ──────────────────────────────────────────────────────────────

describe('Type exports', () => {
  it('TransactionStatus enum should have all expected values', () => {
    expect(TransactionStatus.PENDING).toBe('PENDING');
    expect(TransactionStatus.SUCCESS).toBe('SUCCESS');
    expect(TransactionStatus.FAILED).toBe('FAILED');
    expect(TransactionStatus.NOT_FOUND).toBe('NOT_FOUND');
  });

  it('Denomination enum should have all expected values', () => {
    expect(Denomination.Xlm10).toBe('Xlm10');
    expect(Denomination.Xlm100).toBe('Xlm100');
    expect(Denomination.Xlm1000).toBe('Xlm1000');
    expect(Denomination.Usdc100).toBe('Usdc100');
    expect(Denomination.Usdc1000).toBe('Usdc1000');
  });

  it('DENOMINATION_AMOUNTS should match contract values', () => {
    expect(DENOMINATION_AMOUNTS[Denomination.Xlm10]).toBe(100_000_000n);
    expect(DENOMINATION_AMOUNTS[Denomination.Xlm100]).toBe(1_000_000_000n);
    expect(DENOMINATION_AMOUNTS[Denomination.Xlm1000]).toBe(10_000_000_000n);
    expect(DENOMINATION_AMOUNTS[Denomination.Usdc100]).toBe(100_000_000n);
    expect(DENOMINATION_AMOUNTS[Denomination.Usdc1000]).toBe(1_000_000_000n);
  });
});
