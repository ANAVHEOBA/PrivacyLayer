/**
 * PrivacyLayer TypeScript SDK Examples
 * 
 * Install: npm install @privacylayer/sdk
 * Or use the client directly with stellar-sdk
 */

import { SorobanRpc, TransactionBuilder, Networks, xdr, Address } from '@stellar/stellar-sdk';

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────

const CONFIG = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org:443',
    networkPassphrase: Networks.TESTNET,
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B',
  },
  mainnet: {
    rpcUrl: 'https://soroban-mainnet.stellar.org:443',
    networkPassphrase: Networks.PUBLIC,
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B',
  },
};

const env = 'testnet';
const config = CONFIG[env];

// ─────────────────────────────────────────────────────────────────
// Client Setup
// ─────────────────────────────────────────────────────────────────

const server = new SorobanRpc.Server(config.rpcUrl);

async function getClient() {
  // Use Freighter or other wallet
  // This is a placeholder - integrate with your wallet
  const wallet = await connectWallet();
  return wallet;
}

// ─────────────────────────────────────────────────────────────────
// Example 1: Initialize Pool (Admin)
// ─────────────────────────────────────────────────────────────────

async function initializePool() {
  const wallet = await getClient();
  
  const admin = wallet.publicKey;
  const token = 'CCHEGGH7VWDPOHCQFDKH2TJ5TTKYQ4FW8VBA5EOFWYPG5CLIBVH2GLI5'; // USDC
  
  // Denomination: 100 USDC (in micro-units)
  const denomination = {
    tag: 'USDC',
    value: BigInt(100_000_000), // 100 USDC with 6 decimals
  };
  
  // Verifying key (placeholder - get from circuit setup)
  const verifyingKey = {
    alpha_g1: ['0x...', '0x...'],
    beta_g2: [['0x...', '0x...'], ['0x...', '0x...']],
    gamma_g2: [['0x...', '0x...'], ['0x...', '0x...']],
    delta_g2: [['0x...', '0x...'], ['0x...', '0x...']],
    ic: [],
  };
  
  // Build transaction
  const account = await server.getAccount(wallet.publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      xdr.Operation.contractCall({
        contract: config.contractId,
        function_name: 'initialize',
        args: [
          Address.fromString(admin).toScVal(),
          Address.fromString(token).toScVal(),
          xdr.ScVal.scvMap([
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('tag'),
              val: xdr.ScVal.scvSymbol('USDC'),
            }),
            new xdr.ScMapEntry({
              key: xdr.ScVal.scvSymbol('value'),
              val: xdr.ScVal.scvInt128Parts({ lo: BigInt(100_000_000), hi: BigInt(0) }),
            }),
          ]),
          // Verifying key SCVal...
        ],
      })
    )
    .setTimeout(30)
    .build();
  
  // Sign and submit
  const signedTx = await wallet.signTransaction(tx);
  const result = await server.sendTransaction(signedTx);
  
  console.log('Pool initialized:', result);
  return result;
}

// ─────────────────────────────────────────────────────────────────
// Example 2: Deposit
// ─────────────────────────────────────────────────────────────────

async function deposit() {
  const wallet = await getClient();
  
  // 1. Generate note (nullifier + secret)
  const nullifier = generateRandomBytes(31);
  const secret = generateRandomBytes(31);
  
  // 2. Compute commitment using Poseidon hash
  const commitment = await poseidon2Hash(nullifier, secret);
  
  // 3. Build deposit transaction
  const account = await server.getAccount(wallet.publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      xdr.Operation.contractCall({
        contract: config.contractId,
        function_name: 'deposit',
        args: [
          Address.fromString(wallet.publicKey).toScVal(),
          commitmentToScVal(commitment),
        ],
      })
    )
    .setTimeout(30)
    .build();
  
  // 4. Sign and submit
  const signedTx = await wallet.signTransaction(tx);
  const result = await server.sendTransaction(signedTx);
  
  // 5. Extract leaf index from result
  const leafIndex = parseLeafIndexFromResult(result);
  
  // 6. Store note securely
  const note = {
    nullifier: bufferToHex(nullifier),
    secret: bufferToHex(secret),
    leafIndex,
    commitment: bufferToHex(commitment),
    denomination: 'USDC',
    amount: 100,
    network: env,
    createdAt: Date.now(),
  };
  
  // Save to secure storage
  saveNoteToStorage(note);
  
  console.log('Deposit successful!');
  console.log('Leaf index:', leafIndex);
  console.log('Note (KEEP SECRET):', note);
  
  return note;
}

// ─────────────────────────────────────────────────────────────────
// Example 3: Withdraw
// ─────────────────────────────────────────────────────────────────

