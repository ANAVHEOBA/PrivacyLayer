/**
 * PrivacyLayer SDK integration stub.
 *
 * This module will wrap @privacylayer/sdk when it becomes available,
 * providing typed helpers for deposit, withdraw, and nullifier operations.
 */

export interface DepositParams {
  asset: "XLM" | "USDC";
  amount: string;
}

export interface WithdrawParams {
  note: string;
  recipient: string;
}

export async function deposit(_params: DepositParams): Promise<string> {
  // TODO: integrate with @privacylayer/sdk
  throw new Error("SDK not yet available");
}

export async function withdraw(_params: WithdrawParams): Promise<string> {
  // TODO: integrate with @privacylayer/sdk
  throw new Error("SDK not yet available");
}
