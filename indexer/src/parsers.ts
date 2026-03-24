/**
 * Event Parsers for PrivacyLayer Contract Events
 * 
 * Parses raw Soroban events into structured format.
 */

import { xdr } from 'soroban-client';

export type ParsedEvent =
  | { type: 'deposit'; commitment: string; leafIndex: number; root: string; txHash: string; ledger: number }
  | { type: 'withdraw'; nullifierHash: string; recipient: string; relayer: string | null; fee: string; amount: string; txHash: string; ledger: number }
  | { type: 'pool_paused'; admin: string; txHash: string; ledger: number }
  | { type: 'pool_unpaused'; admin: string; txHash: string; ledger: number }
  | { type: 'vk_updated'; admin: string; txHash: string; ledger: number };

/**
 * Parse raw Soroban events into structured format
 */
export function parseEvents(events: any[]): ParsedEvent[] {
  const parsed: ParsedEvent[] = [];

  for (const event of events) {
    try {
      const parsedEvent = parseEvent(event);
      if (parsedEvent) {
        parsed.push(parsedEvent);
      }
    } catch (error) {
      console.error('Error parsing event:', error);
    }
  }

  return parsed;
}

/**
 * Parse a single event
 */
function parseEvent(event: any): ParsedEvent | null {
  const topics = event.value?._value?.topics || [];
  const data = event.value?._value?.data || [];
  const txHash = event.txHash || event.transactionHash || '';
  const ledger = event.ledger || event.ledgerSequence || 0;

  if (!topics || topics.length === 0) {
    return null;
  }

  // Event type is typically the first topic
  const eventType = extractString(topics[0]);

  switch (eventType) {
    case 'deposit':
    case 'DepositEvent':
      return parseDepositEvent(topics, data, txHash, ledger);

    case 'withdraw':
    case 'WithdrawEvent':
      return parseWithdrawEvent(topics, data, txHash, ledger);

    case 'pool_paused':
    case 'PoolPausedEvent':
      return parsePoolPausedEvent(topics, data, txHash, ledger);

    case 'pool_unpaused':
    case 'PoolUnpausedEvent':
      return parsePoolUnpausedEvent(topics, data, txHash, ledger);

    case 'vk_updated':
    case 'VkUpdatedEvent':
      return parseVkUpdatedEvent(topics, data, txHash, ledger);

    default:
      // Try parsing based on data structure
      return inferEventType(topics, data, txHash, ledger);
  }
}

/**
 * Parse deposit event
 */
function parseDepositEvent(
  topics: any[],
  data: any[],
  txHash: string,
  ledger: number
): ParsedEvent {
  // Data structure for DepositEvent:
  // - commitment: BytesN<32>
  // - leaf_index: u32
  // - root: BytesN<32>

  return {
    type: 'deposit',
    commitment: extractBytes32(data[0] || topics[1]),
    leafIndex: extractU32(data[1] || topics[2]),
    root: extractBytes32(data[2] || topics[3]),
    txHash,
    ledger,
  };
}

/**
 * Parse withdrawal event
 */
function parseWithdrawEvent(
  topics: any[],
  data: any[],
  txHash: string,
  ledger: number
): ParsedEvent {
  // Data structure for WithdrawEvent:
  // - nullifier_hash: BytesN<32>
  // - recipient: Address
  // - relayer: Option<Address>
  // - fee: i128
  // - amount: i128

  return {
    type: 'withdraw',
    nullifierHash: extractBytes32(data[0] || topics[1]),
    recipient: extractAddress(data[1] || topics[2]),
    relayer: extractOptionAddress(data[2] || topics[3]),
    fee: extractI128(data[3] || topics[4]),
    amount: extractI128(data[4] || topics[5]),
    txHash,
    ledger,
  };
}

/**
 * Parse pool paused event
 */
function parsePoolPausedEvent(
  topics: any[],
  data: any[],
  txHash: string,
  ledger: number
): ParsedEvent {
  return {
    type: 'pool_paused',
    admin: extractAddress(data[0] || topics[1]),
    txHash,
    ledger,
  };
}

/**
 * Parse pool unpaused event
 */
function parsePoolUnpausedEvent(
  topics: any[],
  data: any[],
  txHash: string,
  ledger: number
): ParsedEvent {
  return {
    type: 'pool_unpaused',
    admin: extractAddress(data[0] || topics[1]),
    txHash,
    ledger,
  };
}

/**
 * Parse VK updated event
 */
function parseVkUpdatedEvent(
  topics: any[],
  data: any[],
  txHash: string,
  ledger: number
): ParsedEvent {
  return {
    type: 'vk_updated',
    admin: extractAddress(data[0] || topics[1]),
    txHash,
    ledger,
  };
}

/**
 * Infer event type from data structure when name doesn't match
 */
function inferEventType(
  topics: any[],
  data: any[],
  txHash: string,
  ledger: number
): ParsedEvent | null {
  // Try to infer from number of data fields
  const dataLength = data?.length || 0;

  if (dataLength === 3) {
    // Could be deposit event (commitment, leafIndex, root)
    try {
      const commitment = extractBytes32(data[0]);
      const leafIndex = extractU32(data[1]);
      const root = extractBytes32(data[2]);
      return { type: 'deposit', commitment, leafIndex, root, txHash, ledger };
    } catch {
      return null;
    }
  }

  if (dataLength === 5) {
    // Could be withdraw event
    try {
      return {
        type: 'withdraw',
        nullifierHash: extractBytes32(data[0]),
        recipient: extractAddress(data[1]),
        relayer: extractOptionAddress(data[2]),
        fee: extractI128(data[3]),
        amount: extractI128(data[4]),
        txHash,
        ledger,
      };
    } catch {
      return null;
    }
  }

  return null;
}

// Helper functions for extracting values from Soroban event data

function extractString(value: any): string {
  if (typeof value === 'string') return value;
  if (value?._value !== undefined) return String(value._value);
  if (value?.sym) return value.sym;
  return String(value);
}

function extractBytes32(value: any): string {
  if (typeof value === 'string') {
    // Already a hex string
    return value.startsWith('0x') ? value : `0x${value}`;
  }
  if (value?.bytes) {
    return `0x${value.bytes}`;
  }
  if (Buffer.isBuffer(value)) {
    return `0x${value.toString('hex')}`;
  }
  // Try to parse as base64 or hex
  const str = String(value);
  if (str.startsWith('0x')) return str;
  try {
    const buf = Buffer.from(str, 'base64');
    return `0x${buf.toString('hex')}`;
  } catch {
    return str;
  }
}

function extractU32(value: any): number {
  if (typeof value === 'number') return value;
  if (value?._value !== undefined) return Number(value._value);
  return Number(value);
}

function extractAddress(value: any): string {
  if (typeof value === 'string') return value;
  if (value?.address) return value.address;
  if (value?._value !== undefined) return String(value._value);
  return String(value);
}

function extractOptionAddress(value: any): string | null {
  if (!value) return null;
  if (value === 'None' || value?._arm === 'None') return null;
  if (value?._arm === 'Some') return extractAddress(value._value);
  try {
    return extractAddress(value);
  } catch {
    return null;
  }
}

function extractI128(value: any): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return value.toString();
  if (value?._value !== undefined) {
    if (typeof value._value === 'bigint') return value._value.toString();
    return String(value._value);
  }
  if (value?.i128) return value.i128;
  return String(value);
}