# Python Integration

A Python SDK wrapper for PrivacyLayer privacy pool operations.

## Setup

```bash
pip install -r requirements.txt
```

## Usage

```bash
# Deposit SOL into the privacy pool
python privacy_client.py deposit 1.5

# List notes
python privacy_client.py notes

# Check shielded balance
python privacy_client.py balance

# Withdraw
python privacy_client.py withdraw notes/note_abc123.json <recipient_wallet>
```

## As a Library

```python
from privacy_client import deposit, withdraw, balance, list_notes

# Deposit
note = deposit(1.5)

# Check balance
total = balance()

# Withdraw to new address
tx = withdraw("notes/note_abc123.json", "7xKX...AsU")
```
