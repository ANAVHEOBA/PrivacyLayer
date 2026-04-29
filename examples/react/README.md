# PrivacyLayer React Integration Example

Complete React integration example for PrivacyLayer shielded pool.

## Features

- Deposit flow with wallet connection
- Withdraw flow with ZK proof generation
- Merkle tree sync
- Transaction status tracking

## Installation

```bash
npm install @privacylayer/sdk ethers@6
```

## Usage

```jsx
import { PrivacyLayerProvider, useDeposit, useWithdraw } from '@privacylayer/sdk/react';

function App() {
  return (
    <PrivacyLayerProvider network="testnet">
      <DepositForm />
      <WithdrawForm />
    </PrivacyLayerProvider>
  );
}

function DepositForm() {
  const { deposit, status, error } = useDeposit();
  
  const handleDeposit = async (amount: string) => {
    await deposit(amount);
  };
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleDeposit(e.target.amount.value); }}>
      <input name="amount" placeholder="Amount (XLM/USDC)" />
      <button type="submit" disabled={status === 'pending'}>
        {status === 'pending' ? 'Depositing...' : 'Deposit'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function WithdrawForm() {
  const { withdraw, status, error } = useWithdraw();
  
  const handleWithdraw = async (note: string, recipient: string) => {
    await withdraw(note, recipient);
  };
  
  return (
    <form onSubmit={(e) => { e.preventDefault(); handleWithdraw(e.target.note.value, e.target.recipient.value); }}>
      <input name="note" placeholder="Note (secret)" />
      <input name="recipient" placeholder="Recipient address" />
      <button type="submit" disabled={status === 'pending'}>
        {status === 'pending' ? 'Withdrawing...' : 'Withdraw'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

## Full Example

See `App.tsx` for a complete working example with Freighter wallet integration.

## License

MIT
