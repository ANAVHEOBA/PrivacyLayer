#!/usr/bin/env tsx
// ============================================================
// PrivacyLayer Node.js CLI
// ============================================================
// Command-line interface for interacting with the PrivacyLayer
// Soroban smart contract. Supports deposits, withdrawals,
// pool monitoring, and note management.
//
// Usage:
//   npx tsx src/cli.ts <command> [options]
//
// Commands:
//   deposit      - Deposit into the shielded pool
//   withdraw     - Withdraw with ZK proof
//   status       - Show pool status
//   monitor      - Monitor pool events in real-time
//   check-nullifier - Check if a nullifier is spent
//   generate-note   - Generate a new deposit note
//   backup-note     - Serialize a note for backup
//   restore-note    - Restore a note from backup string
//
// Environment Variables:
//   PRIVACY_LAYER_CONTRACT_ID - Contract address (required)
//   PRIVACY_LAYER_NETWORK     - "testnet" or "mainnet" (default: testnet)
//   PRIVACY_LAYER_RPC_URL     - Custom RPC URL (optional)
//   STELLAR_SECRET_KEY        - Depositor secret key (for deposit command)
// ============================================================

import { Keypair } from "@stellar/stellar-sdk";
import {
  PrivacyLayerClient,
  ClientConfig,
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  Denomination,
  DENOMINATION_AMOUNTS,
  generateNote,
  serializeNote,
  deserializeNote,
  PoolState,
  PrivacyLayerEvent,
  PrivacyLayerError,
  NetworkError,
  ProofGenerationError,
} from "../../shared/privacy-layer-client";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ──────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────

function loadConfig(): ClientConfig {
  const contractId = process.env.PRIVACY_LAYER_CONTRACT_ID;
  if (!contractId) {
    console.error("Error: PRIVACY_LAYER_CONTRACT_ID environment variable is required.");
    console.error("  export PRIVACY_LAYER_CONTRACT_ID=CABC123...");
    process.exit(1);
  }

  const network = process.env.PRIVACY_LAYER_NETWORK || "testnet";
  const preset = network === "mainnet" ? MAINNET_CONFIG : TESTNET_CONFIG;

  return {
    ...preset,
    contractId,
    rpcUrl: process.env.PRIVACY_LAYER_RPC_URL || preset.rpcUrl!,
    networkPassphrase: preset.networkPassphrase!,
  };
}

function getKeypair(): Keypair {
  const secret = process.env.STELLAR_SECRET_KEY;
  if (!secret) {
    console.error("Error: STELLAR_SECRET_KEY environment variable is required for this command.");
    console.error("  export STELLAR_SECRET_KEY=S...");
    process.exit(1);
  }
  return Keypair.fromSecret(secret);
}

// ──────────────────────────────────────────────────────────────
// Note File Management
// ──────────────────────────────────────────────────────────────

const NOTES_DIR = path.join(process.cwd(), ".privacylayer-notes");

function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true, mode: 0o700 });
    console.log(`Created notes directory: ${NOTES_DIR}`);
    console.log("  (Keep this directory secure and backed up!)");
  }
}

function saveNote(note: ReturnType<typeof serializeNote>, filename: string): void {
  ensureNotesDir();
  const filepath = path.join(NOTES_DIR, filename);
  fs.writeFileSync(filepath, note, { mode: 0o600 });
  console.log(`Note saved to: ${filepath}`);
}

function loadNoteFile(filename: string): string {
  const filepath = path.join(NOTES_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`Error: Note file not found: ${filepath}`);
    process.exit(1);
  }
  return fs.readFileSync(filepath, "utf-8").trim();
}

// ──────────────────────────────────────────────────────────────
// Output Formatting
// ──────────────────────────────────────────────────────────────

