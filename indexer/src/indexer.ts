/**
 * Event Indexer for PrivacyLayer Smart Contracts
 * 
 * Monitors Stellar/Soroban network for contract events
 * and indexes them into PostgreSQL for efficient querying.
 */

import { PrismaClient } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';
import { Server, Horizon } from 'soroban-client';
import { parseEvents } from './parsers';

export interface IndexerConfig {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  pollInterval: number;
  startLedger?: number;
}

const DEFAULT_CONFIG: IndexerConfig = {
  rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org:443',
  networkPassphrase: process.env.NETWORK_PASSPHRASE || Horizon.Networks.TESTNET,
  contractId: process.env.CONTRACT_ID || '',
  pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'),
};

export class EventIndexer {
  private prisma: PrismaClient;
  private pubsub: PubSub;
  private config: IndexerConfig;
  private server: Server;
  private running: boolean = false;
  private lastLedger: bigint = BigInt(0);

  constructor(prisma: PrismaClient, pubsub: PubSub, config?: Partial<IndexerConfig>) {
    this.prisma = prisma;
    this.pubsub = pubsub;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.server = new Server(this.config.rpcUrl, {
      allowHttp: this.config.rpcUrl.startsWith('http://'),
    });
  }

  /**
   * Start the event indexer
   */
  async start(): Promise<void> {
    if (!this.config.contractId) {
      throw new Error('CONTRACT_ID environment variable is required');
    }

    // Load last indexed ledger from database
    const state = await this.prisma.indexerState.findUnique({
      where: { id: 'singleton' },
    });

    if (state) {
      this.lastLedger = state.lastLedger;
    } else {
      // If no state exists, start from configured ledger or current ledger
      if (this.config.startLedger) {
        this.lastLedger = BigInt(this.config.startLedger);
      } else {
        const latestLedger = await this.server.getLatestLedger();
        this.lastLedger = BigInt(latestLedger.sequence);
      }
      await this.prisma.indexerState.create({
        data: { id: 'singleton', lastLedger: this.lastLedger },
      });
    }

    console.log(`Starting indexer from ledger ${this.lastLedger}`);
    this.running = true;
    this.pollLoop();
  }

  /**
   * Stop the event indexer
   */
  async stop(): Promise<void> {
    this.running = false;
  }

  /**
   * Main polling loop
   */
  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        await this.poll();
      } catch (error) {
        console.error('Error during polling:', error);
      }
      await this.sleep(this.config.pollInterval);
    }
  }

  /**
   * Poll for new events
   */
  private async poll(): Promise<void> {
    const latestLedger = await this.server.getLatestLedger();
    const latestSeq = BigInt(latestLedger.sequence);

    if (latestSeq <= this.lastLedger) {
      return; // No new ledgers
    }

    // Get events for this contract from the last ledger to the latest
    const startLedger = Number(this.lastLedger) + 1;
    const endLedger = Number(latestSeq);

    try {
      const events = await this.server.getEvents({
        startLedger,
        filters: [
          {
            type: 'contract',
            contractIds: [this.config.contractId],
          },
        ],
      });

      if (events.events && events.events.length > 0) {
        await this.processEvents(events.events);
      }

      // Update indexer state
      await this.prisma.indexerState.update({
        where: { id: 'singleton' },
        data: { lastLedger: latestSeq, lastUpdated: new Date() },
      });

      this.lastLedger = latestSeq;
    } catch (error) {
      console.error(`Error fetching events for ledgers ${startLedger}-${endLedger}:`, error);
    }
  }

  /**
   * Process and store events
   */
  private async processEvents(events: any[]): Promise<void> {
    const parsedEvents = parseEvents(events);

    for (const event of parsedEvents) {
      try {
        switch (event.type) {
          case 'deposit': {
            const deposit = await this.prisma.depositEvent.create({
              data: {
                commitment: event.commitment,
                leafIndex: event.leafIndex,
                root: event.root,
                txHash: event.txHash,
                ledger: BigInt(event.ledger),
              },
            });
            this.pubsub.publish('DEPOSIT', { onDeposit: deposit });

            // Update merkle tree state
            await this.prisma.merkleTreeState.upsert({
              where: { id: 'singleton' },
              create: {
                id: 'singleton',
                currentRoot: event.root,
                leafCount: event.leafIndex + 1,
              },
              update: {
                currentRoot: event.root,
                leafCount: event.leafIndex + 1,
                lastUpdated: new Date(),
              },
            });
            this.pubsub.publish('MERKLE_TREE_UPDATE', {
              onMerkleTreeUpdate: {
                currentRoot: event.root,
                leafCount: event.leafIndex + 1,
                lastUpdated: new Date().toISOString(),
              },
            });
            break;
          }

          case 'withdraw': {
            const withdraw = await this.prisma.withdrawEvent.create({
              data: {
                nullifierHash: event.nullifierHash,
                recipient: event.recipient,
                relayer: event.relayer,
                fee: BigInt(event.fee),
                amount: BigInt(event.amount),
                txHash: event.txHash,
                ledger: BigInt(event.ledger),
              },
            });
            this.pubsub.publish('WITHDRAW', { onWithdraw: withdraw });
            break;
          }

          case 'pool_paused': {
            const paused = await this.prisma.poolPausedEvent.create({
              data: {
                admin: event.admin,
                txHash: event.txHash,
                ledger: BigInt(event.ledger),
              },
            });
            this.pubsub.publish('POOL_PAUSED', { onPoolPaused: paused });
            break;
          }

          case 'pool_unpaused': {
            const unpaused = await this.prisma.poolUnpausedEvent.create({
              data: {
                admin: event.admin,
                txHash: event.txHash,
                ledger: BigInt(event.ledger),
              },
            });
            this.pubsub.publish('POOL_UNPAUSED', { onPoolUnpaused: unpaused });
            break;
          }

          case 'vk_updated': {
            const vkUpdated = await this.prisma.vkUpdatedEvent.create({
              data: {
                admin: event.admin,
                txHash: event.txHash,
                ledger: BigInt(event.ledger),
              },
            });
            this.pubsub.publish('VK_UPDATED', { onVkUpdated: vkUpdated });
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing event:`, error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}