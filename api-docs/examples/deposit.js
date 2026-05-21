/**
 * PrivacyLayer - Deposit Example
 * 
 * This example demonstrates how to deposit XLM into the shielded pool.
 */

const { SorobanRpc, Address, Keypair } = require('@stellar/stellar-sdk');
const { generateNote, poseidonHash } = require('@privacylayer/sdk');

// Configuration
const RPC_URL = 'https://soroban-test.stellar.org';
const CONTRACT_ID = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
const SECRET_KEY = 'SCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // Replace with your key

async function deposit() {
  // Initialize
  const server = new SorobanRpc.Server(RPC_URL);
  const keypair = Keypair.fromSecret(SECRET_KEY);
  
  // Step 1: Generate a new note (client-side)
  // This creates a nullifier and secret that only you know
  const { nullifier, secret } = generateNote();
  console.log('Generated note:', { 
    nullifier: nullifier.toString('hex'),
    secret: secret.toString('hex')
  });
  
  // Step 2: Compute commitment = Poseidon(nullifier || secret)
  const commitment = poseidonHash(nullifier, secret);
  console.log('Commitment:', commitment.toString('hex'));
  
  // Step 3: Build deposit transaction
  const account = await server.getAccount(keypair.publicKey());
  
  const tx = await server.buildTransaction(account, (b) =>
    b
      .addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'deposit',
          args: [
            { type: 'address', value: keypair.publicKey() },
            { type: 'bytes', value: commitment }
          ]
        }
      })
  );
  
  // Step 4: Sign and submit
  const signedTx = tx.sign([keypair]);
  const sentTx = await server.sendTransaction(signedTx);
  
  console.log('Transaction submitted:', sentTx.hash);
  
  // Step 5: Wait for confirmation
  const result = await server.getTransaction(sentTx.hash);
  
  if (result.status === 'SUCCESS') {
    const { leafIndex, commitment } = result.returnValue;
    console.log('✅ Deposit successful!');
    console.log('Leaf index:', leafIndex);
    console.log('Commitment:', commitment);
    
    // IMPORTANT: Save your note securely!
    // You'll need it for withdrawal
    const note = {
      nullifier: nullifier.toString('hex'),
      secret: secret.toString('hex'),
      commitment: commitment.toString('hex'),
      leafIndex: leafIndex
    };
    console.log('Save this note securely:', JSON.stringify(note, null, 2));
  } else {
    console.error('❌ Deposit failed:', result);
  }
}

// Run
deposit().catch(console.error);
