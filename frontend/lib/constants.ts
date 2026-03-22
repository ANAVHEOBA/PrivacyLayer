/**
 * PrivacyLayer Frontend Constants
 */

export const STELLAR_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet";

export const STELLAR_RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";

export const STELLAR_HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export const STELLAR_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_PASSPHRASE ?? "Test SDF Network ; September 2015";

export const PRIVACY_POOL_CONTRACT_ID =
  process.env.NEXT_PUBLIC_PRIVACY_POOL_CONTRACT_ID ?? "";

export const MERKLE_TREE_DEPTH = 20;
export const MAX_DEPOSITS = 2 ** MERKLE_TREE_DEPTH;

export type DenominationType = "Xlm10" | "Xlm100" | "Xlm1000" | "Usdc100" | "Usdc1000";

export interface DenominationInfo {
  label: string;
  token: "XLM" | "USDC";
  amount: number;
  amountRaw: bigint;
}

export const DENOMINATIONS: Record<DenominationType, DenominationInfo> = {
  Xlm10: { label: "10 XLM", token: "XLM", amount: 10, amountRaw: 100_000_000n },
  Xlm100: { label: "100 XLM", token: "XLM", amount: 100, amountRaw: 1_000_000_000n },
  Xlm1000: { label: "1,000 XLM", token: "XLM", amount: 1000, amountRaw: 10_000_000_000n },
  Usdc100: { label: "100 USDC", token: "USDC", amount: 100, amountRaw: 100_000_000n },
  Usdc1000: { label: "1,000 USDC", token: "USDC", amount: 1000, amountRaw: 1_000_000_000n },
};

export const ENABLE_TESTNET_FAUCET = process.env.NEXT_PUBLIC_ENABLE_TESTNET_FAUCET === "true";
export const ENABLE_RELAYER = process.env.NEXT_PUBLIC_ENABLE_RELAYER === "true";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/deposit", label: "Deposit" },
  { href: "/withdraw", label: "Withdraw" },
  { href: "/history", label: "History" },
] as const;
