/**
 * Thrown when withdrawal witness or proof inputs fail structural validation
 * (lengths, encodings) before a proving backend is invoked. Use
 * `code` to distinguish from honest proving/verification errors.
 */
export class WitnessValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'MERKLE_PATH'
      | 'LEAF_INDEX'
      | 'FIELD_ENCODING'
      | 'ADDRESS'
      | 'WITNESS_SEMANTICS'
      | 'PROOF_FORMAT',
    public readonly reason?: 'structure' | 'domain'
  ) {
    super(message);
    this.name = 'WitnessValidationError';
    this.reason = reason ?? 'structure';

    // Maintain prototype chain
    Object.setPrototypeOf(this, WitnessValidationError.prototype);
  }
}
