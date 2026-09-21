import { Relayer, encodeRelayer } from './relayer';
import { encodeWithdrawPayload } from './encoding';

/**
 * Proof serialization now includes the canonical relayer encoding.
 */
export function serializeWithdrawProof(
  recipient: string,
  amount: bigint,
  relayer: Relayer,
  // other proof components omitted
): Uint8Array {
  const payload = encodeWithdrawPayload(recipient, amount, relayer);
  // Assume `proofData` is generated elsewhere; we just prepend the payload.
  const proofData = new Uint8Array(); // placeholder
  const out = new Uint8Array(payload.length + proofData.length);
  out.set(payload, 0);
  out.set(proofData, payload.length);
  return out;
}
