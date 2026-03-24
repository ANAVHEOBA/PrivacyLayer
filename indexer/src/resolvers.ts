/**
 * GraphQL Resolvers for PrivacyLayer Event Indexer
 */

import { PrismaClient } from '@prisma/client';
import { PubSub } from 'graphql-subscriptions';

const DEPOSIT_SUBSCRIPTION = 'DEPOSIT';
const WITHDRAW_SUBSCRIPTION = 'WITHDRAW';
const POOL_PAUSED_SUBSCRIPTION = 'POOL_PAUSED';
const POOL_UNPAUSED_SUBSCRIPTION = 'POOL_UNPAUSED';
const VK_UPDATED_SUBSCRIPTION = 'VK_UPDATED';
const MERKLE_TREE_UPDATE_SUBSCRIPTION = 'MERKLE_TREE_UPDATE';

interface Context {
  prisma: PrismaClient;
  pubsub: PubSub;
}

export const resolvers = {
  Query: {
    // Deposit queries
    deposits: async (
      _: any,
      args: { pagination?: { skip?: number; take?: number }; filter?: any },
      context: Context
    ) => {
      const { skip = 0, take = 20 } = args.pagination || {};
      const { commitment, leafIndexMin, leafIndexMax, timestampAfter, timestampBefore } =
        args.filter || {};

      const where: any = {};
      if (commitment) where.commitment = commitment;
      if (leafIndexMin !== undefined || leafIndexMax !== undefined) {
        where.leafIndex = {};
        if (leafIndexMin !== undefined) where.leafIndex.gte = leafIndexMin;
        if (leafIndexMax !== undefined) where.leafIndex.lte = leafIndexMax;
      }
      if (timestampAfter || timestampBefore) {
        where.timestamp = {};
        if (timestampAfter) where.timestamp.gte = new Date(timestampAfter);
        if (timestampBefore) where.timestamp.lte = new Date(timestampBefore);
      }

      return context.prisma.depositEvent.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      });
    },

    deposit: async (_: any, args: { id: string }, context: Context) => {
      return context.prisma.depositEvent.findUnique({
        where: { id: args.id },
      });
    },

    depositByCommitment: async (_: any, args: { commitment: string }, context: Context) => {
      return context.prisma.depositEvent.findFirst({
        where: { commitment: args.commitment },
      });
    },

    // Withdrawal queries
    withdrawals: async (
      _: any,
      args: { pagination?: { skip?: number; take?: number }; filter?: any },
      context: Context
    ) => {
      const { skip = 0, take = 20 } = args.pagination || {};
      const { nullifierHash, recipient, relayer, timestampAfter, timestampBefore } =
        args.filter || {};

      const where: any = {};
      if (nullifierHash) where.nullifierHash = nullifierHash;
      if (recipient) where.recipient = recipient;
      if (relayer) where.relayer = relayer;

      if (timestampAfter || timestampBefore) {
        where.timestamp = {};
        if (timestampAfter) where.timestamp.gte = new Date(timestampAfter);
        if (timestampBefore) where.timestamp.lte = new Date(timestampBefore);
      }

      return context.prisma.withdrawEvent.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      });
    },

    withdraw: async (_: any, args: { id: string }, context: Context) => {
      return context.prisma.withdrawEvent.findUnique({
        where: { id: args.id },
      });
    },

    withdrawByNullifierHash: async (
      _: any,
      args: { nullifierHash: string },
      context: Context
    ) => {
      return context.prisma.withdrawEvent.findFirst({
        where: { nullifierHash: args.nullifierHash },
      });
    },

    // Admin event queries
    poolPausedEvents: async (
      _: any,
      args: { pagination?: { skip?: number; take?: number } },
      context: Context
    ) => {
      const { skip = 0, take = 20 } = args.pagination || {};
      return context.prisma.poolPausedEvent.findMany({
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      });
    },

    poolUnpausedEvents: async (
      _: any,
      args: { pagination?: { skip?: number; take?: number } },
      context: Context
    ) => {
      const { skip = 0, take = 20 } = args.pagination || {};
      return context.prisma.poolUnpausedEvent.findMany({
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      });
    },

    vkUpdatedEvents: async (
      _: any,
      args: { pagination?: { skip?: number; take?: number } },
      context: Context
    ) => {
      const { skip = 0, take = 20 } = args.pagination || {};
      return context.prisma.vkUpdatedEvent.findMany({
        skip,
        take,
        orderBy: { timestamp: 'desc' },
      });
    },

    // State queries
    merkleTreeState: async (_: any, __: any, context: Context) => {
      const state = await context.prisma.merkleTreeState.findUnique({
        where: { id: 'singleton' },
      });
      return (
        state || {
          currentRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
          leafCount: 0,
          lastUpdated: new Date().toISOString(),
        }
      );
    },

    indexerStats: async (_: any, __: any, context: Context) => {
      const [totalDeposits, totalWithdrawals, indexerState, latestPaused] = await Promise.all([
        context.prisma.depositEvent.count(),
        context.prisma.withdrawEvent.count(),
        context.prisma.indexerState.findUnique({ where: { id: 'singleton' } }),
        context.prisma.poolPausedEvent.findFirst({
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      // Check if pool is currently paused (find most recent pause/unpause)
      const [lastPaused, lastUnpaused] = await Promise.all([
        context.prisma.poolPausedEvent.findFirst({ orderBy: { timestamp: 'desc' } }),
        context.prisma.poolUnpausedEvent.findFirst({ orderBy: { timestamp: 'desc' } }),
      ]);

      let isPaused = false;
      if (lastPaused) {
        if (!lastUnpaused) {
          isPaused = true;
        } else if (lastPaused.timestamp > lastUnpaused.timestamp) {
          isPaused = true;
        }
      }

      return {
        totalDeposits,
        totalWithdrawals,
        currentLedger: '0',
        lastIndexedLedger: indexerState?.lastLedger.toString() || '0',
        isPaused,
      };
    },

    // Utility queries
    isCommitmentUsed: async (_: any, args: { commitment: string }, context: Context) => {
      const deposit = await context.prisma.depositEvent.findFirst({
        where: { commitment: args.commitment },
      });
      return deposit !== null;
    },

    isNullifierUsed: async (_: any, args: { nullifierHash: string }, context: Context) => {
      const withdraw = await context.prisma.withdrawEvent.findFirst({
        where: { nullifierHash: args.nullifierHash },
      });
      return withdraw !== null;
    },
  },

  Subscription: {
    onDeposit: {
      subscribe: (_: any, __: any, context: Context) =>
        context.pubsub.asyncIterator([DEPOSIT_SUBSCRIPTION]),
    },
    onWithdraw: {
      subscribe: (_: any, __: any, context: Context) =>
        context.pubsub.asyncIterator([WITHDRAW_SUBSCRIPTION]),
    },
    onPoolPaused: {
      subscribe: (_: any, __: any, context: Context) =>
        context.pubsub.asyncIterator([POOL_PAUSED_SUBSCRIPTION]),
    },
    onPoolUnpaused: {
      subscribe: (_: any, __: any, context: Context) =>
        context.pubsub.asyncIterator([POOL_UNPAUSED_SUBSCRIPTION]),
    },
    onVkUpdated: {
      subscribe: (_: any, __: any, context: Context) =>
        context.pubsub.asyncIterator([VK_UPDATED_SUBSCRIPTION]),
    },
    onMerkleTreeUpdate: {
      subscribe: (_: any, __: any, context: Context) =>
        context.pubsub.asyncIterator([MERKLE_TREE_UPDATE_SUBSCRIPTION]),
    },
  },

  // Type resolvers for converting BigInt to String
  DepositEvent: {
    ledger: (parent: any) => parent.ledger.toString(),
  },
  WithdrawEvent: {
    fee: (parent: any) => parent.fee.toString(),
    amount: (parent: any) => parent.amount.toString(),
    ledger: (parent: any) => parent.ledger.toString(),
  },
  PoolPausedEvent: {
    ledger: (parent: any) => parent.ledger.toString(),
  },
  PoolUnpausedEvent: {
    ledger: (parent: any) => parent.ledger.toString(),
  },
  VkUpdatedEvent: {
    ledger: (parent: any) => parent.ledger.toString(),
  },
};