/**
 * PrivacyLayer Withdrawal Example
 * 
 * This example demonstrates how to withdraw funds from the PrivacyLayer shielded pool.
 */

import { Keypair, Server, TransactionBuilder } from 'stellar-sdk';

// Configuration
const SOROBAN_RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org:443';
const CONTRACT_ID = process.env.CONTRACT_ID || '';
const SECRET_KEY = process.env.SECRET_KEY || '';

interface Note {
  nullifier: string;
  secret: string;
  amount: bigint;
  asset: string;
  leafIndex?: number;
}

interface MerkleProof {
  root: string;
  leaf: string;
  pathElements: string[];
  pathIndices: number[];
}

interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}

/**
 * Load a stored note
 */
function loadNote(): Note {
  // In production, load from encrypted storage
  // This is an example placeholder
  return {
    nullifier: '0x...',
    secret: '0x...',
    amount: BigInt(1000000000),
    asset: 'XLM',
    leafIndex: 42,
  };
}

/**
 * Fetch Merkle tree state from the indexer
 */
async function getMerkleTreeState(): Promise<{ root: string; leafCount: number }> {
  const response = await fetch('https://api-testnet.privacylayer.io/v1/merkle/root');
  return response.json();
}

/**
 * Get Merkle proof for a leaf
 */
async function getMerkleProof(commitment: string): Promise<MerkleProof> {
  const response = await fetch(
    `https://api-testnet.privacylayer.io/v1/merkle/proof/${commitment}`
  );
  return response.json();
}

/**
 * Generate ZK proof using the prover service
 */
async function generateZKProof(params: {
  nullifier: string;
  secret: string;
  merkleProof: MerkleProof;
  recipient: string;
  relayer?: string;
  fee: bigint;
}): Promise<ZKProof> {
  const response = await fetch('https://api-testnet.privacylayer.io/v1/proof/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return response.json();
}

/**
 * Compute nullifier hash
 */
function computeNullifierHash(nullifier: string): string {
  // In production, use Poseidon hash
  // nullifierHash = Poseidon(nullifier)
  return '0x' + nullifier.slice(2).padEnd(66, '0').slice(0, 66);
}

/**
 * Compute commitment from nullifier and secret
 */
function computeCommitment(nullifier: string, secret: string): string {
  // In production, use Poseidon hash
  // commitment = Poseidon(nullifier, secret)
  return '0x' + (nullifier + secret).slice(2, 66);
}

/**
 * Main withdrawal flow
 */
async function withdraw(recipientAddress: string): Promise<void> {
  console.log('Starting PrivacyLayer withdrawal...\n');

  // 1. Initialize
  const server = new Server(SOROBAN_RPC_URL);
  const keypair = Keypair.fromSecret(SECRET_KEY);
  const publicKey = keypair.publicKey();

  console.log('Account:', publicKey);
  console.log('Recipient:', recipientAddress);

  // 2. Load the stored note
  const note = loadNote();
  console.log('\nLoaded note:');
  console.log('  Amount:', note.amount.toString(), 'stroops');
  console.log('  Asset:', note.asset);

  // 3. Compute commitment
  const commitment = computeCommitment(note.nullifier, note.secret);
  console.log('\nCommitment:', commitment);

  // 4. Get Merkle tree state
  console.log('\nFetching Merkle tree state...');
  const treeState = await getMerkleTreeState();
  console.log('Current root:', treeState.root);
  console.log('Leaf count:', treeState.leafCount);

  // 5. Get Merkle proof
  console.log('\nFetching Merkle proof...');
  const merkleProof = await getMerkleProof(commitment);
  console.log('Merkle proof root:', merkleProof.root);

  // 6. Generate ZK proof
  console.log('\nGenerating ZK proof...');
  const fee = BigInt(10000000); // 1 XLM fee (optional)
  const zkProof = await generateZKProof({
    nullifier: note.nullifier,
    secret: note.secret,
    merkleProof,
    recipient: recipientAddress,
    fee,
  });
  console.log('ZK proof generated');

  // 7. Build withdrawal transaction
  console.log('\nBuilding withdrawal transaction...');

  const nullifierHash = computeNullifierHash(note.nullifier);

  const account = await server.loadAccount(publicKey);
  const txBuilder = new TransactionBuilder(account, {
    fee: '200000',
    networkPassphrase: 'Test SDF Network ; September 2015',
  });

  // Add withdraw operation to the privacy pool contract
  // This is a simplified example - actual implementation uses Soroban SDK
  // txBuilder.addOperation(
  //   Operation.invokeHostFunction({
  //     func: xdr.HostFunction.hostFnTypeContractFn(
  //       xdr.ScVal.scvBytes(Buffer.from(CONTRACT_ID, 'hex')),
  //       'withdraw',
  //       [
  //         proofToScVal(zkProof),
  //         xdr.ScVal.scvBytes(Buffer.from(nullifierHash.slice(2), 'hex')),
  //         xdr.ScVal.scvAddress(recipientAddress),
  //         xdr.ScVal.scvOption(null),
  //         xdr.ScVal.scvI128(new xdr.Int128Parts({ lo: fee })),
  //       ]
  //     ),
  //   })
  // );

  const tx = txBuilder.setTimeout(30).build();

  // 8. Sign and submit
  console.log('\nSigning transaction...');
  tx.sign(keypair);

  console.log('Submitting to network...');
  try {
    const result = await server.submitTransaction(tx);
    console.log('\n✅ Withdrawal successful!');
    console.log('Transaction hash:', result.hash);
    console.log('Amount withdrawn:', note.amount.toString(), 'stroops');
    console.log('Recipient:', recipientAddress);

    // Delete the used note
    console.log('\n⚠️ Note has been spent. Remove from storage.');
  } catch (error) {
    console.error('\n❌ Withdrawal failed:', error);
    throw error;
  }
}

// Run the withdrawal
const recipient = process.argv[2] || 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
withdraw(recipient).catch(console.error);

/**
 * Example usage:
 * 
 * $ ts-node withdraw.ts GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF
 * 
 * Output:
 * Starting PrivacyLayer withdrawal...
 * 
 * Account: G...
 * Recipient: GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF
 * 
 * Loaded note:
 *   Amount: 1000000000 stroops
 *   Asset: XLM
 * 
 * Commitment: 0x...
 * 
 * Fetching Merkle tree state...
 * Current root: 0x...
 * Leaf count: 1234
 * 
 * Fetching Merkle proof...
 * Merkle proof root: 0x...
 * 
 * Generating ZK proof...
 * ZK proof generated
 * 
 * Building withdrawal transaction...
 * 
 * Signing transaction...
 * Submitting to network...
 * 
 * ✅ Withdrawal successful!
 * Transaction hash: abc123...
 * Amount withdrawn: 1000000000 stroops
 * Recipient: GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF
 * 
 * ⚠️ Note has been spent. Remove from storage.
 */