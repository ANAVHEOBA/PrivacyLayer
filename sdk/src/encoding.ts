/**
 * Encoding Module (ZK-008)
 *
 * This module re-exports all encoding functions from the dedicated public_inputs
 * module for backward compatibility. All new code should import directly from
 * public_inputs.ts to ensure consistent encoding across the SDK.
 *
 * @deprecated Import from public_inputs.ts instead for new code.
 */

// Re-export all public input encoding functions
export {
  // Field element encoding
  fieldToHex,
  hexToField,
  bufferToField,
  fieldToBuffer,
  
  // Public input encoding
  encodePoolId,
  encodeMerkleRoot,
  encodeNullifier,
  encodeSecret,
  encodeStellarAddress,
  encodeAmount,
  encodeFee,
  encodeDenomination,
  encodeNullifierHash,
  
  // Schemas and types
  WITHDRAWAL_PUBLIC_INPUT_SCHEMA,
  CONTRACT_VERIFIER_INPUT_SCHEMA,
  type WithdrawalPublicInputKey,
  type ContractVerifierInputKey,
  type WithdrawalPublicInputs,
  type ContractVerifierInputs,
  
  // Serialization
  type SerializedWithdrawalPublicInputs,
  type SerializedContractVerifierInputs,
  collectWithdrawalPublicInputs,
  serializeWithdrawalPublicInputs,
  serializeContractVerifierInputs,
  packWithdrawalPublicInputs,
  
  // Legacy aliases for backward compatibility
  noteScalarToField,
  merkleNodeToField,
  stellarAddressToField,
  poolIdToField,
  computeNullifierHash,
} from './public_inputs';
