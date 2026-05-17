import React, { useState } from 'react';
import { PrivacyLayerProvider, useDeposit, useWithdraw, useBalance } from '@privacylayer/sdk/react';
import { connectWallet } from '@privacylayer/sdk/wallets/freighter';

// Main App Component
export function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');

  const handleConnect = async () => {
    try {
      await connectWallet();
      setWalletConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <PrivacyLayerProvider network={network}>
      <div className="app">
        <header>
          <h1>🔐 PrivacyLayer React Demo</h1>
          <div className="wallet-status">
            {walletConnected ? (
              <span className="connected">● Connected</span>
            ) : (
              <button onClick={handleConnect}>Connect Freighter</button>
            )}
            <select value={network} onChange={(e) => setNetwork(e.target.value as any)}>
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>
        </header>

        <main>
          <DepositSection />
          <WithdrawSection />
          <BalanceSection />
        </main>
      </div>
    </PrivacyLayerProvider>
  );
}

// Deposit Section
function DepositSection() {
  const { deposit, status, error, txHash } = useDeposit();
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('XLM');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await deposit(amount, asset);
      setAmount('');
    } catch (err) {
      console.error('Deposit failed:', err);
    }
  };

  return (
    <section className="deposit-section">
      <h2>💰 Deposit to Shielded Pool</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            step="0.0000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10.0"
            required
          />
        </div>
        <div className="form-group">
          <label>Asset</label>
          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
        <button type="submit" disabled={status === 'pending' || !amount}>
          {status === 'pending' ? '⏳ Depositing...' : '🔒 Deposit'}
        </button>
        {status === 'success' && (
          <p className="success">
            ✅ Deposit successful!{' '}
            <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank">
              View on Explorer
            </a>
          </p>
        )}
        {error && <p className="error">❌ {error}</p>}
      </form>
    </section>
  );
}

// Withdraw Section
function WithdrawSection() {
  const { withdraw, status, error, txHash } = useWithdraw();
  const [note, setNote] = useState('');
  const [recipient, setRecipient] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await withdraw(note, recipient);
      setNote('');
      setRecipient('');
    } catch (err) {
      console.error('Withdraw failed:', err);
    }
  };

  return (
    <section className="withdraw-section">
      <h2>💸 Withdraw Privately</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Note (Secret)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Your note secret"
            required
          />
        </div>
        <div className="form-group">
          <label>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="G... (Stellar address)"
            required
          />
        </div>
        <button type="submit" disabled={status === 'pending' || !note || !recipient}>
          {status === 'pending' ? '⏳ Generating Proof...' : '🔓 Withdraw'}
        </button>
        {status === 'success' && (
          <p className="success">
            ✅ Withdrawal successful!{' '}
            <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank">
              View on Explorer
            </a>
          </p>
        )}
        {error && <p className="error">❌ {error}</p>}
      </form>
    </section>
  );
}

// Balance Section
function BalanceSection() {
  const { balance, loading, error } = useBalance();

  if (loading) return <div>Loading balance...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <section className="balance-section">
      <h2>📊 Your Balance</h2>
      <div className="balance-card">
        <div className="balance-item">
          <span className="label">Shielded XLM</span>
          <span className="value">{balance?.xlm || '0'} XLM</span>
        </div>
        <div className="balance-item">
          <span className="label">Shielded USDC</span>
          <span className="value">{balance?.usdc || '0'} USDC</span>
        </div>
      </div>
    </section>
  );
}

export default App;

// Export components individually for testing
export { DepositSection, WithdrawSection, BalanceSection };
