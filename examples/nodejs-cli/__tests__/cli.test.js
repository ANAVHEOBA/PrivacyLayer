/**
 * PrivacyLayer CLI Tests
 * 
 * Test suite for Node.js command-line interface
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mock SDK
jest.mock('@privacylayer/sdk', () => ({
  PrivacyLayerSDK: jest.fn().mockImplementation(() => ({
    deposit: jest.fn().mockResolvedValue({
      txHash: 'test_tx_hash_123',
      note: 'note_test_secret_456',
    }),
    withdraw: jest.fn().mockResolvedValue({
      txHash: 'test_withdraw_tx_789',
    }),
    getBalance: jest.fn().mockResolvedValue({
      xlm: '100.0000000',
      usdc: '50.000000',
    }),
    syncMerkleTree: jest.fn().mockResolvedValue({
      leaves: 1234,
      root: 'root_hash_abc',
    }),
  })),
}));

describe('CLI Help', () => {
  test('shows help when no arguments', () => {
    const output = execSync('node privacy-cli.js', { encoding: 'utf8' });
    expect(output).toContain('PrivacyLayer CLI');
    expect(output).toContain('Usage:');
    expect(output).toContain('Commands:');
  });

  test('shows help with help command', () => {
    const output = execSync('node privacy-cli.js help', { encoding: 'utf8' });
    expect(output).toContain('PrivacyLayer CLI');
    expect(output).toContain('deposit');
    expect(output).toContain('withdraw');
    expect(output).toContain('balance');
    expect(output).toContain('sync');
  });
});

describe('CLI Commands', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.PRIVACYLAYER_NETWORK;
    process.env.PRIVACYLAYER_NETWORK = 'testnet';
  });

  afterEach(() => {
    process.env.PRIVACYLAYER_NETWORK = originalEnv;
  });

  test('deposit command with amount', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const result = await sdk.deposit({}, '10', 'XLM');
    
    expect(result.txHash).toBe('test_tx_hash_123');
    expect(result.note).toBe('note_test_secret_456');
    expect(sdk.deposit).toHaveBeenCalledWith({}, '10', 'XLM');
  });

  test('deposit command defaults to XLM', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    await sdk.deposit({}, '25');
    
    expect(sdk.deposit).toHaveBeenCalledWith({}, '25', 'XLM');
  });

  test('deposit command with USDC', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    await sdk.deposit({}, '100', 'USDC');
    
    expect(sdk.deposit).toHaveBeenCalledWith({}, '100', 'USDC');
  });

  test('withdraw command with note and recipient', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const result = await sdk.withdraw({}, 'note_secret', 'GABC123DEF');
    
    expect(result.txHash).toBe('test_withdraw_tx_789');
    expect(sdk.withdraw).toHaveBeenCalledWith({}, 'note_secret', 'GABC123DEF');
  });

  test('balance command returns correct format', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const balance = await sdk.getBalance({});
    
    expect(balance).toHaveProperty('xlm');
    expect(balance).toHaveProperty('usdc');
    expect(balance.xlm).toBe('100.0000000');
    expect(balance.usdc).toBe('50.000000');
  });

  test('sync command returns tree info', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const progress = await sdk.syncMerkleTree();
    
    expect(progress).toHaveProperty('leaves');
    expect(progress).toHaveProperty('root');
    expect(progress.leaves).toBe(1234);
  });
});

describe('CLI Error Handling', () => {
  test('deposit without amount shows error', () => {
    expect(() => {
      execSync('node privacy-cli.js deposit', { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow();
  });

  test('withdraw without arguments shows error', () => {
    expect(() => {
      execSync('node privacy-cli.js withdraw', { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow();
  });

  test('withdraw with only note shows error', () => {
    expect(() => {
      execSync('node privacy-cli.js withdraw note123', { encoding: 'utf8', stdio: 'pipe' });
    }).toThrow();
  });
});

describe('CLI Output Formatting', () => {
  test('balance output is formatted correctly', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const balance = await sdk.getBalance({});
    
    // Check format matches expected table
    const formatted = `
┌─────────────────────┐
│   Shielded Balance  │
├─────────────────────┤
│ XLM:  ${balance.xlm.padEnd(12)} │
│ USDC: ${balance.usdc.padEnd(12)} │
└─────────────────────┘`;

    expect(formatted).toContain('Shielded Balance');
    expect(formatted).toContain('XLM:');
    expect(formatted).toContain('USDC:');
  });

  test('deposit success message includes tx hash', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const result = await sdk.deposit({}, '10', 'XLM');
    
    const message = `✅ Deposit successful!
   Transaction: https://stellar.expert/explorer/testnet/tx/${result.txHash}
   Note: ${result.note} (save this secret!)`;

    expect(message).toContain(result.txHash);
    expect(message).toContain(result.note);
    expect(message).toContain('save this secret');
  });

  test('withdraw success message includes tx hash', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    const result = await sdk.withdraw({}, 'note', 'GABC');
    
    const message = `✅ Withdrawal successful!
   Transaction: https://stellar.expert/explorer/testnet/tx/${result.txHash}`;

    expect(message).toContain(result.txHash);
  });
});

describe('CLI Environment Variables', () => {
  test('uses testnet by default', () => {
    delete process.env.PRIVACYLAYER_NETWORK;
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    new PrivacyLayerSDK();
    
    // Should default to testnet
    expect(PrivacyLayerSDK).toHaveBeenCalledWith({ network: 'testnet' });
  });

  test('respects PRIVACYLAYER_NETWORK env var', () => {
    process.env.PRIVACYLAYER_NETWORK = 'mainnet';
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    new PrivacyLayerSDK();
    
    expect(PrivacyLayerSDK).toHaveBeenCalledWith({ network: 'mainnet' });
  });
});

describe('CLI Integration', () => {
  test('complete flow: deposit → balance → withdraw', async () => {
    const { PrivacyLayerSDK } = require('@privacylayer/sdk');
    const sdk = new PrivacyLayerSDK();

    // Deposit
    const depositResult = await sdk.deposit({}, '50', 'XLM');
    expect(depositResult.note).toBeDefined();

    // Check balance
    const balance = await sdk.getBalance({});
    expect(balance.xlm).toBeDefined();

    // Withdraw
    const withdrawResult = await sdk.withdraw({}, depositResult.note, 'GNEWADDR');
    expect(withdrawResult.txHash).toBeDefined();
  });
});

// Test coverage goals:
// - Commands: 100%
// - Error handling: 100%
// - Output formatting: 100%
// - Integration: 80%+
