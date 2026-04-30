/**
 * ZK-073 – Unified relayer binding contract (SDK side)
 *
 * This module defines the canonical relayer binding contract shared between:
 *   - SDK serialization (sdk/src/proof.ts — prepareRelayerFeeFields)
 *   - Circuit validation (circuits/lib/src/validation/fee.nr)
 *   - Contract handling (contracts/privacy_pool/src/utils/address_decoder.rs)
 *
 * Binding Contract
 * ----------------
 *   Mode 1: No relayer
 *     relayerField === ZERO_FIELD_HEX (32 zero bytes)
 *     fee === 0n
 *
 *   Mode 2: Relayer with fee
 *     relayerField !== ZERO_FIELD_HEX
 *     fee > 0n
 *     relayerField = stellarAddressToField(validStellarAddress)
 *
 *   Mode 3: Malformed relayer (REJECTED)
 *     Any encoding that does not match Mode 1 or Mode 2, including:
 *     - fee === 0 but relayerField !== ZERO_FIELD_HEX (phantom relayer)
 *     - fee > 0 but relayerField === ZERO_FIELD_HEX (orphan fee)
 *     - relayerField that was not produced by stellarAddressToField
 *
 * Wave Issue Key: ZK-073
 */

import {
  ZERO_FIELD_HEX,
  STELLAR_ZERO_ACCOUNT,
  isZeroAccountSentinel,
} from './zk_constants';
import { stellarAddressToField, fieldToHex } from './encoding';
import { WitnessValidationError } from './errors';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

/**
 * Represents the canonical relayer binding mode.
 *
 * ZK-073: Every relayer/fee pair must resolve to exactly one of these modes.
 * The mode is determined during witness preparation and enforced at every
 * layer (SDK, circuit, contract).
 */
export type RelayerBindingMode =
  | { kind: 'no_relayer' }
  | { kind: 'relayer_with_fee'; relayerAddress: string; fee: bigint };

/**
 * Canonical relayer/fee field pair ready for inclusion in PreparedWitness.
 */
export interface RelayerBindingFields {
  /** 64-char hex string for the relayer field. ZERO_FIELD_HEX for no-relayer. */
  relayerField: string;
  /** 64-char hex string for the fee field. */
  feeField: string;
  /** The resolved binding mode. */
  mode: RelayerBindingMode;
}

// -----------------------------------------------------------------------
// Canonical field preparation (ZK-073 single entry point)
// -----------------------------------------------------------------------

/**
 * Resolve the relayer binding and produce canonical field values.
 *
 * This is the ZK-073 canonical entry point for relayer/fee field preparation.
 * It enforces the three-mode binding contract and returns field values ready
 * for the withdrawal witness.
 *
 * @param relayerAddress - Stellar address (G…) or STELLAR_ZERO_ACCOUNT / undefined for no relayer
 * @param fee - Relayer fee in base units (0n for no relayer)
 * @param amount - Withdrawal amount in base units (for fee ≤ amount check)
 * @returns Canonical relayer/fee field values and the resolved binding mode
 * @throws WitnessValidationError if the binding contract is violated
 */
export function resolveRelayerBinding(
  relayerAddress: string | undefined,
  fee: bigint,
  amount: bigint,
): RelayerBindingFields {
  // Determine the binding mode
  const isNoRelayer =
    relayerAddress === undefined ||
    relayerAddress === STELLAR_ZERO_ACCOUNT ||
    isZeroAccountSentinel(relayerAddress ?? '');

  if (isNoRelayer && fee === 0n) {
    // Mode 1: No relayer
    return {
      relayerField: ZERO_FIELD_HEX,
      feeField: fieldToHex(0n),
      mode: { kind: 'no_relayer' },
    };
  }

  if (isNoRelayer && fee > 0n) {
    // Orphan fee — fee without a relayer (Mode 3 violation)
    throw new WitnessValidationError(
      `ZK-073: fee (${fee}) is non-zero but no relayer address was provided (orphan fee)`,
      'RELAYER_BINDING',
      'domain',
    );
  }

  // Mode 2 candidate: relayer address provided
  if (fee === 0n) {
    // Phantom relayer — address provided but no fee (Mode 3 violation)
    throw new WitnessValidationError(
      `ZK-073: relayer address provided but fee is zero — use no-relayer mode instead (phantom relayer)`,
      'RELAYER_BINDING',
      'domain',
    );
  }

  // Fee validation: fee ≤ amount
  if (fee > amount) {
    throw new WitnessValidationError(
      `ZK-073: fee (${fee}) cannot exceed withdrawal amount (${amount})`,
      'RELAYER_BINDING',
      'domain',
    );
  }

  // Mode 2: Valid relayer + fee
  const relayerField = stellarAddressToField(relayerAddress!);

  return {
    relayerField,
    feeField: fieldToHex(fee),
    mode: {
      kind: 'relayer_with_fee',
      relayerAddress: relayerAddress!,
      fee,
    },
  };
}

/**
 * Classify a witness's relayer/fee pair into a binding mode.
 *
 * Used for diagnostics and regression testing — does not mutate or validate
 * beyond the binding check.
 *
 * @returns The binding mode, or 'malformed' if the pair violates the contract
 */
