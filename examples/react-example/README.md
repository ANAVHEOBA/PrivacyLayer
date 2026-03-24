# PrivacyLayer React Integration Example

This example demonstrates how to integrate PrivacyLayer SDK into a React application.

## Installation

```bash
npm install @privacylayer/sdk
```

## Usage

```tsx
import React, { useState, useEffect } from 'react';
import { PrivacyLayer, Network } from '@privacylayer/sdk';

function App() {
  const [client, setClient] = useState(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const init = async () => {
      const pl = new PrivacyLayer({
        network: Network.TESTNET,
        apiKey: process.env.REACT_APP_PRIVACY_API_KEY
      });
      setClient(pl);
      
      const bal = await pl.getBalance();
      setBalance(bal.total);
    };
    init();
  }, []);

  const handleDeposit = async () => {
    if (!client) return;
    const result = await client.deposit({
      amount: 100,
      asset: 'USDC'
    });
    console.log('Deposit complete:', result.noteId);
  };

  return (
    <div>
      <h1>PrivacyLayer React Example</h1>
      <p>Balance: {balance} USDC</p>
      <button onClick={handleDeposit}>Deposit 100 USDC</button>
    </div>
  );
}

export default App;
```

## Running the Example

```bash
cd examples/react-example
npm install
npm start
```

## Features

- Initialize PrivacyLayer client
- Display balance
- Create deposits
- Handle withdrawals
