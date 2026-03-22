import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind CSS classes with clsx. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Stellar address for display (first 4 + last 4 chars). */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Format stroops to human-readable XLM amount. */
export function formatXlm(stroops: bigint | number): string {
  const amount = Number(stroops) / 10_000_000;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  }).format(amount);
}

/** Format microunits to human-readable USDC amount. */
export function formatUsdc(microunits: bigint | number): string {
  const amount = Number(microunits) / 1_000_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

/** Get human-readable denomination label. */
export function getDenominationLabel(denomination: string): string {
  const labels: Record<string, string> = {
    Xlm10: "10 XLM",
    Xlm100: "100 XLM",
    Xlm1000: "1,000 XLM",
    Usdc100: "100 USDC",
    Usdc1000: "1,000 USDC",
  };
  return labels[denomination] ?? denomination;
}

/** Convert a hex string to a Uint8Array. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/** Convert a Uint8Array to a hex string. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Format a unix timestamp for display. */
export function formatTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}
