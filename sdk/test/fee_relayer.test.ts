/**
 * ZK-036 – Canonical relayer/fee encoding rule (SDK side)
 *
 * This module is the single TypeScript source of truth for the encoding
 * contract that mirrors the Noir circuit constraints in:
 *
 *   circuits/lib/src/validation/fee.nr
 *   circuits/lib/src/validation/relayer.nr
 *
 * Encoding contract
 * -----------------
 *  R1. fee <= amount          (prevent fee-only griefing)
 *  R2. fee == 0  → relayer == ZERO_FIELD_HEX
 *  R3. fee >  0  → relayer != ZERO_FIELD_HEX
 *
 * The `prepareRelayerFeeFields` helper is the only place in witness
 * preparation that touches the relayer field.  Callers MUST use it
 * instead of constructing relayer/fee fields ad-hoc.
 */

import { WitnessValidationError } from "./errors";
import { ZERO_FIELD_HEX, STELLAR_ZERO_ACCOUNT } from "./zk_constants";
import { fieldToHex, stellarAddressToField } from "./encoding";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface RelayerFeeValidationInput {
  fee: bigint;
  amount: bigint;
  /** Raw relayer field value (64-char hex, no 0x prefix). */
  relayerField: string;
}

/**
 * Validate the relayer/fee pair against the canonical encoding rule.
 *
 * Throws `WitnessValidationError` for any violation so the error surfaces
 * before the witness reaches the prover.
 */
export function validateRelayerFeeEncoding(
  input: RelayerFeeValidationInput,
): void {
  const { fee, amount, relayerField } = input;

  // R1: fee <= amount
  if (fee > amount) {
    throw new WitnessValidationError(
      `fee (${fee}) cannot exceed withdrawal amount (${amount})`,
      "FEE",
      "domain",
    );
  }

  const isZeroRelayer = relayerField === ZERO_FIELD_HEX;

  // R2: fee == 0 → relayer must be zero
  if (fee === 0n && !isZeroRelayer) {
    throw new WitnessValidationError(
      `relayer must be zero address when fee is zero, got relayerField=${relayerField}`,
      "RELAYER",
      "domain",
    );
  }

  // R3: fee > 0 → relayer must be non-zero
  if (fee > 0n && isZeroRelayer) {
    throw new WitnessValidationError(
      `relayer must be a non-zero address when fee (${fee}) is non-zero`,
      "RELAYER",
      "domain",
    );
  }
}

// ---------------------------------------------------------------------------
// Field preparation helper
// ---------------------------------------------------------------------------

export interface RelayerFeeFields {
  relayer: string;
  fee: string;
}

/**
 * Prepare canonical relayer and fee field values for the withdrawal witness.
 *
 * This is the ONLY place in the SDK that converts (relayerAddress, fee) to
 * circuit field strings.  It enforces the encoding contract and returns the
 * values ready for `PreparedWitness`.
 *
 * @param relayerAddress  Stellar address (G…) or STELLAR_ZERO_ACCOUNT when no relayer.
 * @param fee             Relayer fee in stroops (0n when no relayer).
 * @param amount          Note amount in stroops – used for R1 validation.
 */
