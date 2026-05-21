// PrivacyLayer TypeScript/JavaScript Examples
// Using Stellar SDK and Soroban Client

import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc } from '@stellar/stellar-sdk';

// Configuration
const CONTRACT_ADDRESS = 'CCXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Initialize Soroban RPC client
const server = new SorobanRpc.Server(RPC_URL);

// Initialize contract
const contract = new Contract(CONTRACT_ADDRESS);

/**
 * Example 1: Get current Merkle root
 */
async function getCurrentRoot() {
  try {
    const result = await server.getContractData(
      CONTRACT_ADDRESS,
      StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance()
    );

    // Call get_root method
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_root'))
      .setTimeout(30)
      .build();

    const response = await server.sendTransaction(tx);
    console.log('Current root:', response.result);
    return response.result;
  } catch (error) {
    console.error('Error getting root:', error);
    throw error;
  }
}

/**
 * Example 2: Deposit into the pool
 */
async function deposit(sourceKeypair: StellarSdk.Keypair, commitment: string) {
  try {
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    // Convert commitment to ScVal
    const commitmentBytes = Buffer.from(commitment.replace('0x', ''), 'hex');
    const commitmentScVal = StellarSdk.xdr.ScVal.scvBytes(commitmentBytes);

    // Build transaction
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '10000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'deposit',
          StellarSdk.Address.fromString(sourceKeypair.publicKey()).toScVal(),
          commitmentScVal
        )
      )
      .setTimeout(30)
      .build();

    // Sign transaction
    tx.sign(sourceKeypair);

    // Submit transaction
    const response = await server.sendTransaction(tx);
    console.log('Deposit response:', response);

    // Wait for confirmation
    let status = await server.getTransaction(response.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await server.getTransaction(response.hash);
    }

    if (status.status === 'SUCCESS') {
      console.log('Deposit successful!');
      console.log('Leaf index:', status.returnValue);
      return status.returnValue;
    } else {
      throw new Error(`Transaction failed: ${status.status}`);
    }
  } catch (error) {
    console.error('Error depositing:', error);
    throw error;
  }
}

/**
 * Example 3: Generate commitment (off-chain)
 */
function generateCommitment(nullifier: Buffer, secret: Buffer): string {
  // In production, use Poseidon2 hash
  // This is a placeholder - actual implementation requires Poseidon2 library
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.concat([nullifier, secret]));
  return '0x' + hash.digest('hex');
}

/**
 * Example 4: Withdraw from the pool
 */
async function withdraw(
  sourceKeypair: StellarSdk.Keypair,
  proof: { a: string; b: string; c: string },
  publicInputs: {
    root: string;
    nullifier_hash: string;
    recipient: string;
    amount: string;
    relayer: string;
    fee: string;
  }
) {
  try {
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

    // Convert proof to ScVal
    const proofScVal = StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('a'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(proof.a.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('b'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(proof.b.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('c'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(proof.c.replace('0x', ''), 'hex')),
      }),
    ]);

    // Convert public inputs to ScVal
    const publicInputsScVal = StellarSdk.xdr.ScVal.scvMap([
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('root'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(publicInputs.root.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('nullifier_hash'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(publicInputs.nullifier_hash.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('recipient'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(publicInputs.recipient.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('amount'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(publicInputs.amount.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('relayer'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(publicInputs.relayer.replace('0x', ''), 'hex')),
      }),
      new StellarSdk.xdr.ScMapEntry({
        key: StellarSdk.xdr.ScVal.scvSymbol('fee'),
        val: StellarSdk.xdr.ScVal.scvBytes(Buffer.from(publicInputs.fee.replace('0x', ''), 'hex')),
      }),
    ]);

    // Build transaction
    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call('withdraw', proofScVal, publicInputsScVal)
      )
      .setTimeout(30)
      .build();

    // Sign transaction
    tx.sign(sourceKeypair);

    // Submit transaction
    const response = await server.sendTransaction(tx);
    console.log('Withdraw response:', response);

    // Wait for confirmation
    let status = await server.getTransaction(response.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await server.getTransaction(response.hash);
    }

    if (status.status === 'SUCCESS') {
      console.log('Withdrawal successful!');
      return status.returnValue;
    } else {
      throw new Error(`Transaction failed: ${status.status}`);
    }
  } catch (error) {
    console.error('Error withdrawing:', error);
    throw error;
  }
}

/**
 * Example 5: Check if nullifier is spent
 */
async function isNullifierSpent(nullifierHash: string): Promise<boolean> {
  try {
    const sourceAccount = await server.getAccount(StellarSdk.Keypair.random().publicKey());

    const nullifierBytes = Buffer.from(nullifierHash.replace('0x', ''), 'hex');
    const nullifierScVal = StellarSdk.xdr.ScVal.scvBytes(nullifierBytes);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('is_spent', nullifierScVal))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (simulated.result) {
      return simulated.result.retval.value();
    }

    return false;
  } catch (error) {
    console.error('Error checking nullifier:', error);
    throw error;
  }
}

/**
 * Example 6: Get deposit count
 */
async function getDepositCount(): Promise<number> {
  try {
    const sourceAccount = await server.getAccount(StellarSdk.Keypair.random().publicKey());

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('deposit_count'))
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(tx);

    if (simulated.result) {
      return simulated.result.retval.value();
    }

    return 0;
  } catch (error) {
    console.error('Error getting deposit count:', error);
    throw error;
  }
}

// Export functions
export {
  getCurrentRoot,
  deposit,
  generateCommitment,
  withdraw,
  isNullifierSpent,
  getDepositCount,
};
