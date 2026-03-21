/**
 * Main entry point for PrivacyLayer SDK.
 * @module @privacylayer/sdk
 */

// Types
export {
  Denomination,
  type Note,
  type DepositReceipt,
  type NetworkConfig,
  type WithdrawParams,
  TransactionStatus,
  type TransactionResult,
} from "./types";

// Constants
export { NETWORKS, MERKLE_TREE_DEPTH, FIELD_SIZE, ZERO_VALUE, SDK_VERSION } from "./constants";

// Utilities
export {
  randomFieldElement,
  randomHex,
  sha256,
  mimcHash,
  computeCommitment,
  computeNullifierHash,
} from "./utils/crypto";

export {
  hexToBytes,
  bytesToHex,
  toBase64,
  fromBase64,
  bigintToHex,
  hexToBigint,
} from "./utils/encoding";

export {
  isValidStellarAddress,
  isValidHex,
  isFieldElement,
  isValidDenomination,
  isValidAmount,
} from "./utils/validation";