async function withdraw(note, recipientAddress) {
  const wallet = await getClient();
  
  // 1. Sync Merkle tree
  const leaves = await fetchAllLeaves();
  const tree = buildMerkleTree(leaves);
  
  // 2. Get Merkle proof for your commitment
  const merkleProof = tree.getProof(note.leafIndex);
  const root = tree.root();
  
  // 3. Generate ZK proof using Noir prover
  const zkProof = await generateZKProof({
    nullifier: hexToBuffer(note.nullifier),
    secret: hexToBuffer(note.secret),
    merkleProof,
    root,
    recipient: recipientAddress,
  });
  
  // 4. Build withdraw transaction
  const account = await server.getAccount(wallet.publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: '200', // Higher fee for withdraw
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(
      xdr.Operation.contractCall({
        contract: config.contractId,
        function_name: 'withdraw',
        args: [
          proofToScVal(zkProof.proof),
          publicInputsToScVal({
            root,
            nullifierHash: zkProof.nullifierHash,
            recipient: recipientAddress,
          }),
        ],
      })
    )
    .setTimeout(30)
    .build();
  
  // 5. Sign and submit
  const signedTx = await wallet.signTransaction(tx);
  const result = await server.sendTransaction(signedTx);
  
  // 6. Mark note as spent
  markNoteAsSpent(note);
  
  console.log('Withdrawal successful!');
  console.log('Recipient:', recipientAddress);
  
  return result;
}

// ─────────────────────────────────────────────────────────────────
// Example 4: Query Pool State
// ─────────────────────────────────────────────────────────────────

async function queryPoolState() {
  // Get current root
  const rootResult = await server.simulateTransaction(
    buildViewCall('get_root', [])
  );
  const root = parseBytes32(rootResult);
  
  // Get deposit count
  const countResult = await server.simulateTransaction(
    buildViewCall('deposit_count', [])
  );
  const count = parseU32(countResult);
  
  // Get config
  const configResult = await server.simulateTransaction(
    buildViewCall('get_config', [])
  );
  const poolConfig = parsePoolConfig(configResult);
  
  console.log('Pool State:');
  console.log('- Root:', root);
  console.log('- Deposits:', count);
  console.log('- Token:', poolConfig.token);
  console.log('- Denomination:', poolConfig.denomination);
  console.log('- Paused:', poolConfig.paused);
  
  return { root, count, config: poolConfig };
}

// ─────────────────────────────────────────────────────────────────
// Example 5: Check Note Status
// ─────────────────────────────────────────────────────────────────

async function checkNoteStatus(note) {
  // 1. Get current root and check if it's known
  const rootResult = await server.simulateTransaction(
    buildViewCall('get_root', [])
  );
  const currentRoot = parseBytes32(rootResult);
  
  // 2. Check if note's nullifier is spent
  const nullifierHash = await computeNullifierHash(note.nullifier);
  const spentResult = await server.simulateTransaction(
    buildViewCall('is_spent', [bytes32ToScVal(nullifierHash)])
  );
  const isSpent = parseBool(spentResult);
  
  // 3. Get leaves and check if commitment is in tree
  const leaves = await fetchAllLeaves();
  const isInTree = leaves.includes(note.commitment);
  
  console.log('Note Status:');
  console.log('- Spent:', isSpent);
  console.log('- In Tree:', isInTree);
  console.log('- Can Withdraw:', !isSpent && isInTree);
  
  return {
    isSpent,
    isInTree,
    canWithdraw: !isSpent && isInTree,
  };
}

// ─────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────

function generateRandomBytes(length: number): Buffer {
  return require('crypto').randomBytes(length);
}

function bufferToHex(buffer: Buffer): string {
  return '0x' + buffer.toString('hex');
}

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.replace('0x', ''), 'hex');
}

async function poseidon2Hash(a: Buffer, b: Buffer): Promise<Buffer> {
  // Use noir.js or native implementation
  // This is a placeholder
  const { poseidon2 } = await import('@privacylayer/crypto');
  return poseidon2(a, b);
}

async function generateZKProof(inputs: any): Promise<any> {
  // Use noir.js to generate proof
  // This requires the compiled circuit
  const { generateProof } = await import('@privacylayer/prover');
  return generateProof(inputs);
}

function buildMerkleTree(leaves: string[]): any {
  // Build incremental Merkle tree
  // Depth = 20
  const { MerkleTree } = require('@privacylayer/merkle');
  return new MerkleTree(20, leaves);
}

async function fetchAllLeaves(): Promise<string[]> {
  // Fetch all deposit events from the contract
  // Use Stellar RPC event streaming
  const events = await server.getEvents({
    filters: [{
      type: 'contract',
      contractIds: [config.contractId],
      topics: [['deposit']],
    }],
    startLedger: 1,
  });
  
  return events.map(e => e.value.commitment);
}

function saveNoteToStorage(note: any) {
  // Save to secure storage (localStorage, IndexedDB, or encrypted)
  const notes = JSON.parse(localStorage.getItem('privacylayer_notes') || '[]');
  notes.push(note);
  localStorage.setItem('privacylayer_notes', JSON.stringify(notes));
}

function markNoteAsSpent(note: any) {
  const notes = JSON.parse(localStorage.getItem('privacylayer_notes') || '[]');
  const updated = notes.map(n => 
    n.commitment === note.commitment ? { ...n, spent: true } : n
  );
  localStorage.setItem('privacylayer_notes', JSON.stringify(updated));
}

// ─────────────────────────────────────────────────────────────────
// Usage
// ─────────────────────────────────────────────────────────────────

async function main() {
  try {
    // Query pool state
    await queryPoolState();
    
    // Deposit
    const note = await deposit();
    
    // Check note status
    await checkNoteStatus(note);
    
    // Withdraw
    const recipient = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    await withdraw(note, recipient);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();