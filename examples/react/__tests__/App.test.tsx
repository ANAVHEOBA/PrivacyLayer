/**
 * PrivacyLayer React Component Tests
 * 
 * Test suite for React integration examples
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App, DepositSection, WithdrawSection, BalanceSection } from '../App';

// Mock the SDK
jest.mock('@privacylayer/sdk/react', () => ({
  PrivacyLayerProvider: ({ children }: any) => <div>{children}</div>,
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

describe('App Component', () => {
  test('renders header with title', () => {
    render(<App />);
    expect(screen.getByText(/PrivacyLayer React Demo/i)).toBeInTheDocument();
  });

  test('shows connect wallet button initially', () => {
    render(<App />);
    expect(screen.getByText(/Connect Freighter/i)).toBeInTheDocument();
  });

  test('displays network selector', () => {
    render(<App />);
    const selector = screen.getByRole('combobox');
    expect(selector).toHaveValue('testnet');
  });
});

describe('DepositSection', () => {
  test('renders deposit form', () => {
    render(<DepositSection />);
    expect(screen.getByText(/Deposit to Shielded Pool/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/10.0/i)).toBeInTheDocument();
  });

  test('allows selecting asset type', () => {
    render(<DepositSection />);
    const assetSelect = screen.getByLabelText(/Asset/i);
    
    fireEvent.change(assetSelect, { target: { value: 'USDC' } });
    expect(assetSelect).toHaveValue('USDC');
  });

  test('submits deposit form', async () => {
    const { deposit } = require('@privacylayer/sdk/react').useDeposit();
    
    render(<DepositSection />);
    
    fireEvent.change(screen.getByPlaceholderText(/10.0/i), {
      target: { value: '100' },
    });
    
    fireEvent.click(screen.getByText(/Deposit/i));
    
    await waitFor(() => {
      expect(deposit).toHaveBeenCalledWith('100', 'XLM');
    });
  });

  test('shows success message after deposit', async () => {
    // Mock success state
    require('@privacylayer/sdk/react').useDeposit.mockReturnValue({
      deposit: jest.fn(),
      status: 'success',
      error: null,
      txHash: 'abc123',
    });

    render(<DepositSection />);
    
    await waitFor(() => {
      expect(screen.getByText(/Deposit successful/i)).toBeInTheDocument();
    });
  });

  test('shows error message on failure', async () => {
    // Mock error state
    require('@privacylayer/sdk/react').useDeposit.mockReturnValue({
      deposit: jest.fn(),
      status: 'error',
      error: 'Insufficient balance',
      txHash: null,
    });

    render(<DepositSection />);
    
    await waitFor(() => {
      expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
    });
  });
});

describe('WithdrawSection', () => {
  test('renders withdraw form', () => {
    render(<WithdrawSection />);
    expect(screen.getByText(/Withdraw Privately/i)).toBeInTheDocument();
  });

  test('requires note and recipient', () => {
    render(<WithdrawSection />);
    
    const withdrawButton = screen.getByText(/Withdraw/i);
    expect(withdrawButton).toBeDisabled();
  });

  test('submits withdraw form with valid data', async () => {
    const { withdraw } = require('@privacylayer/sdk/react').useWithdraw();
    
    render(<WithdrawSection />);
    
    fireEvent.change(screen.getByPlaceholderText(/note secret/i), {
      target: { value: 'note_abc123' },
    });
    
    fireEvent.change(screen.getByPlaceholderText(/G.../i), {
      target: { value: 'GABC123DEF456' },
    });
    
    fireEvent.click(screen.getByText(/Withdraw/i));
    
    await waitFor(() => {
      expect(withdraw).toHaveBeenCalledWith('note_abc123', 'GABC123DEF456');
    });
  });
});

describe('BalanceSection', () => {
  test('displays shielded balance', () => {
    render(<BalanceSection />);
    
    expect(screen.getByText(/100 XLM/i)).toBeInTheDocument();
    expect(screen.getByText(/50 USDC/i)).toBeInTheDocument();
  });

  test('shows loading state', () => {
    require('@privacylayer/sdk/react').useBalance.mockReturnValue({
      balance: null,
      loading: true,
      error: null,
    });

    render(<BalanceSection />);
    expect(screen.getByText(/Loading balance/i)).toBeInTheDocument();
  });

  test('shows error state', () => {
    require('@privacylayer/sdk/react').useBalance.mockReturnValue({
      balance: null,
      loading: false,
      error: 'Failed to load',
    });

    render(<BalanceSection />);
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('complete deposit flow', async () => {
    render(<App />);
    
    // Connect wallet
    fireEvent.click(screen.getByText(/Connect Freighter/i));
    
    // Make deposit
    fireEvent.change(screen.getByPlaceholderText(/10.0/i), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByText(/Deposit/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Deposit successful/i)).toBeInTheDocument();
    });
  });

  test('complete withdraw flow', async () => {
    render(<App />);
    
    // Fill withdraw form
    fireEvent.change(screen.getByPlaceholderText(/note secret/i), {
      target: { value: 'note_xyz789' },
    });
    fireEvent.change(screen.getByPlaceholderText(/G.../i), {
      target: { value: 'GNEW123ADDRESS' },
    });
    fireEvent.click(screen.getByText(/Withdraw/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Withdrawal successful/i)).toBeInTheDocument();
    });
  });
});

// Test coverage goals:
// - Components: 100%
// - Hooks: 100%
// - Integration: 80%+
