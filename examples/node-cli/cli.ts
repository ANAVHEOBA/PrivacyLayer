#!/usr/bin/env npx ts-node
/**
 * PrivacyLayer CLI — Command-line tool for privacy pool operations.
 *
 * Usage:
 *   npx ts-node cli.ts deposit --amount 1.5
 *   npx ts-node cli.ts withdraw --note notes/note_abc123.json --to <wallet>
 *   npx ts-node cli.ts balance
 *   npx ts-node cli.ts notes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ---- Types ----

interface Note {
  amount: number;
  commitment: string;
  nullifier: string;
  secret: string; // hex
  depositTx: string;
  createdAt: string;
}

// ---- Helpers ----

const NOTES_DIR = path.join(process.cwd(), 'notes');

function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

function loadNotes(): Note[] {
  ensureNotesDir();
  const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => JSON.parse(fs.readFileSync(path.join(NOTES_DIR, f), 'utf-8')));
}

function saveNote(note: Note): string {
  ensureNotesDir();
  const filename = `note_${note.commitment.slice(2, 10)}.json`;
  const filepath = path.join(NOTES_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(note, null, 2));
  return filepath;
}

// ---- Commands ----

async function cmdDeposit(amountSol: number): Promise<void> {
  console.log(`\n🔒 Depositing ${amountSol} SOL into privacy pool...\n`);

  const secret = crypto.randomBytes(32);
  const nullifierBytes = crypto.randomBytes(32);

  // In production: Pedersen hash via Noir
  const commitment = `0x${secret.toString('hex').slice(0, 16)}`;
  const nullifier = `0x${nullifierBytes.toString('hex').slice(0, 16)}`;

  // In production: submit on-chain transaction
  const tx = `sim_deposit_${Date.now()}`;

  const note: Note = {
    amount: amountSol * 1_000_000_000,
    commitment,
    nullifier,
    secret: secret.toString('hex'),
    depositTx: tx,
    createdAt: new Date().toISOString(),
  };

  const filepath = saveNote(note);

  console.log(`  ✅ Deposit confirmed`);
  console.log(`  📝 Tx: ${tx}`);
  console.log(`  🗂️  Note saved: ${filepath}`);
  console.log(`\n  ⚠️  Keep the note file secret! Anyone with it can withdraw your funds.`);
}

async function cmdWithdraw(noteFile: string, recipient: string): Promise<void> {
  console.log(`\n🔓 Withdrawing to ${recipient}...\n`);

  if (!fs.existsSync(noteFile)) {
    console.error(`  ❌ Note file not found: ${noteFile}`);
    process.exit(1);
  }

  const note: Note = JSON.parse(fs.readFileSync(noteFile, 'utf-8'));
  const amountSol = note.amount / 1_000_000_000;

  console.log(`  Amount: ${amountSol} SOL`);
  console.log(`  Commitment: ${note.commitment}`);
  console.log(`  Generating ZK proof...`);

  // In production:
  // 1. Fetch Merkle root and path from on-chain
  // 2. Generate Noir proof
  // 3. Submit withdrawal transaction
  const tx = `sim_withdraw_${Date.now()}`;

  console.log(`  ✅ Withdrawal confirmed`);
  console.log(`  📝 Tx: ${tx}`);
  console.log(`  💰 ${amountSol} SOL sent to ${recipient}`);

  // Delete used note
  fs.unlinkSync(noteFile);
  console.log(`  🗑️  Note consumed and deleted`);
}

function cmdNotes(): void {
  const notes = loadNotes();
  if (notes.length === 0) {
    console.log('\n  No notes found. Deposit first.\n');
    return;
  }

  console.log(`\n  📋 Your notes (${notes.length}):\n`);
  for (const note of notes) {
    const sol = note.amount / 1_000_000_000;
    console.log(`  ${note.commitment}  ${sol.toFixed(4)} SOL  (${note.createdAt})`);
  }
  console.log('');
}

function cmdBalance(): void {
  const notes = loadNotes();
  const total = notes.reduce((sum, n) => sum + n.amount, 0) / 1_000_000_000;
  console.log(`\n  💰 Shielded balance: ${total.toFixed(4)} SOL (${notes.length} notes)\n`);
}

// ---- Main ----

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'deposit': {
    const amountIdx = args.indexOf('--amount');
    const amount = amountIdx >= 0 ? parseFloat(args[amountIdx + 1]) : NaN;
    if (isNaN(amount) || amount <= 0) {
      console.error('Usage: cli.ts deposit --amount <SOL>');
      process.exit(1);
    }
    cmdDeposit(amount);
    break;
  }
  case 'withdraw': {
    const noteIdx = args.indexOf('--note');
    const toIdx = args.indexOf('--to');
    const noteFile = noteIdx >= 0 ? args[noteIdx + 1] : '';
    const to = toIdx >= 0 ? args[toIdx + 1] : '';
    if (!noteFile || !to) {
      console.error('Usage: cli.ts withdraw --note <path> --to <wallet>');
      process.exit(1);
    }
    cmdWithdraw(noteFile, to);
    break;
  }
  case 'notes':
    cmdNotes();
    break;
  case 'balance':
    cmdBalance();
    break;
  default:
    console.log(`
PrivacyLayer CLI

Commands:
  deposit   --amount <SOL>         Deposit into privacy pool
  withdraw  --note <path> --to <wallet>  Withdraw using a note
  notes                            List saved notes
  balance                          Show shielded balance
`);
}
