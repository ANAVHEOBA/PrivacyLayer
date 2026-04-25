import type { MerkleProof } from './proof';
import { WitnessValidationError } from './errors';
import { ZK_FIELD_BYTES, ZK_MAX_LEAF_INDEX, ZK_TREE_DEPTH } from './constants';

/** Matches `hash_path: [Field; 20]` in `circuits/withdraw/src/main.nr`. */
export const MERKLE_TREE_DEPTH = ZK_TREE_DEPTH;
export const MERKLE_MAX_LEAF_INDEX = ZK_MAX_LEAF_INDEX;

/**
 * Validate the Merkle proof object before it is encoded for the prover.
 * Catches truncated / overlong paths and invalid index range early.
 */
export function validateMerkleProof(merkleProof: MerkleProof, depth: number = MERKLE_TREE_DEPTH): void {
  if (merkleProof.root.length !== ZK_FIELD_BYTES) {
    throw new WitnessValidationError(
      `Merkle root must be ${ZK_FIELD_BYTES} bytes, got ${merkleProof.root.length}`,
      'MERKLE_PATH',
      'structure'
    );
  }
  if (merkleProof.pathElements.length !== depth) {
    throw new WitnessValidationError(
      `Merkle path must have ${depth} elements, got ${merkleProof.pathElements.length}`,
      'MERKLE_PATH',
      'structure'
    );
  }
  for (let i = 0; i < merkleProof.pathElements.length; i++) {
    const el = merkleProof.pathElements[i];
    if (el.length !== ZK_FIELD_BYTES) {
      throw new WitnessValidationError(
        `Merkle path element at index ${i} must be ${ZK_FIELD_BYTES} bytes, got ${el.length}`,
        'MERKLE_PATH',
        'structure'
      );
    }
  }
  if (!Number.isInteger(merkleProof.leafIndex) || merkleProof.leafIndex < 0) {
    throw new WitnessValidationError('leafIndex must be a non-negative integer', 'LEAF_INDEX', 'structure');
  }
  if (merkleProof.leafIndex > MERKLE_MAX_LEAF_INDEX) {
    throw new WitnessValidationError(
      `leafIndex out of range for tree depth (max ${MERKLE_MAX_LEAF_INDEX})`,
      'LEAF_INDEX',
      'structure'
    );
  }
  const pidx = merkleProof.pathIndices;
  if (pidx !== undefined && pidx.length > 0) {
    if (pidx.length !== merkleProof.pathElements.length) {
      throw new WitnessValidationError(
        'pathIndices length does not match path length',
        'MERKLE_PATH',
        'structure'
      );
    }
  }
}
