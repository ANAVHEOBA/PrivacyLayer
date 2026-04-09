#!/usr/bin/env python3
"""
PrivacyLayer Python SDK Example

Usage:
    python privacy_layer.py deposit <amount> [asset]
    python privacy_layer.py withdraw <note> <recipient>
    python privacy_layer.py balance
    python privacy_layer.py sync
"""

import os
import sys
from typing import Optional

# Install with: pip install privacy-layer-sdk
try:
    from privacy_layer_sdk import PrivacyLayerClient, load_wallet
except ImportError:
    print("Installing privacy-layer-sdk...")
    os.system("pip install privacy-layer-sdk")
    from privacy_layer_sdk import PrivacyLayerClient, load_wallet


class PrivacyLayerCLI:
    def __init__(self, network: str = "testnet"):
        self.client = PrivacyLayerClient(network=network)
        self.wallet = None
    
    def connect(self):
        """Connect wallet"""
        self.wallet = load_wallet()
        return self.wallet
    
    def deposit(self, amount: str, asset: str = "XLM") -> dict:
        """Deposit to shielded pool"""
        if not self.wallet:
            self.connect()
        
        print(f"🔒 Depositing {amount} {asset} to shielded pool...")
        result = self.client.deposit(self.wallet, amount, asset)
        
        print("✅ Deposit successful!")
        print(f"   Transaction: https://stellar.expert/explorer/testnet/tx/{result['tx_hash']}")
        print(f"   Note: {result['note']} (save this secret!)")
        return result
    
    def withdraw(self, note: str, recipient: str) -> dict:
        """Withdraw privately"""
        if not self.wallet:
            self.connect()
        
        print("🔓 Generating zero-knowledge proof...")
        print(f"   Withdrawing to: {recipient}")
        
        result = self.client.withdraw(self.wallet, note, recipient)
        
        print("✅ Withdrawal successful!")
        print(f"   Transaction: https://stellar.expert/explorer/testnet/tx/{result['tx_hash']}")
        return result
    
    def balance(self) -> dict:
        """Get shielded balance"""
        if not self.wallet:
            self.connect()
        
        print("📊 Loading shielded balance...")
        balance = self.client.get_balance(self.wallet)
        
        print("┌─────────────────────┐")
        print("│   Shielded Balance  │")
        print("├─────────────────────┤")
        print(f"│ XLM:  {str(balance['xlm']).ljust(12)} │")
        print(f"│ USDC: {str(balance['usdc']).ljust(12)} │")
        print("└─────────────────────┘")
        return balance
    
    def sync(self) -> dict:
        """Synchronize Merkle tree"""
        print("🔄 Synchronizing Merkle tree...")
        progress = self.client.sync_merkle_tree()
        
        print(f"✅ Synced {progress['leaves']} leaves")
        print(f"   Root: {progress['root']}")
        return progress


def main():
    if len(sys.argv) < 2:
        show_help()
        return
    
    command = sys.argv[1]
    cli = PrivacyLayerCLI(network=os.getenv("PRIVACYLAYER_NETWORK", "testnet"))
    
    try:
        if command == "deposit":
            if len(sys.argv) < 3:
                print("Usage: python privacy_layer.py deposit <amount> [asset]")
                return
            amount = sys.argv[2]
            asset = sys.argv[3] if len(sys.argv) > 3 else "XLM"
            cli.deposit(amount, asset)
        
        elif command == "withdraw":
            if len(sys.argv) < 4:
                print("Usage: python privacy_layer.py withdraw <note> <recipient>")
                return
            note = sys.argv[2]
            recipient = sys.argv[3]
            cli.withdraw(note, recipient)
        
        elif command == "balance":
            cli.balance()
        
        elif command == "sync":
            cli.sync()
        
        else:
            show_help()
    
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


def show_help():
    print("""
🔐 PrivacyLayer Python SDK

Usage:
    python privacy_layer.py <command> [arguments]

Commands:
    deposit <amount> [asset]     Deposit to shielded pool (asset: XLM or USDC)
    withdraw <note> <recipient>  Withdraw privately using note secret
    balance                      Show your shielded balance
    sync                         Synchronize Merkle tree
    help                         Show this help message

Environment Variables:
    PRIVACYLAYER_NETWORK         Network (testnet or mainnet, default: testnet)

Examples:
    python privacy_layer.py deposit 10 XLM
    python privacy_layer.py withdraw <note-secret> GABC...DEF
    python privacy_layer.py balance

Installation:
    pip install privacy-layer-sdk
""")


if __name__ == "__main__":
    main()