function printHeader(title: string): void {
  const line = "=".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

function printPoolState(state: PoolState): void {
  printHeader("Pool Status");
  console.log(`  Deposits:      ${state.depositCount}`);
  console.log(`  Denomination:  ${DENOMINATION_AMOUNTS[state.config.denomination]}`);
  console.log(`  Paused:        ${state.config.paused ? "YES" : "No"}`);
  console.log(`  Tree Depth:    ${state.config.treeDepth}`);
  console.log(`  Root History:  ${state.config.rootHistorySize}`);
  console.log(`  Current Root:  ${state.currentRoot.slice(0, 32)}...`);
  console.log(`  Admin:         ${state.config.admin || "(not decoded)"}`);
  console.log(`  Token:         ${state.config.token || "(not decoded)"}`);
  console.log();
}

function printEvent(event: PrivacyLayerEvent): void {
  const time = new Date(event.timestamp).toISOString();
  const type = event.type.toUpperCase().padEnd(10);
  console.log(`  [${time}] ${type} Ledger #${event.ledger}`);
}

// ──────────────────────────────────────────────────────────────
// Commands
// ──────────────────────────────────────────────────────────────

async function cmdStatus(client: PrivacyLayerClient): Promise<void> {
  try {
    const state = await client.getPoolState();
    printPoolState(state);
  } catch (err) {
    handleError("Failed to fetch pool status", err);
  }
}

async function cmdDeposit(client: PrivacyLayerClient, args: string[]): Promise<void> {
  const denomStr = args[0] || "Xlm10";
  const denomination = denomStr as Denomination;

  if (!Object.values(Denomination).includes(denomination)) {
    console.error(`Invalid denomination: ${denomStr}`);
    console.error("Valid options:", Object.keys(DENOMINATION_AMOUNTS).join(", "));
    process.exit(1);
  }

  printHeader(`Deposit: ${DENOMINATION_AMOUNTS[denomination]}`);

  try {
    // Step 1: Generate note
    console.log("  Generating deposit note...");
    const note = await generateNote(denomination);
    console.log(`  Commitment: ${note.commitment.slice(0, 32)}...`);

    // Step 2: Save note backup FIRST (critical for fund safety)
    const backup = serializeNote(note);
    const filename = `note-${Date.now()}-${denomination}.txt`;
    saveNote(backup, filename);
    console.log();
    console.log("  *** IMPORTANT: Note has been saved. Do NOT lose this file! ***");
    console.log(`  *** Backup string: ${backup.slice(0, 50)}... ***`);
    console.log();

    // Step 3: Execute deposit
    console.log("  Submitting deposit transaction...");
    const keypair = getKeypair();
    const result = await client.deposit(keypair, note);

    note.leafIndex = result.leafIndex;
    console.log(`  Deposit successful!`);
    console.log(`  Leaf Index: ${result.leafIndex}`);
    console.log(`  New Root:   ${result.merkleRoot.slice(0, 32)}...`);

    // Update saved note with leaf index
    const updatedBackup = serializeNote(note);
    saveNote(updatedBackup, filename);
  } catch (err) {
    handleError("Deposit failed", err);
  }
}

async function cmdWithdraw(client: PrivacyLayerClient, args: string[]): Promise<void> {
  const noteFile = args[0];
  const recipient = args[1];

  if (!noteFile || !recipient) {
    console.error("Usage: withdraw <note-file> <recipient-address>");
    console.error("  note-file: filename in .privacylayer-notes/ directory");
    console.error("  recipient: Stellar address (G...)");
    process.exit(1);
  }

  printHeader("Withdraw with ZK Proof");

  try {
    // Step 1: Load and restore note
    console.log(`  Loading note from: ${noteFile}`);
    const noteStr = loadNoteFile(noteFile);
    const note = await deserializeNote(noteStr);
    console.log(`  Denomination: ${DENOMINATION_AMOUNTS[note.denomination]}`);
    console.log(`  Commitment:   ${note.commitment.slice(0, 32)}...`);
    console.log(`  Recipient:    ${recipient}`);
    console.log();

    // Step 2: Execute withdrawal
    console.log("  Generating ZK proof...");
    console.log("  (This may take 30-60 seconds for Groth16 proof generation)");
    const success = await client.withdraw({ note, recipient });

    if (success) {
      console.log();
      console.log("  Withdrawal successful!");
      console.log(`  Funds sent to: ${recipient}`);

      // Mark note as spent
      const spentPath = path.join(NOTES_DIR, `SPENT-${noteFile}`);
      fs.renameSync(path.join(NOTES_DIR, noteFile), spentPath);
      console.log(`  Note marked as spent: ${spentPath}`);
    }
  } catch (err) {
    handleError("Withdrawal failed", err);
  }
}

async function cmdMonitor(client: PrivacyLayerClient): Promise<void> {
  printHeader("Monitoring Pool Events (Ctrl+C to stop)");

  // Show initial state
  try {
    const state = await client.getPoolState();
    printPoolState(state);
  } catch {
    console.log("  (Could not fetch initial state)");
  }

  console.log("  Listening for new events...\n");

  const stop = client.subscribeToEvents((event) => {
    printEvent(event);
  }, 3000);

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n  Stopping event monitor...");
    stop();
    process.exit(0);
  });

  // Keep process alive
  await new Promise(() => {});
}

