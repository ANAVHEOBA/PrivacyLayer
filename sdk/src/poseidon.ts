import { poseidon2Hash } from '@zkpassport/poseidon2';
import {
  fieldToBuffer,
  fieldToHex,
  hexToField,
  noteScalarToField,
  poolIdToField,
} from './encoding';
import { COMMITMENT_DOMAIN_SEP_HEX } from './zk_constants';

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
  poolId: string,
  denomination: bigint = 0n
): string {
  return poseidonFieldHex([
    COMMITMENT_DOMAIN_SEP_HEX,
    noteScalarToField(Buffer.from(nullifier)),
    noteScalarToField(Buffer.from(secret)),
    poolIdToField(poolId),
    fieldToHex(denomination),
  ]);
}

export function computeNoteCommitmentBytes(
  nullifier: Buffer | Uint8Array,
  secret: Buffer | Uint8Array,
  poolId: string,
  denomination: bigint = 0n
): Buffer {
  return Buffer.from(computeNoteCommitmentField(nullifier, secret, poolId, denomination), 'hex');
}
