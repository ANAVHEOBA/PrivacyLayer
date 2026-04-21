/**
 * PrivacyLayer - Query Examples
 * 
 * Examples of read-only queries to the PrivacyLayer contract.
 */

const { SorobanRpc } = require('@stellar/stellar-sdk');

// Configuration
const RPC_URL = 'https://soroban-test.stellar.org';
const CONTRACT_ID = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

async function queryExamples() {
  const server = new SorobanRpc.Server(RPC_URL);
  
  // ──────────────────────────────────────────────────────────
  // Example 1: Get Current Merkle Root
  // ──────────────────────────────────────────────────────────
  
  async function getRoot() {
    const tx = await server.buildTransaction(
      await server.getAccount(CONTRACT_ID),
      (b) => b.addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'get_root',
          args: []
        }
      })
    );
    
    const result = await server.simulateTransaction(tx);
    console.log('Current Merkle Root:', result.result.retval.toString('hex'));
    return result.result.retval;
  }
  
  // ──────────────────────────────────────────────────────────
  // Example 2: Get Total Deposit Count
  // ──────────────────────────────────────────────────────────
  
  async function getDepositCount() {
    const tx = await server.buildTransaction(
      await server.getAccount(CONTRACT_ID),
      (b) => b.addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'deposit_count',
          args: []
        }
      })
    );
    
    const result = await server.simulateTransaction(tx);
    const count = result.result.retval;
    console.log('Total Deposits:', count);
    return count;
  }
  
  // ──────────────────────────────────────────────────────────
  // Example 3: Check if Root is Valid
  // ──────────────────────────────────────────────────────────
  
  async function checkRoot(root) {
    const tx = await server.buildTransaction(
      await server.getAccount(CONTRACT_ID),
      (b) => b.addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'is_known_root',
          args: [
            { type: 'bytes', value: root }
          ]
        }
      })
    );
    
    const result = await server.simulateTransaction(tx);
    const isValid = result.result.retval;
    console.log('Root is', isValid ? 'valid' : 'invalid');
    return isValid;
  }
  
  // ──────────────────────────────────────────────────────────
  // Example 4: Check if Nullifier is Spent
  // ──────────────────────────────────────────────────────────
  
  async function checkSpent(nullifierHash) {
    const tx = await server.buildTransaction(
      await server.getAccount(CONTRACT_ID),
      (b) => b.addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'is_spent',
          args: [
            { type: 'bytes', value: nullifierHash }
          ]
        }
      })
    );
    
    const result = await server.simulateTransaction(tx);
    const isSpent = result.result.retval;
    console.log('Nullifier is', isSpent ? 'spent' : 'unspent');
    return isSpent;
  }
  
  // ──────────────────────────────────────────────────────────
  // Example 5: Get Pool Configuration
  // ──────────────────────────────────────────────────────────
  
  async function getConfig() {
    const tx = await server.buildTransaction(
      await server.getAccount(CONTRACT_ID),
      (b) => b.addOperation({
        type: 'invokeHostFunction',
        hostFunction: {
          type: 'invokeContract',
          contractAddress: CONTRACT_ID,
          function: 'get_config_view',
          args: []
        }
      })
    );
    
    const result = await server.simulateTransaction(tx);
    const config = result.result.retval;
    console.log('Pool Configuration:', {
      admin: config.admin,
      token: config.token,
      denomination: config.denomination,
      isPaused: config.is_paused
    });
    return config;
  }
  
  // ──────────────────────────────────────────────────────────
  // Run All Examples
  // ──────────────────────────────────────────────────────────
  
  console.log('=== PrivacyLayer Query Examples ===\n');
  
  try {
    const root = await getRoot();
    console.log('');
    
    const count = await getDepositCount();
    console.log('');
    
    const isValid = await checkRoot(root);
    console.log('');
    
    const config = await getConfig();
    console.log('');
    
    // Example: Check a specific nullifier
    // const nullifierHash = Buffer.from('...', 'hex');
    // const isSpent = await checkSpent(nullifierHash);
    
  } catch (error) {
    console.error('Query failed:', error);
  }
}

// Run
queryExamples().catch(console.error);
