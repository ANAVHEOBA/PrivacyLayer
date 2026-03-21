/**
 * Input validation utility functions for PrivacyLayer.
 * @module @privacylayer/sdk/utils/validation
 */

import { Denomination } from "../types";
import { FIELD_SIZE } from "../constants";

/**
 * Validate a Stellar address format.
 * @param address - Stellar address to validate
 * @returns True if valid Stellar address format
 */
export function isValidStellarAddress(address: string): boolean {
  // Stellar addresses are 56 characters, start with G (public) or M (muxed)
  if (!/^[GM][A-Z2-7]{55}$/.test(address)) {
    return false;
  }
  return true;
}

/**
 * Validate a hex string.
 * @param hex - Hex string to validate
 * @param expectedLength - Expected byte length (optional)
 * @returns True if valid hex string
 */
export function isValidHex(hex: string, expectedLength?: number): boolean {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]*$/.test(clean)) {
    return false;
  }
  if (expectedLength !== undefined && clean.length !== expectedLength * 2) {
    return false;
  }
  return true;
}

/**
 * Validate that a value is within the BN254 scalar field.
 * @param value - BigInt value to check
 * @returns True if value < FIELD_SIZE
 */
export function isFieldElement(value: bigint): boolean {
  return value >= 0n && value < FIELD_SIZE;
}

/**
 * Validate a denomination value.
 * @param value - Value to check
 * @returns True if value is a valid Denomination
 */
export function isValidDenomination(value: number): value is Denomination {
  return Object.values(Denomination).includes(value as Denomination);
}

/**
 * Validate an amount is positive and within reasonable bounds.
 * @param amount - Amount to validate
 * @returns True if amount is valid
 */
export function isValidAmount(amount: number | bigint): boolean {
  const bigAmount = typeof amount === "number" ? BigInt(amount) : amount;
  return bigAmount > 0n && bigAmount <= BigInt("999999999999999"); // 15 digits max
}
