import { StrKey } from "@stellar/stellar-base";
import { computeNullifierHash, hexToField } from "./encoding";
import type { PreparedWitness } from "./proof";
import {
  MERKLE_TREE_DEPTH,
  assertMerkleDepth,
  merkleMaxLeafIndex,
} from "./merkle";
import { WitnessValidationError } from "./errors";
import {
  GROTH16_PROOF_BYTE_LENGTH as ZK_GROTH16_PROOF_BYTE_LENGTH,
  ZERO_FIELD_HEX,
} from "./zk_constants";

const FIELD_HEX = /^[0-9a-fA-F]{64}$/;

/** On-chain and SDK expectation for a Groth16 proof payload (A || B || C) for the withdrawal circuit. */
export const GROTH16_PROOF_BYTE_LENGTH = ZK_GROTH16_PROOF_BYTE_LENGTH;

export interface WitnessValidationOptions {
  merkleDepth?: number;
}

function assertFieldHexString(value: string, publicName: string): void {
  if (typeof value !== "string" || !FIELD_HEX.test(value)) {
    throw new WitnessValidationError(
      `${publicName} must be a 64-digit hex string (32-byte field)`,
      "FIELD_ENCODING",
      "structure",
    );
  }
  try {
    hexToField(value);
  } catch (e) {
    throw new WitnessValidationError(
      `${publicName} is not a valid field encoding: ${(e as Error).message}`,
      "FIELD_ENCODING",
      "structure",
    );
  }
}

function assertAmountFeeFields(
  amountHex: string,
  feeHex: string,
  amountLabel: string,
  feeLabel: string,
): { amount: bigint; fee: bigint } {
  assertFieldHexString(amountHex, amountLabel);
  assertFieldHexString(feeHex, feeLabel);
  
  // ZK-082: Reject decimal strings for amount and fee
  // A decimal string is one that is NOT a 64-char hex string but contains only digits
  if (amountHex.length !== 64 && /^\d+$/.test(amountHex)) {
    throw new WitnessValidationError(
      `${amountLabel} must be a canonical 64-character field hex string, not a decimal string`,
      "FIELD_ENCODING",
      "structure",
    );
  }
  if (feeHex.length !== 64 && /^\d+$/.test(feeHex)) {
    throw new WitnessValidationError(
      `${feeLabel} must be a canonical 64-character field hex string, not a decimal string`,
      "FIELD_ENCODING",
      "structure",
    );
  }
  
  const amount = hexToField(amountHex, amountLabel);
  const fee = hexToField(feeHex, feeLabel);
  if (fee > amount) {
    throw new WitnessValidationError(
      "fee cannot exceed amount",
      "WITNESS_SEMANTICS",
      "domain",
    );
  }
  if (amount < 0n) {
    throw new WitnessValidationError(
      "amount must be non-negative",
      "WITNESS_SEMANTICS",
      "domain",
    );
  }
  return { amount, fee };
}

/**
 * Validates a Stellar G-strkey (Ed25519 account) before it is hashed into a field.
 */
export function assertValidStellarAccountId(
  address: string,
  label: string = "address",
): void {
  if (address.length === 0) {
    throw new WitnessValidationError(
      `${label} must be non-empty`,
      "ADDRESS",
      "structure",
    );
  }
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new WitnessValidationError(
      `${label} is not a valid Stellar Ed25519 strkey`,
      "ADDRESS",
      "structure",
    );
  }
}

/**
 * Verifies a prepared witness object for structural safety and protocol consistency
 * (nullifier hash binding, fee / relayer rules) before a proving backend is invoked.
 * 
 * ZK-082: Validates that amount, fee, and denomination are canonical 64-character
 * field hex strings, rejecting decimal strings.
 */
export function assertValidPreparedWithdrawalWitness(
  witness: PreparedWitness,
  options: WitnessValidationOptions = {},
): void {
  const expectedDepth = assertMerkleDepth(
    options.merkleDepth ?? MERKLE_TREE_DEPTH,
    "merkleDepth",
  );
  const maxLeafIndex = merkleMaxLeafIndex(expectedDepth);

  assertFieldHexString(witness.pool_id, "pool_id");
  assertFieldHexString(witness.nullifier, "nullifier");
  assertFieldHexString(witness.secret, "secret");
  assertFieldHexString(witness.root, "root");
  assertFieldHexString(witness.nullifier_hash, "nullifier_hash");
  assertFieldHexString(witness.recipient, "recipient");
  assertFieldHexString(witness.relayer, "relayer");
  assertFieldHexString(witness.leaf_index, "leaf_index");
  const leafIdx = hexToField(witness.leaf_index, "leaf_index");
  if (leafIdx > BigInt(maxLeafIndex)) {
    throw new WitnessValidationError(
      `leafIndex out of range for tree depth (max ${maxLeafIndex})`,
      "LEAF_INDEX",
      "domain",
    );
  }

  if (
    !Array.isArray(witness.hash_path) ||
    witness.hash_path.length !== expectedDepth
  ) {
    throw new WitnessValidationError(
      `hash_path must be an array of length ${expectedDepth}`,
      "MERKLE_PATH",
      "structure",
    );
  }
  for (let i = 0; i < witness.hash_path.length; i++) {
    assertFieldHexString(witness.hash_path[i]!, `hash_path[${i}]`);
  }

  const { fee } = assertAmountFeeFields(
    witness.amount,
    witness.fee,
    "amount",
    "fee",
  );
  
  // ZK-082: Validate denomination is canonical field hex
  assertFieldHexString(witness.denomination, "denomination");
  if (witness.denomination.length !== 64 && /^\d+$/.test(witness.denomination)) {
    throw new WitnessValidationError(
      "denomination must be a canonical 64-character field hex string, not a decimal string",
      "FIELD_ENCODING",
      "structure",
    );
  }
  
  if (fee === 0n && witness.relayer !== ZERO_FIELD_HEX) {
    throw new WitnessValidationError(
      "relayer must be the zero field when fee is zero (matches on-chain / circuit rules)",
      "WITNESS_SEMANTICS",
      "domain",
    );
  }
  if (fee > 0n && witness.relayer === ZERO_FIELD_HEX) {
    throw new WitnessValidationError(
      "relayer must be non-zero in the field when fee is non-zero",
      "WITNESS_SEMANTICS",
      "domain",
    );
  }

  // ZK-035: Pool-scoped nullifier hash validation
  const expectNh = computeNullifierHash(witness.nullifier, witness.pool_id);
  if (expectNh !== witness.nullifier_hash) {
    throw new WitnessValidationError(
      "nullifier_hash is inconsistent with (nullifier, pool_id); possible cross-pool or replay issue",
      "WITNESS_SEMANTICS",
      "domain",
    );
  }
}

/**
 * Fails on malformed **formatted** raw proof bytes before the verifier runs.
 */
export function assertValidGroth16ProofBytes(
  proof: Uint8Array,
  label: string = "proof",
): void {
  if (proof.length !== GROTH16_PROOF_BYTE_LENGTH) {
    throw new WitnessValidationError(
      `${label} must be ${GROTH16_PROOF_BYTE_LENGTH} bytes, got ${proof.length}`,
      "PROOF_FORMAT",
      "structure",
    );
  }
}