async function cmdCheckNullifier(client: PrivacyLayerClient, args: string[]): Promise<void> {
  const nullifierHash = args[0];

  if (!nullifierHash) {
    console.error("Usage: check-nullifier <nullifier-hash>");
    console.error("  nullifier-hash: 64-character hex string");
    process.exit(1);
  }

  printHeader("Check Nullifier Status");

  try {
    const isSpent = await client.isSpent(nullifierHash);
    console.log(`  Nullifier: ${nullifierHash.slice(0, 32)}...`);
    console.log(`  Status:    ${isSpent ? "SPENT (already used)" : "UNSPENT (available)"}`);
    console.log();
  } catch (err) {
    handleError("Nullifier check failed", err);
  }
}

async function cmdGenerateNote(args: string[]): Promise<void> {
  const denomStr = args[0] || "Xlm10";
  const denomination = denomStr as Denomination;

  if (!Object.values(Denomination).includes(denomination)) {
    console.error(`Invalid denomination: ${denomStr}`);
    console.error("Valid options:", Object.keys(DENOMINATION_AMOUNTS).join(", "));
    process.exit(1);
  }

  printHeader(`Generate Note: ${DENOMINATION_AMOUNTS[denomination]}`);

  const note = await generateNote(denomination);
  const backup = serializeNote(note);

  console.log(`  Denomination: ${DENOMINATION_AMOUNTS[denomination]}`);
  console.log(`  Nullifier:    ${note.nullifier.slice(0, 32)}...`);
  console.log(`  Secret:       ${note.secret.slice(0, 32)}...`);
  console.log(`  Commitment:   ${note.commitment.slice(0, 32)}...`);
  console.log();
  console.log(`  Backup String:`);
  console.log(`  ${backup}`);
  console.log();

  // Optionally save to file
  const filename = `note-${Date.now()}-${denomination}.txt`;
  saveNote(backup, filename);
}

// ──────────────────────────────────────────────────────────────
// Error Handling
// ──────────────────────────────────────────────────────────────

