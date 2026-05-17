import '@testing-library/jest-dom';

// Mock @privacylayer/sdk
jest.mock('@privacylayer/sdk', () => ({
  PrivacyLayerSDK: jest.fn().mockImplementation(() => ({
    deposit: jest.fn().mockResolvedValue({ txHash: 'mock_tx', note: 'mock_note' }),
    withdraw: jest.fn().mockResolvedValue({ txHash: 'mock_tx' }),
    getBalance: jest.fn().mockResolvedValue({ xlm: '100', usdc: '50' }),
    syncMerkleTree: jest.fn().mockResolvedValue({ leaves: 1000, root: 'mock_root' }),
  })),
}));

jest.mock('@privacylayer/sdk/react', () => ({
  PrivacyLayerProvider: ({ children }) => <div data-testid="provider">{children}</div>,
  useDeposit: () => ({
    deposit: jest.fn(),
    status: 'idle',
    error: null,
    txHash: null,
  }),
  useWithdraw: () => ({
    withdraw: jest.fn(),
    status: 'idle',
    error: null,
    txHash: null,
  }),
  useBalance: () => ({
    balance: { xlm: '100', usdc: '50' },
    loading: false,
    error: null,
  }),
}));

jest.mock('@privacylayer/sdk/wallets/freighter', () => ({
  connectWallet: jest.fn(),
}));
