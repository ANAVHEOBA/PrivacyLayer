import { StrKey } from '@stellar/stellar-sdk';

import { DENOMINATION_AMOUNTS, HEX_32_REGEX } from '../constants';
import { Denomination, Note } from '../types';

export function isHex32(value: string): boolean {
  return HEX_32_REGEX.test(value);
}

export function assertHex32(value: string, label = 'value'): void {
  if (!isHex32(value)) {
    throw new Error(`${label} must be a 32-byte hex string.`);
  }
}

export function assertNonZeroHex32(value: string, label = 'value'): void {
  assertHex32(value, label);
  if (/^(0x)?0{64}$/i.test(value)) {
    throw new Error(`${label} must not be zero.`);
  }
}

export function isValidDenomination(value: unknown): value is Denomination {
  return typeof value === 'string' && Object.values(Denomination).includes(value as Denomination);
}

export function assertDenomination(value: unknown): asserts value is Denomination {
  if (!isValidDenomination(value)) {
    throw new Error(`Unsupported denomination: ${String(value)}.`);
  }
}

export function amountForDenomination(denomination: Denomination): bigint {
  assertDenomination(denomination);
  return DENOMINATION_AMOUNTS[denomination];
}

export function isValidStellarAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address) || StrKey.isValidContract(address);
}

export function assertStellarAddress(address: string, label = 'address'): void {
  if (!isValidStellarAddress(address)) {
    throw new Error(`${label} must be a valid Stellar account or contract address.`);
  }
}

export function validateNote(note: Note): void {
  assertNonZeroHex32(note.nullifier, 'note.nullifier');
  assertNonZeroHex32(note.secret, 'note.secret');
  assertNonZeroHex32(note.commitment, 'note.commitment');
  assertDenomination(note.denomination);
}
