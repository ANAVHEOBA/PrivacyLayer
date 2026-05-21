/**
 * PrivacyLayer - Withdraw Example
 * 
 * This example demonstrates how to withdraw from the shielded pool
 * using a zero-knowledge proof.
 */

const { SorobanRpc, Keypair } = require('@stellar/stellar-sdk');
const { 
  syncMerkleTree, 
  generateMerkleProof, 
  generateZKProof,
  poseidonHash 
} = require('@privacylayer/sdk');

// Configuration
const RPC_URL = 'https://soroban-test.stellar.org';
const CONTRACT_ID = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
const SECRET_KEY = 'SCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // New recipient key

async function withdraw() {
  // Initialize
  const server = new SorobanRpc.Server(RPC_URL);
  const keypair = Keypair.fromSecret(SECRET_KEY);
  
  // Step 1: Load your saved note (from deposit)
  const note = {
    nullifier: Buffer.from('YOUR_NULLIFIER_HEX', 'hex'),
    secret: Buffer.from('YOUR_SECRET_HEX', 'hex'),
    commitment: Buffer.from('YOUR_COMMITMENT_HEX', 'hex'),
    leafIndex: 42 // Your leaf index from deposit
  };
  console.log('Loaded note for leaf:', note.leafIndex);
  
  // Step 2: Sync Merkle tree from contract
  // This fetches all leaves and rebuilds the tree client-side
  const merkleTree = await syncMerkleTree(CONTRACT_ID, server);
  console.log('Synced Merkle tree with', merkleTree.leaves.length, 'leaves');
  
  // Step 3: Generate Merkle proof for your note
  const merkleProof = generateMerkleProof(merkleTree, note.leafIndex);
  const currentRoot = merkleTree.root();
  console.log('Current root:', currentRoot.toString('hex'));
  
  // Step 4: Generate ZK proof (Groth16 via Noir)
  // This proves you know a valid note without revealing which one
  console.log('Generating ZK proof... (this may take 10-30 seconds)');
  const { proof, publicInputs } = await generateZKProof({
    note,
    merkleProof,
    recipient: keypair.publicKey()
  });
  console.log('✅ ZK proof generated');
  
  // Step 5: Build withdraw transaction
  const account = await server.getAccount(keypair.publicKey());
  
  const tx = await server.buildTransaction(account, (b) =>
    b
      .addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'withdraw',
          args: [
            { 
              type: 'struct', 
              value: {
                a: { type: 'bytes', value: proof.a },
                b: { type: 'bytes', value: proof.b },
                c: { type: 'bytes', value: proof.c }
              }
            },
            {
              type: 'struct',
              value: {
                root: { type: 'bytes', value: publicInputs.root },
                nullifier_hash: { type: 'bytes', value: publicInputs.nullifierHash },
                recipient: { type: 'address', value: keypair.publicKey() }
              }
            }
          ]
        }
      })
  );
  
  // Step 6: Sign and submit
  const signedTx = tx.sign([keypair]);
  const sentTx = await server.sendTransaction(signedTx);
  
  console.log('Transaction submitted:', sentTx.hash);
  
  // Step 7: Wait for confirmation
  const result = await server.getTransaction(sentTx.hash);
  
  if (result.status === 'SUCCESS') {
    console.log('✅ Withdrawal successful!');
    console.log('Funds sent to:', keypair.publicKey());
    
    // Your nullifier is now public on-chain
    // This prevents double-spending but doesn't link to your deposit
    console.log('Nullifier hash:', publicInputs.nullifierHash.toString('hex'));
  } else {
    console.error('❌ Withdrawal failed:', result);
  }
}

// Run
withdraw().catch(console.error);
