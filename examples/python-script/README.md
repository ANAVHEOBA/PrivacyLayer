# PrivacyLayer Python Integration Example

Python script for PrivacyLayer operations.

## Installation

```bash
pip install privacylayer-sdk
```

## Usage

```python
#!/usr/bin/env python3
import asyncio
import os
from privacylayer import PrivacyLayer, Network

async def main():
    client = PrivacyLayer(
        network=Network.TESTNET,
        api_key=os.getenv('PRIVACY_API_KEY')
    )

    # Get balance
    balance = await client.get_balance()
    print(f"Balance: {balance.total} USDC")

    # Create deposit
    deposit = await client.deposit(amount=100, asset='USDC')
    print(f"Deposit complete: {deposit.note_id}")

    # Get notes
    notes = await client.get_notes(status='UNSPENT')
    print(f"Unspent notes: {len(notes)}")

    # Withdraw
    if notes:
        withdrawal = await client.withdraw(
            note_id=notes[0].id,
            amount=50
        )
        print(f"Withdraw complete: {withdrawal.tx_hash}")

if __name__ == '__main__':
    asyncio.run(main())
```

## Running

```bash
export PRIVACY_API_KEY=your-api-key
python script.py
```