export function classifyRelayerBinding(
  relayerField: string,
  feeField: string,
): 'no_relayer' | 'relayer_with_fee' | 'malformed' {
  const isZeroRelayer = relayerField === ZERO_FIELD_HEX;

  // Parse fee as bigint from hex
  const fee = BigInt('0x' + feeField);

  if (isZeroRelayer && fee === 0n) {
    return 'no_relayer';
  }

  if (!isZeroRelayer && fee > 0n) {
    return 'relayer_with_fee';
  }

  // Any other combination is malformed
  return 'malformed';
}

// -----------------------------------------------------------------------
// Self-test (ZK-073 regression)
// -----------------------------------------------------------------------

const TEST_ADDRESS = 'GDJ7GPYZZGBS2HRRFZF6RESX24ZSP4QUIU2ICLM74F6L74WXP742IGOZ';

type TestResult = { label: string; passed: boolean; error?: string };

function runZK073Tests(): void {
  const results: TestResult[] = [];

  function test(label: string, fn: () => void) {
    try {
      fn();
      results.push({ label, passed: true });
    } catch (e: any) {
      results.push({ label, passed: false, error: e.message });
    }
  }

  // resolveRelayerBinding — Mode 1
  test('Mode 1: undefined address + fee=0 → no_relayer', () => {
    const r = resolveRelayerBinding(undefined, 0n, 1000n);
    if (r.mode.kind !== 'no_relayer') throw new Error(`Expected no_relayer, got ${r.mode.kind}`);
    if (r.relayerField !== ZERO_FIELD_HEX) throw new Error('Expected zero relayer field');
  });

  test('Mode 1: STELLAR_ZERO_ACCOUNT + fee=0 → no_relayer', () => {
    const r = resolveRelayerBinding(STELLAR_ZERO_ACCOUNT, 0n, 1000n);
    if (r.mode.kind !== 'no_relayer') throw new Error(`Expected no_relayer, got ${r.mode.kind}`);
  });

  // resolveRelayerBinding — Mode 2
  test('Mode 2: valid address + fee>0 → relayer_with_fee', () => {
    const r = resolveRelayerBinding(TEST_ADDRESS, 10n, 1000n);
    if (r.mode.kind !== 'relayer_with_fee') throw new Error(`Expected relayer_with_fee, got ${r.mode.kind}`);
    if (r.relayerField === ZERO_FIELD_HEX) throw new Error('Expected non-zero relayer field');
  });

  // resolveRelayerBinding — Mode 3 (rejections)
  test('Mode 3: orphan fee (no address, fee>0) → error', () => {
    try {
      resolveRelayerBinding(undefined, 10n, 1000n);
      throw new Error('Should have thrown');
    } catch (e: any) {
      if (!e.message.includes('orphan fee')) throw new Error(`Wrong error: ${e.message}`);
    }
  });

  test('Mode 3: phantom relayer (address, fee=0) → error', () => {
    try {
      resolveRelayerBinding(TEST_ADDRESS, 0n, 1000n);
      throw new Error('Should have thrown');
    } catch (e: any) {
      if (!e.message.includes('phantom relayer')) throw new Error(`Wrong error: ${e.message}`);
    }
  });

  test('Mode 3: fee exceeds amount → error', () => {
    try {
      resolveRelayerBinding(TEST_ADDRESS, 2000n, 1000n);
      throw new Error('Should have thrown');
    } catch (e: any) {
      if (!e.message.includes('cannot exceed')) throw new Error(`Wrong error: ${e.message}`);
    }
  });

  // classifyRelayerBinding
  test('classify: no_relayer', () => {
    const c = classifyRelayerBinding(ZERO_FIELD_HEX, fieldToHex(0n));
    if (c !== 'no_relayer') throw new Error(`Expected no_relayer, got ${c}`);
  });

  test('classify: relayer_with_fee', () => {
    const c = classifyRelayerBinding('a'.repeat(64), fieldToHex(10n));
    if (c !== 'relayer_with_fee') throw new Error(`Expected relayer_with_fee, got ${c}`);
  });

  test('classify: malformed (zero relayer + non-zero fee)', () => {
    const c = classifyRelayerBinding(ZERO_FIELD_HEX, fieldToHex(10n));
    if (c !== 'malformed') throw new Error(`Expected malformed, got ${c}`);
  });

  test('classify: malformed (non-zero relayer + zero fee)', () => {
    const c = classifyRelayerBinding('a'.repeat(64), fieldToHex(0n));
    if (c !== 'malformed') throw new Error(`Expected malformed, got ${c}`);
  });

  // Print results
  console.log('\n=== ZK-073 Relayer Binding Tests ===\n');
  let failures = 0;
  for (const r of results) {
    console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.label}`);
    if (!r.passed) {
      console.log(`      ${r.error}`);
      failures++;
    }
  }
  console.log(`\n${results.length - failures}/${results.length} tests passed.`);
  if (failures > 0) process.exit(1);
}

// Run when executed directly
runZK073Tests();
