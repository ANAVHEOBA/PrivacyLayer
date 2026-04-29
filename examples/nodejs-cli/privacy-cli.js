#!/usr/bin/env node

/**
 * PrivacyLayer CLI - Node.js Command Line Interface
 * 
 * Usage:
 *   node privacy-cli.js deposit <amount> [asset]
 *   node privacy-cli.js withdraw <note> <recipient>
 *   node privacy-cli.js balance
 *   node privacy-cli.js sync
 */

const { PrivacyLayerSDK } = require('@privacylayer/sdk');
const { loadWallet } = require('@privacylayer/sdk/wallets/file');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const sdk = new PrivacyLayerSDK({ network: process.env.PRIVACYLAYER_NETWORK || 'testnet' });

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'deposit':
        await cmdDeposit(args[0], args[1] || 'XLM');
        break;
      case 'withdraw':
        await cmdWithdraw(args[0], args[1]);
        break;
      case 'balance':
        await cmdBalance();
        break;
      case 'sync':
        await cmdSync();
        break;
      case 'help':
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function cmdDeposit(amount, asset) {
  if (!amount) {
    console.error('Usage: privacy-cli.js deposit <amount> [asset]');
    process.exit(1);
  }

  console.log(`🔒 Depositing ${amount} ${asset} to shielded pool...`);
  
  const wallet = await loadWallet();
  const result = await sdk.deposit(wallet, amount, asset);
  
  console.log('✅ Deposit successful!');
  console.log(`   Transaction: https://stellar.expert/explorer/testnet/tx/${result.txHash}`);
  console.log(`   Note: ${result.note} (save this secret!)`);
}

async function cmdWithdraw(note, recipient) {
  if (!note || !recipient) {
    console.error('Usage: privacy-cli.js withdraw <note> <recipient>');
    process.exit(1);
  }

  console.log('🔓 Generating zero-knowledge proof...');
  console.log(`   Withdrawing to: ${recipient}`);
  
  const wallet = await loadWallet();
  const result = await sdk.withdraw(wallet, note, recipient);
  
  console.log('✅ Withdrawal successful!');
  console.log(`   Transaction: https://stellar.expert/explorer/testnet/tx/${result.txHash}`);
}

async function cmdBalance() {
  console.log('📊 Loading shielded balance...');
  
  const wallet = await loadWallet();
  const balance = await sdk.getBalance(wallet);
  
  console.log('┌─────────────────────┐');
  console.log('│   Shielded Balance  │');
  console.log('├─────────────────────┤');
  console.log(`│ XLM:  ${balance.xlm.padEnd(12)} │`);
  console.log(`│ USDC: ${balance.usdc.padEnd(12)} │`);
  console.log('└─────────────────────┘');
}

async function cmdSync() {
  console.log('🔄 Synchronizing Merkle tree...');
  
  const progress = await sdk.syncMerkleTree();
  console.log(`✅ Synced ${progress.leaves} leaves`);
  console.log(`   Root: ${progress.root}`);
}

function showHelp() {
  console.log(`
🔐 PrivacyLayer CLI

Usage:
  privacy-cli.js <command> [arguments]

Commands:
  deposit <amount> [asset]     Deposit to shielded pool (asset: XLM or USDC)
  withdraw <note> <recipient>  Withdraw privately using note secret
  balance                      Show your shielded balance
  sync                         Synchronize Merkle tree
  help                         Show this help message

Environment Variables:
  PRIVACYLAYER_NETWORK         Network (testnet or mainnet, default: testnet)

Examples:
  node privacy-cli.js deposit 10 XLM
  node privacy-cli.js withdraw <note-secret> GABC...DEF
  node privacy-cli.js balance
`);
}

main();
