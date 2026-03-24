/**
 * PrivacyLayer Event Indexer
 * 
 * Main entry point for the indexing service.
 * - Connects to Stellar network via Soroban RPC
 * - Indexes contract events into PostgreSQL
 * - Exposes GraphQL API for querying
 * - Supports real-time subscriptions via WebSocket
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';
import { readFileSync } from 'fs';
import { join } from 'path';

import { PrismaClient } from '@prisma/client';
import { EventIndexer } from './indexer';
import { resolvers } from './resolvers';

// Load environment variables
import 'dotenv/config';

const prisma = new PrismaClient();
const pubsub = new PubSub();

// Load GraphQL schema
const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8');

// Create executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Create WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Hand in the schema we just created and have the
  // WebSocketServer start listening.
  const serverCleanup = useServer({ schema }, wsServer);

  // Create Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    expressMiddleware(server, {
      context: async () => ({ prisma, pubsub }),
    }),
  );

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Start indexer
  const indexer = new EventIndexer(prisma, pubsub);
  
  const PORT = process.env.PORT || 4000;
  
  await new Promise<void>((resolve) => httpServer.listen({ port: PORT }, resolve));
  
  console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  console.log(`🛰️ Subscriptions ready at ws://localhost:${PORT}/graphql`);

  // Start indexing
  try {
    await indexer.start();
    console.log('📊 Event indexer started');
  } catch (error) {
    console.error('Failed to start indexer:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await indexer.stop();
    await prisma.$disconnect();
    await server.stop();
    httpServer.close();
    process.exit(0);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});