function handleError(context: string, err: unknown): void {
  console.error();

  if (err instanceof PrivacyLayerError) {
    console.error(`  ${context}: Contract Error [${err.code}]`);
    console.error(`  ${err.message}`);
    console.error();
    console.error("  Common fixes:");

    switch (err.code) {
      case 2:
        console.error("    - The contract has not been initialized. Contact the pool admin.");
        break;
      case 20:
        console.error("    - The pool is paused. Wait for the admin to unpause it.");
        break;
      case 21:
        console.error("    - The Merkle tree is full. The pool cannot accept more deposits.");
        break;
      case 31:
        console.error("    - The commitment was zero. Try generating a new note.");
        break;
      case 40:
        console.error("    - Your Merkle root is stale. Try re-syncing the tree.");
        break;
      case 41:
        console.error("    - This note has already been withdrawn (double-spend attempt).");
        break;
      case 42:
        console.error("    - The ZK proof was invalid. Ensure the note and Merkle path are correct.");
        break;
      default:
        console.error("    - Check the error code in the PrivacyLayer documentation.");
    }
  } else if (err instanceof ProofGenerationError) {
    console.error(`  ${context}: Proof Generation Error`);
    console.error(`  ${(err as Error).message}`);
    console.error();
    console.error("  The Noir WASM prover module is required for ZK proof generation.");
    console.error("  See the PrivacyLayer SDK documentation for setup instructions.");
  } else if (err instanceof NetworkError) {
    console.error(`  ${context}: Network Error`);
    console.error(`  ${(err as Error).message}`);
    console.error();
    console.error("  Possible causes:");
    console.error("    - Soroban RPC endpoint is unreachable");
    console.error("    - Network passphrase mismatch");
    console.error("    - Transaction timeout");
  } else {
    console.error(`  ${context}: ${(err as Error).message}`);
  }

  console.error();
  process.exit(1);
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

function printUsage(): void {
  printHeader("PrivacyLayer CLI");
  console.log("  Usage: npx tsx src/cli.ts <command> [options]");
  console.log();
  console.log("  Commands:");
  console.log("    status                          Show pool status");
  console.log("    deposit <denomination>          Deposit into pool");
  console.log("    withdraw <note-file> <address>  Withdraw with ZK proof");
  console.log("    monitor                         Monitor events in real-time");
  console.log("    check-nullifier <hash>          Check if nullifier is spent");
  console.log("    generate-note <denomination>    Generate a deposit note");
  console.log();
  console.log("  Denominations:");
  for (const [key, label] of Object.entries(DENOMINATION_AMOUNTS)) {
    console.log(`    ${key.padEnd(10)} ${label}`);
  }
  console.log();
  console.log("  Environment Variables:");
  console.log("    PRIVACY_LAYER_CONTRACT_ID  Contract address (required)");
  console.log("    PRIVACY_LAYER_NETWORK      testnet | mainnet (default: testnet)");
  console.log("    PRIVACY_LAYER_RPC_URL      Custom RPC URL");
  console.log("    STELLAR_SECRET_KEY         Depositor secret key (for deposit)");
  console.log();
  console.log("  Examples:");
  console.log("    # Check pool status");
  console.log("    export PRIVACY_LAYER_CONTRACT_ID=CABC123...");
  console.log("    npx tsx src/cli.ts status");
  console.log();
  console.log("    # Generate a note for 10 XLM deposit");
  console.log("    npx tsx src/cli.ts generate-note Xlm10");
  console.log();
  console.log("    # Deposit 10 XLM");
  console.log("    export STELLAR_SECRET_KEY=S...");
  console.log("    npx tsx src/cli.ts deposit Xlm10");
  console.log();
  console.log("    # Withdraw to a new address");
  console.log("    npx tsx src/cli.ts withdraw note-123456-Xlm10.txt GABC...");
  console.log();
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    process.exit(0);
  }

  // Commands that don't need a client
  if (command === "generate-note") {
    await cmdGenerateNote(args);
    return;
  }

  // All other commands need a client
  const config = loadConfig();
  const client = new PrivacyLayerClient(config);

  switch (command) {
    case "status":
      await cmdStatus(client);
      break;
    case "deposit":
      await cmdDeposit(client, args);
      break;
    case "withdraw":
      await cmdWithdraw(client, args);
      break;
    case "monitor":
      await cmdMonitor(client);
      break;
    case "check-nullifier":
      await cmdCheckNullifier(client, args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
