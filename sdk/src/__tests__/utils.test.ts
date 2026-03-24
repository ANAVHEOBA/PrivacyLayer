/**
 * Unit tests for utility functions
 */

import {
  randomFieldElement,
  isValidFieldElement,
  generateNote,
  isValidBytes32,
  hexToBuffer,
  bufferToHex,
  bytesToBigInt,
  bigIntToHex
} from '../utils/crypto';
import {
  hexToUint8Array,
  uint8ArrayToHex,
  base64ToHex,
  hexToBase64,
  isHex,
  padHex
} from '../utils/encoding';
import {
  isValidStellarAddress,
  isValidContractId,
  isValidAmount,
  isValidDenomination,
  validateNote,
  validateNetworkConfig
} from '../utils/validation';
import { Denomination } from '../types';
import { FIELD_SIZE } from '../constants';

describe('Crypto utilities', () => {
  test('randomFieldElement generates valid field element', () => {
    const element = randomFieldElement();
    expect(isValidFieldElement(element)).toBe(true);
  });

  test('isValidFieldElement validates correctly', () => {
    // Valid field element (within range)
    const validHex = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    expect(isValidFieldElement(validHex)).toBe(true);
    
    // Invalid: zero
    const zeroHex = '0x0000000000000000000000000000000000000000000000000000000000000000';
    expect(isValidFieldElement(zeroHex)).toBe(false);
    
    // Invalid: too large (>= FIELD_SIZE)
    const tooLarge = FIELD_SIZE.toString(16);
    expect(isValidFieldElement(tooLarge)).toBe(false);
  });

  test('generateNote creates valid note structure', () => {
    const note = generateNote(Denomination.TEN);
    expect(note.nullifier).toMatch(/^[0-9a-f]{64}$/);
    expect(note.secret).toMatch(/^[0-9a-f]{64}$/);
    expect(note.commitment).toMatch(/^[0-9a-f]{64}$/);
  });

  test('isValidBytes32 validates 32-byte hex strings', () => {
    expect(isValidBytes32('0x' + 'a'.repeat(64))).toBe(true);
    expect(isValidBytes32('a'.repeat(64))).toBe(true);
    expect(isValidBytes32('a'.repeat(63))).toBe(false);
    expect(isValidBytes32('g'.repeat(64))).toBe(false); // Invalid hex char
  });

  test('hexToBuffer and bufferToHex work correctly', () => {
    const originalHex = 'abcdef0123456789';
    const buffer = hexToBuffer(originalHex);
    const convertedHex = bufferToHex(buffer);
    expect(convertedHex).toBe(originalHex);
    
    const withPrefix = bufferToHex(buffer, true);
    expect(withPrefix).toBe(`0x${originalHex}`);
  });

  test('bytesToBigInt and bigIntToHex work correctly', () => {
    const hex = 'deadbeef';
    const buffer = hexToBuffer(hex);
    const bigInt = bytesToBigInt(buffer);
    expect(bigInt).toBe(BigInt(`0x${hex}`));
    
    const convertedHex = bigIntToHex(bigInt);
    expect(convertedHex).toBe(hex.padStart(64, '0'));
  });
});

describe('Encoding utilities', () => {
  test('hexToUint8Array and uint8ArrayToHex work correctly', () => {
    const hex = 'deadbeef';
    const array = hexToUint8Array(hex);
    expect(array.length).toBe(4);
    expect(array[0]).toBe(0xde);
    expect(array[1]).toBe(0xad);
    
    const convertedHex = uint8ArrayToHex(array);
    expect(convertedHex).toBe(hex);
  });

  test('base64ToHex and hexToBase64 work correctly', () => {
    const originalHex = 'deadbeef';
    const base64 = hexToBase64(originalHex);
    expect(base64).toBe('3q2+7w==');
    
    const convertedHex = base64ToHex(base64);
    expect(convertedHex).toBe(originalHex);
  });

  test('isHex validates hex strings', () => {
    expect(isHex('abcdef')).toBe(true);
    expect(isHex('0xabcdef')).toBe(true);
    expect(isHex('ghijkl')).toBe(false);
    expect(isHex('')).toBe(false);
  });

  test('padHex pads correctly', () => {
    expect(padHex('ab', 4)).toBe('000000ab');
    expect(padHex('0xab', 4, true)).toBe('0x000000ab');
  });
});

describe('Validation utilities', () => {
  test('isValidStellarAddress validates Stellar addresses', () => {
    // Valid address
    expect(isValidStellarAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(true);
    // Invalid length
    expect(isValidStellarAddress('GABCD')).toBe(false);
    // Doesn't start with G
    expect(isValidStellarAddress('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false);
  });

  test('isValidContractId validates contract IDs', () => {
    // Valid contract ID
    expect(isValidContractId('CABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(true);
    // Invalid length
    expect(isValidContractId('CABCD')).toBe(false);
    // Doesn't start with C
    expect(isValidContractId('GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false);
  });

  test('isValidAmount validates amounts', () => {
    expect(isValidAmount('100')).toBe(true);
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(100n)).toBe(true);
    expect(isValidAmount('0')).toBe(false);
    expect(isValidAmount('-100')).toBe(false);
    expect(isValidAmount('abc')).toBe(false);
  });

  test('isValidDenomination validates denominations', () => {
    expect(isValidDenomination(Denomination.TEN)).toBe(true);
    expect(isValidDenomination(Denomination.HUNDRED)).toBe(true);
    expect(isValidDenomination(Denomination.THOUSAND)).toBe(true);
    expect(isValidDenomination(Denomination.TEN_THOUSAND)).toBe(true);
    expect(isValidDenomination(999)).toBe(false);
  });

  test('validateNote validates note structure', () => {
    const validNote = {
      nullifier: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      secret: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      commitment: 'a'.repeat(64),
      denomination: Denomination.TEN
    };
    expect(validateNote(validNote)).toEqual([]);
    
    const invalidNote = {
      nullifier: '0',
      secret: '0',
      commitment: 'a'.repeat(63),
      denomination: 999
    };
    expect(validateNote(invalidNote).length).toBeGreaterThan(0);
  });

  test('validateNetworkConfig validates network config', () => {
    const validConfig = {
      rpcUrl: 'https://test.stellar.org',
      networkPassphrase: 'Test Network',
      contractId: 'CABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ'
    };
    expect(validateNetworkConfig(validConfig)).toEqual([]);
    
    const invalidConfig = {
      rpcUrl: '',
      networkPassphrase: '',
      contractId: 'INVALID'
    };
    expect(validateNetworkConfig(invalidConfig).length).toBeGreaterThan(0);
  });
});
