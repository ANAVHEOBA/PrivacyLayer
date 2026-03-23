"""
PrivacyLayer Python Client

A minimal Python SDK for interacting with PrivacyLayer's privacy pool.
Demonstrates deposit, proof generation, and withdrawal flows.

Usage:
    python privacy_client.py deposit 1.5
    python privacy_client.py withdraw notes/note_abc123.json <recipient>
    python privacy_client.py balance
"""

import hashlib
import json
import os
import secrets
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class PrivateNote:
    """A private note representing a deposit in the privacy pool."""

    amount_lamports: int
    commitment: str
    nullifier: str
    secret: str  # hex-encoded
    deposit_tx: str
    created_at: str


NOTES_DIR = Path("notes")


def _ensure_notes_dir() -> None:
    NOTES_DIR.mkdir(exist_ok=True)


def _create_commitment(amount: int) -> tuple[str, str, bytes]:
    """Generate a cryptographic commitment for a deposit."""
    secret = secrets.token_bytes(32)
    nullifier_bytes = secrets.token_bytes(32)

    # In production: use Pedersen hash matching the Noir circuit
    commitment = "0x" + hashlib.sha256(secret + amount.to_bytes(8, "big")).hexdigest()[:16]
    nullifier = "0x" + hashlib.sha256(nullifier_bytes).hexdigest()[:16]

    return commitment, nullifier, secret


def deposit(amount_sol: float) -> PrivateNote:
    """Deposit SOL into the privacy pool."""
    lamports = int(amount_sol * 1_000_000_000)
    commitment, nullifier, secret = _create_commitment(lamports)

    # In production: submit deposit transaction to Solana
    tx = f"sim_deposit_{int(datetime.now(timezone.utc).timestamp())}"

    note = PrivateNote(
        amount_lamports=lamports,
        commitment=commitment,
        nullifier=nullifier,
        secret=secret.hex(),
        deposit_tx=tx,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    # Save note
    _ensure_notes_dir()
    filename = f"note_{commitment[2:10]}.json"
    filepath = NOTES_DIR / filename
    filepath.write_text(json.dumps(asdict(note), indent=2))

    print(f"\n  ✅ Deposited {amount_sol} SOL")
    print(f"  📝 Tx: {tx}")
    print(f"  🗂️  Note saved: {filepath}")
    print(f"\n  ⚠️  Keep the note file secret!")

    return note


def withdraw(note_path: str, recipient: str) -> str:
    """Withdraw using a ZK proof generated from a private note."""
    path = Path(note_path)
    if not path.exists():
        print(f"  ❌ Note file not found: {note_path}")
        sys.exit(1)

    note = PrivateNote(**json.loads(path.read_text()))
    amount_sol = note.amount_lamports / 1_000_000_000

    print(f"\n  🔓 Withdrawing {amount_sol} SOL to {recipient}...")
    print(f"  Generating ZK proof...")

    # In production:
    # 1. Fetch current Merkle root from chain
    # 2. Compute Merkle path for this commitment
    # 3. Generate Noir proof with private inputs
    # 4. Submit withdrawal transaction with proof bytes

    tx = f"sim_withdraw_{int(datetime.now(timezone.utc).timestamp())}"

    print(f"  ✅ Withdrawal confirmed")
    print(f"  📝 Tx: {tx}")
    print(f"  💰 {amount_sol} SOL → {recipient}")

    # Consume note
    path.unlink()
    print(f"  🗑️  Note consumed")

    return tx


def list_notes() -> list[PrivateNote]:
    """List all saved notes."""
    _ensure_notes_dir()
    notes = []
    for f in sorted(NOTES_DIR.glob("*.json")):
        note = PrivateNote(**json.loads(f.read_text()))
        notes.append(note)

    if not notes:
        print("\n  No notes found. Deposit first.\n")
        return notes

    print(f"\n  📋 Your notes ({len(notes)}):\n")
    for note in notes:
        sol = note.amount_lamports / 1_000_000_000
        print(f"  {note.commitment}  {sol:.4f} SOL  ({note.created_at})")
    print()
    return notes


def balance() -> float:
    """Calculate total shielded balance."""
    _ensure_notes_dir()
    total = 0
    count = 0
    for f in NOTES_DIR.glob("*.json"):
        note = json.loads(f.read_text())
        total += note["amount_lamports"]
        count += 1

    sol = total / 1_000_000_000
    print(f"\n  💰 Shielded balance: {sol:.4f} SOL ({count} notes)\n")
    return sol


# ---- CLI ----

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
PrivacyLayer Python Client

Usage:
    python privacy_client.py deposit <amount_sol>
    python privacy_client.py withdraw <note_path> <recipient_wallet>
    python privacy_client.py notes
    python privacy_client.py balance
""")
        sys.exit(0)

    cmd = sys.argv[1]

    if cmd == "deposit":
        if len(sys.argv) < 3:
            print("Usage: python privacy_client.py deposit <amount_sol>")
            sys.exit(1)
        deposit(float(sys.argv[2]))

    elif cmd == "withdraw":
        if len(sys.argv) < 4:
            print("Usage: python privacy_client.py withdraw <note_path> <recipient>")
            sys.exit(1)
        withdraw(sys.argv[2], sys.argv[3])

    elif cmd == "notes":
        list_notes()

    elif cmd == "balance":
        balance()

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
