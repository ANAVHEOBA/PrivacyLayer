# PrivacyLayer Node.js CLI Example

Command-line interface for PrivacyLayer operations.

## Installation

```bash
npm install @privacylayer/sdk
```

## Usage

```javascript
#!/usr/bin/env node
const { PrivacyLayer, Network } = require('@privacylayer/sdk');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  const client = new PrivacyLayer({
    network: Network.TESTNET,
    apiKey: process.env.PRIVACY_API_KEY
  });

  console.log('PrivacyLayer CLI');
  console.log('Commands: deposit, withdraw, balance, exit');

  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');

    switch (command) {
      case 'deposit':
        const amount = parseFloat(args[0]) || 100;
        const result = await client.deposit({ amount, asset: 'USDC' });
        console.log(`Deposit complete: ${result.noteId}`);
        break;

      case 'withdraw':
        const withdrawAmount = parseFloat(args[0]) || 50;
        const withdrawResult = await client.withdraw({
          noteId: args[1],
          amount: withdrawAmount
        });
        console.log(`Withdraw complete: ${withdrawResult.txHash}`);
        break;

      case 'balance':
        const balance = await client.getBalance();
        console.log(`Balance: ${balance.total} USDC`);
        break;

      case 'exit':
        rl.close();
        return;

      default:
        console.log('Unknown command');
    }

    rl.prompt();
  });
}

main().catch(console.error);
```

## Running

```bash
node cli.js
> deposit 100
> balance
> exit
```
