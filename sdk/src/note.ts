import { randomBytes } from 'crypto';

/**
 * PrivacyLayer Note
 * 
 * Represents a private "IOU" in the shielded pool.
 * A note consists of a nullifier (revealed on withdrawal) and a secret (never revealed).
 * The commitment = Hash(nullifier, secret) is what's stored in the Merkle tree.
 */
export class Note {
  constructor(
    public readonly nullifier: Buffer,
    public readonly secret: Buffer,
    public readonly poolId: string,
    public readonly amount: bigint
  ) {
    if (nullifier.length !== 31 || secret.length !== 31) {
      throw new Error('Nullifier and secret must be 31 bytes to fit BN254 field');
    }
  }

  /**
   * Create a new random note for a specific pool.
   */
  static generate(poolId: string, amount: bigint): Note {
    return new Note(
      randomBytes(31),
      randomBytes(31),
      poolId,
      amount
    );
  }

  /**
   * In a real implementation, this would use a WASM-based Poseidon hash
   * compatible with the Noir circuit and Soroban host function.
   */
  getCommitment(): Buffer {
    // Placeholder: In production, use @noir-lang/barretenberg or similar
    // for Poseidon(nullifier, secret)
    return Buffer.alloc(32); 
  }

  /**
   * Serialize note to a secure string (e.g., for backup).
   */
  serialize(): string {
    const data = Buffer.concat([
      this.nullifier,
      this.secret,
      Buffer.from(this.poolId, 'hex'),
      Buffer.alloc(16) // amount padding
    ]);
    // writeBigUInt64BE for amount
    data.writeBigUInt64BE(this.amount, 31 + 31 + 32);
    return `privacylayer-note-${data.toString('hex')}`;
  }

  /**
   * Deserialize note from a string.
   */
  static deserialize(noteStr: string): Note {
    if (!noteStr.startsWith('privacylayer-note-')) {
      throw new Error('Invalid note format');
    }
    const hex = noteStr.replace('privacylayer-note-', '');
    const data = Buffer.from(hex, 'hex');
    
    const nullifier = data.subarray(0, 31);
    const secret = data.subarray(31, 62);
    const poolId = data.subarray(62, 94).toString('hex');
    const amount = data.readBigUInt64BE(94);
    
    return new Note(nullifier, secret, poolId, amount);
  }
}