export function prepareRelayerFeeFields(
  relayerAddress: string,
  fee: bigint,
  amount: bigint,
): RelayerFeeFields {
  // Canonical zero relayer: always use ZERO_FIELD_HEX regardless of what
  // address was supplied when fee is 0n (eliminates the magic-zero-relayer
  // convention described in ZK-036).
  const relayerField =
    fee === 0n ? ZERO_FIELD_HEX : stellarAddressToField(relayerAddress);

  validateRelayerFeeEncoding({ fee, amount, relayerField });

  return {
    relayer: relayerField,
    fee: fieldToHex(fee),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/**
 * ZK-036 SDK-side test suite for the relayer/fee encoding rule.
 *
 * Run with: ts-node fee_relayer.test.ts
 * (or import into your Jest/Vitest setup)
 */

type Case = {
  label: string;
  fee: bigint;
  amount: bigint;
  relayerField: string;
  expectError?: string; // substring of the expected error message
};

const NONZERO_RELAYER = "a".repeat(64); // 32-byte non-zero field value

const validationCases: Case[] = [
  // ---- valid combinations ----
  {
    label: "fee=0, relayer=zero – valid (no relayer)",
    fee: 0n,
    amount: 100n,
    relayerField: ZERO_FIELD_HEX,
  },
  {
    label: "fee=amount, relayer=nonzero – valid (full fee)",
    fee: 100n,
    amount: 100n,
    relayerField: NONZERO_RELAYER,
  },
  {
    label: "fee<amount, relayer=nonzero – valid (partial fee)",
    fee: 10n,
    amount: 100n,
    relayerField: NONZERO_RELAYER,
  },
  // ---- invalid combinations ----
  {
    label: "fee>amount – R1 violation",
    fee: 101n,
    amount: 100n,
    relayerField: NONZERO_RELAYER,
    expectError: "cannot exceed withdrawal amount",
  },
  {
    label: "fee=0, relayer=nonzero – R2 violation (phantom relayer)",
    fee: 0n,
    amount: 100n,
    relayerField: NONZERO_RELAYER,
    expectError: "relayer must be zero address when fee is zero",
  },
  {
    label: "fee>0, relayer=zero – R3 violation (orphan fee)",
    fee: 10n,
    amount: 100n,
    relayerField: ZERO_FIELD_HEX,
    expectError: "relayer must be a non-zero address when fee",
  },
  {
    label: "fee=amount=0, relayer=nonzero – R2 violation",
    fee: 0n,
    amount: 0n,
    relayerField: NONZERO_RELAYER,
    expectError: "relayer must be zero address when fee is zero",
  },
];

type PrepCase = {
  label: string;
  relayerAddress: string;
  fee: bigint;
  amount: bigint;
  expectError?: string;
  expectRelayerZero?: boolean;
};

const prepCases: PrepCase[] = [
  {
    label: "no relayer (fee=0) → relayer field forced to zero",
    relayerAddress: "GABCDEFG",           // non-empty address, but fee=0 so ignored
    fee: 0n,
    amount: 100n,
    expectRelayerZero: true,
  },
  {
    label: "with relayer (fee>0) → relayer field is stellarAddressToField",
    relayerAddress: STELLAR_ZERO_ACCOUNT, // placeholder – real address in prod
    fee: 5n,
    amount: 100n,
    // No error expected; relayer will be non-zero because fee > 0
  },
  {
    label: "fee > amount → error",
    relayerAddress: STELLAR_ZERO_ACCOUNT,
    fee: 200n,
    amount: 100n,
    expectError: "cannot exceed withdrawal amount",
  },
];

function runTests(): void {
  console.log("=== ZK-036 Fee/Relayer Encoding Tests ===\n");

  let failures = 0;
  let total = 0;

  // validateRelayerFeeEncoding cases
  console.log("--- validateRelayerFeeEncoding ---");
  for (const c of validationCases) {
    total++;
    let passed = false;
    try {
      validateRelayerFeeEncoding({ fee: c.fee, amount: c.amount, relayerField: c.relayerField });
      if (c.expectError) {
        console.log(`FAIL  ${c.label}`);
        console.log(`      Expected error containing "${c.expectError}" but no error was thrown`);
        failures++;
      } else {
        console.log(`PASS  ${c.label}`);
        passed = true;
      }
    } catch (err: any) {
      if (c.expectError) {
        if (err.message.includes(c.expectError)) {
          console.log(`PASS  ${c.label}`);
          passed = true;
        } else {
          console.log(`FAIL  ${c.label}`);
          console.log(`      Expected error "${c.expectError}" but got "${err.message}"`);
          failures++;
        }
      } else {
        console.log(`FAIL  ${c.label}`);
        console.log(`      Unexpected error: ${err.message}`);
        failures++;
      }
    }
  }

  // prepareRelayerFeeFields cases
  console.log("\n--- prepareRelayerFeeFields ---");
  for (const c of prepCases) {
    total++;
    try {
      const fields = prepareRelayerFeeFields(c.relayerAddress, c.fee, c.amount);
      if (c.expectError) {
        console.log(`FAIL  ${c.label}`);
        console.log(`      Expected error containing "${c.expectError}" but no error was thrown`);
        failures++;
        continue;
      }
      if (c.expectRelayerZero && fields.relayer !== ZERO_FIELD_HEX) {
        console.log(`FAIL  ${c.label}`);
        console.log(`      Expected relayer=ZERO_FIELD_HEX but got ${fields.relayer}`);
        failures++;
        continue;
      }
      if (!c.expectRelayerZero && c.fee > 0n && fields.relayer === ZERO_FIELD_HEX) {
        console.log(`FAIL  ${c.label}`);
        console.log(`      Expected non-zero relayer for fee=${c.fee} but got ZERO_FIELD_HEX`);
        failures++;
        continue;
      }
      console.log(`PASS  ${c.label}`);
    } catch (err: any) {
      if (c.expectError && err.message.includes(c.expectError)) {
        console.log(`PASS  ${c.label}`);
      } else {
        console.log(`FAIL  ${c.label}`);
        console.log(`      ${c.expectError ? `Expected "${c.expectError}" but got:` : "Unexpected error:"} ${err.message}`);
        failures++;
      }
    }
  }

  const passed = total - failures;
  console.log(`\n${passed}/${total} tests passed.`);

  if (failures > 0) {
    process.exit(1);
  }
}

// Run when executed directly
runTests();