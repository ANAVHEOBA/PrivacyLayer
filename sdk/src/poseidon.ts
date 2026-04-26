import { poseidon2Hash } from '@zkpassport/poseidon2';
import {
  fieldToBuffer,
  fieldToHex,
  hexToField,
  noteScalarToField,
  poolIdToField,
} from './encoding';

function toBigIntInput(value: string, index: number): bigint {
  return hexToField(value, `poseidon input[${index}]`);
}

export function poseidonHash(inputs: readonly bigint[]): bigint {
  return poseidon2Hash([...inputs]);
}

export function poseidonFieldHex(inputs: readonly string[]): string {
  return fieldToHex(
    poseidonHash(inputs.map((value, index) => toBigIntInput(value, index)))
  );
}

export function poseidonFieldBuffer(inputs: readonly string[]): Buffer {
  return fieldToBuffer(
    poseidonHash(inputs.map((value, index) => toBigIntInput(value, index)))
  );
}

export function computeNoteCommitmentField(
  nullifier: Buffer | Uint8Array,
  secret: Buffer | Uint8Array,
  poolId: string
): string {
  return poseidonFieldHex([
    noteScalarToField(Buffer.from(nullifier)),
    noteScalarToField(Buffer.from(secret)),
    poolIdToField(poolId),
  ]);
}

export function computeNoteCommitmentBytes(
  nullifier: Buffer | Uint8Array,
  secret: Buffer | Uint8Array,
  poolId: string
): Buffer {
  return Buffer.from(computeNoteCommitmentField(nullifier, secret, poolId), 'hex');
}
