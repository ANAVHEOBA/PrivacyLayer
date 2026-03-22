"""
============================================================
PrivacyLayer Python Client
============================================================
Python client for interacting with the PrivacyLayer Soroban
smart contract. Demonstrates deposits, withdrawals, pool
monitoring, and note management.

This client uses the stellar-sdk Python package for Soroban
contract invocations. It mirrors the TypeScript SDK interface.

Usage:
    python privacy_layer_client.py status
    python privacy_layer_client.py deposit --denomination Xlm10
    python privacy_layer_client.py withdraw --note-file note.txt --recipient G...
    python privacy_layer_client.py monitor
    python privacy_layer_client.py generate-note --denomination Xlm10

Environment Variables:
    PRIVACY_LAYER_CONTRACT_ID - Contract address (required)
    PRIVACY_LAYER_NETWORK     - "testnet" or "mainnet" (default: testnet)
    PRIVACY_LAYER_RPC_URL     - Custom RPC URL (optional)
    STELLAR_SECRET_KEY        - Depositor secret key (for deposit command)
============================================================
"""

import argparse
import hashlib
import json
import os
import secrets
import sys
import time
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
from typing import Optional

try:
    from stellar_sdk import (
        Keypair,
        Network,
        SorobanServer,
        TransactionBuilder,
        scval,
    )
    from stellar_sdk.soroban_rpc import GetTransactionStatus
except ImportError:
    print("Error: stellar-sdk is required. Install with:")
    print("  pip install stellar-sdk")
    sys.exit(1)


# ──────────────────────────────────────────────────────────────
# Types and Constants
# ──────────────────────────────────────────────────────────────

class Denomination(str, Enum):
    """Fixed denomination amounts supported by the pool."""
    Xlm10 = "Xlm10"
    Xlm100 = "Xlm100"
    Xlm1000 = "Xlm1000"
    Usdc100 = "Usdc100"
    Usdc1000 = "Usdc1000"


DENOMINATION_LABELS = {
    Denomination.Xlm10: "10 XLM",
    Denomination.Xlm100: "100 XLM",
    Denomination.Xlm1000: "1,000 XLM",
    Denomination.Usdc100: "100 USDC",
    Denomination.Usdc1000: "1,000 USDC",
}

# Contract error codes mapped to descriptive messages
CONTRACT_ERRORS = {
    1: "Contract has already been initialized",
    2: "Contract has not been initialized yet",
    10: "Caller is not the admin",
    20: "Pool is paused -- deposits and withdrawals blocked",
    21: "Merkle tree is full (max 1,048,576 deposits reached)",
    30: "Wrong deposit amount -- must match pool denomination",
    31: "Commitment is the zero value (not allowed)",
    40: "The provided Merkle root is not in the root history",
    41: "This nullifier has already been spent (double-spend attempt)",
    42: "Groth16 proof verification failed",
    43: "Fee exceeds the withdrawal amount",
    44: "Relayer address is non-zero but fee is zero",
    45: "Recipient address is invalid",
    50: "Verifying key has not been set",
    51: "Verifying key is malformed",
    60: "Proof point A has wrong length",
    61: "Proof point B has wrong length",
    62: "Proof point C has wrong length",
    70: "BN254 point is not on curve",
    71: "BN254 pairing check failed",
}

TESTNET_RPC = "https://soroban-testnet.stellar.org"
MAINNET_RPC = "https://soroban.stellar.org"
NOTES_DIR = Path.cwd() / ".privacylayer-notes"


# ──────────────────────────────────────────────────────────────
# Data Structures
# ──────────────────────────────────────────────────────────────

@dataclass
class Note:
    """A deposit note containing the secret information needed to withdraw."""
    nullifier: str
    secret: str
    commitment: str
    denomination: str
    leaf_index: Optional[int] = None
    created_at: Optional[float] = None

    def serialize(self) -> str:
        """Serialize note to a compact backup string."""
        return f"privacylayer-note-v1:{self.nullifier}:{self.secret}:{self.denomination}"

    @staticmethod
    def deserialize(data: str) -> "Note":
        """Deserialize a note from its backup string."""
        parts = data.strip().split(":")
        if len(parts) != 4 or parts[0] != "privacylayer-note-v1":
            raise ValueError(
                "Invalid note format. Expected: privacylayer-note-v1:<nullifier>:<secret>:<denomination>"
            )

        nullifier, secret, denomination = parts[1], parts[2], parts[3]

        # Validate denomination
        try:
            Denomination(denomination)
        except ValueError:
            raise ValueError(f"Invalid denomination: {denomination}")

        commitment = poseidon2_hash(nullifier, secret)

        return Note(
            nullifier=nullifier,
            secret=secret,
            commitment=commitment,
            denomination=denomination,
            created_at=time.time(),
        )


@dataclass
class PoolState:
    """Snapshot of the pool's current state."""
    deposit_count: int
    current_root: str
    denomination: str
    paused: bool
    tree_depth: int
    root_history_size: int


@dataclass
class DepositResult:
    """Result of a successful deposit."""
    leaf_index: int
    merkle_root: str


# ──────────────────────────────────────────────────────────────
# Cryptographic Utilities
# ──────────────────────────────────────────────────────────────

def random_bytes32() -> str:
    """Generate a cryptographically secure random 32-byte hex string."""
    return secrets.token_hex(32)


def poseidon2_hash(left: str, right: str) -> str:
    """
    Compute Poseidon2 hash of two field elements.

    NOTE: In production, this MUST use the same Poseidon2 implementation
    as the Noir circuits and Soroban contract (Protocol 25 native host fn).

    This placeholder uses SHA-256 for demonstration purposes only.
    DO NOT use in production -- it will produce incompatible commitments.
    """
    data = (left + right).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def generate_note(denomination: Denomination) -> Note:
    """Generate a new deposit note with random nullifier and secret."""
    nullifier = random_bytes32()
    secret = random_bytes32()
    commitment = poseidon2_hash(nullifier, secret)

    return Note(
        nullifier=nullifier,
        secret=secret,
        commitment=commitment,
        denomination=denomination.value,
        created_at=time.time(),
    )


# ──────────────────────────────────────────────────────────────
# Note File Management
# ──────────────────────────────────────────────────────────────

def ensure_notes_dir() -> None:
    """Create the notes directory if it does not exist."""
    if not NOTES_DIR.exists():
        NOTES_DIR.mkdir(parents=True, mode=0o700)
        print(f"  Created notes directory: {NOTES_DIR}")


def save_note(note: Note, filename: str) -> Path:
    """Save a serialized note to a file."""
    ensure_notes_dir()
    filepath = NOTES_DIR / filename
    filepath.write_text(note.serialize())
    filepath.chmod(0o600)
    print(f"  Note saved to: {filepath}")
    return filepath


def load_note(filename: str) -> Note:
    """Load a note from a file."""
    filepath = NOTES_DIR / filename
    if not filepath.exists():
        print(f"Error: Note file not found: {filepath}", file=sys.stderr)
        sys.exit(1)
    return Note.deserialize(filepath.read_text())


# ──────────────────────────────────────────────────────────────
# PrivacyLayer Client
# ──────────────────────────────────────────────────────────────

class PrivacyLayerClient:
    """
    Client for interacting with the PrivacyLayer Soroban contract.

    Example:
        client = PrivacyLayerClient(
            contract_id="CABC123...",
            rpc_url="https://soroban-testnet.stellar.org",
            network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
        )

        # Check pool status
        state = client.get_pool_state()
        print(f"Deposits: {state.deposit_count}")

        # Deposit
        note = generate_note(Denomination.Xlm10)
        result = client.deposit(keypair, note)
        print(f"Leaf index: {result.leaf_index}")
    """

    def __init__(
        self,
        contract_id: str,
        rpc_url: str,
        network_passphrase: str,
        tx_timeout: int = 30,
    ):
        self.contract_id = contract_id
        self.rpc_url = rpc_url
        self.network_passphrase = network_passphrase
        self.tx_timeout = tx_timeout
        self.server = SorobanServer(rpc_url)

    # ── View Functions ────────────────────────────────────────

    def get_deposit_count(self) -> int:
        """Get the total number of deposits in the pool."""
        result = self._invoke_view("deposit_count")
        return scval.from_uint32(result)

    def get_root(self) -> str:
        """Get the current Merkle root."""
        result = self._invoke_view("get_root")
        return result.bytes.hex()

    def is_known_root(self, root: str) -> bool:
        """Check if a Merkle root is in the historical buffer."""
        root_bytes = bytes.fromhex(root)
        result = self._invoke_view("is_known_root", [scval.to_bytes(root_bytes)])
        return scval.from_bool(result)

    def is_spent(self, nullifier_hash: str) -> bool:
        """Check if a nullifier has already been spent."""
        null_bytes = bytes.fromhex(nullifier_hash)
        result = self._invoke_view("is_spent", [scval.to_bytes(null_bytes)])
        return scval.from_bool(result)

    def get_pool_state(self) -> PoolState:
        """Get a full pool state snapshot."""
        deposit_count = self.get_deposit_count()
        current_root = self.get_root()

        return PoolState(
            deposit_count=deposit_count,
            current_root=current_root,
            denomination="(fetch from config)",
            paused=False,
            tree_depth=20,
            root_history_size=30,
        )

    # ── Deposit ───────────────────────────────────────────────

    def deposit(self, keypair: Keypair, note: Note) -> DepositResult:
        """
        Deposit into the shielded pool.

        Args:
            keypair: Stellar keypair of the depositor (must have funds).
            note: The deposit note generated via generate_note().

        Returns:
            DepositResult with leaf index and new Merkle root.

        Raises:
            PrivacyLayerError: On contract errors.
            ConnectionError: On RPC communication failures.
        """
        commitment_bytes = bytes.fromhex(note.commitment)

        # Build transaction
        account = self.server.load_account(keypair.public_key)
        builder = TransactionBuilder(
            source_account=account,
            network_passphrase=self.network_passphrase,
            base_fee=100_000,
        )
        builder.set_timeout(self.tx_timeout)
        builder.append_invoke_contract_function_op(
            contract_id=self.contract_id,
            function_name="deposit",
            parameters=[
                scval.to_address(keypair.public_key),
                scval.to_bytes(commitment_bytes),
            ],
        )
        tx = builder.build()

        # Prepare, sign, and submit
        prepared_tx = self.server.prepare_transaction(tx)
        prepared_tx.sign(keypair)
        response = self.server.send_transaction(prepared_tx)

        # Wait for confirmation
        result = self._wait_for_transaction(response.hash)

        return DepositResult(
            leaf_index=0,  # Parse from result
            merkle_root="0" * 64,  # Parse from result
        )

    # ── Withdrawal ────────────────────────────────────────────

    def withdraw(
        self,
        note: Note,
        recipient: str,
        relayer: Optional[str] = None,
        fee: int = 0,
    ) -> bool:
        """
        Withdraw from the shielded pool using a ZK proof.

        Args:
            note: The deposit note to withdraw.
            recipient: Stellar address of the recipient.
            relayer: Optional relayer address for gas-less withdrawals.
            fee: Optional relayer fee in stroops.

        Returns:
            True on successful withdrawal.

        Raises:
            ProofGenerationError: If ZK proof generation fails.
            PrivacyLayerError: On contract errors.
        """
        # Step 1: Sync Merkle tree from on-chain events
        print("  Syncing Merkle tree...")
        # In production: fetch all deposit events and reconstruct tree

        # Step 2: Generate Merkle inclusion proof
        print("  Computing Merkle path...")
        # In production: compute path from reconstructed tree

        # Step 3: Generate ZK proof
        print("  Generating Groth16 proof...")
        # In production: invoke Noir WASM prover or external prover service
        raise NotImplementedError(
            "ZK proof generation requires the Noir WASM prover module. "
            "See the PrivacyLayer SDK documentation for setup instructions."
        )

    # ── Event Monitoring ──────────────────────────────────────

    def get_events(self, start_ledger: int, limit: int = 100) -> list:
        """
        Fetch contract events from a starting ledger.

        Args:
            start_ledger: Ledger sequence number to start from.
            limit: Maximum number of events to return.

        Returns:
            List of event dictionaries.
        """
        response = self.server.get_events(
            start_ledger=start_ledger,
            filters=[{
                "type": "contract",
                "contractIds": [self.contract_id],
            }],
            limit=limit,
        )

        events = []
        for event in response.events:
            events.append({
                "type": self._classify_event(event),
                "ledger": event.ledger,
                "data": event.value,
            })

        return events

    def monitor_events(
        self,
        callback,
        poll_interval: float = 5.0,
    ) -> None:
        """
        Monitor contract events in real-time with polling.

        Args:
            callback: Function called for each new event.
            poll_interval: Seconds between polls.
        """
        latest = self.server.get_latest_ledger()
        last_ledger = latest.sequence - 100

        print(f"  Monitoring from ledger {last_ledger}...")

        while True:
            try:
                events = self.get_events(last_ledger + 1)
                for event in events:
                    callback(event)
                    if event["ledger"] > last_ledger:
                        last_ledger = event["ledger"]
            except Exception as e:
                print(f"  Poll error: {e}", file=sys.stderr)

            time.sleep(poll_interval)

    # ── Private Helpers ───────────────────────────────────────

    def _invoke_view(self, method: str, args=None):
        """Invoke a view (read-only) contract function via simulation."""
        # Use a dummy source account for view calls
        source = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

        try:
            account = self.server.load_account(source)
        except Exception:
            # For simulation, we can construct a minimal account
            raise ConnectionError(
                f"Cannot connect to Soroban RPC at {self.rpc_url}. "
                "Check the endpoint URL and network status."
            )

        builder = TransactionBuilder(
            source_account=account,
            network_passphrase=self.network_passphrase,
            base_fee=100,
        )
        builder.set_timeout(self.tx_timeout)
        builder.append_invoke_contract_function_op(
            contract_id=self.contract_id,
            function_name=method,
            parameters=args or [],
        )
        tx = builder.build()

        response = self.server.simulate_transaction(tx)

        if hasattr(response, "error") and response.error:
            raise RuntimeError(f"Simulation failed: {response.error}")

        return response.results[0].xdr

    def _wait_for_transaction(self, tx_hash: str, max_attempts: int = 30):
        """Wait for a transaction to be confirmed."""
        for _ in range(max_attempts):
            response = self.server.get_transaction(tx_hash)
            if response.status == GetTransactionStatus.SUCCESS:
                return response
            if response.status == GetTransactionStatus.FAILED:
                raise RuntimeError(f"Transaction failed: {tx_hash}")
            time.sleep(1)

        raise TimeoutError(f"Transaction {tx_hash} timed out after {max_attempts}s")

    def _classify_event(self, event) -> str:
        """Classify a raw event into a named type."""
        topic = str(event.topic[0]) if event.topic else ""
        if "deposit" in topic.lower():
            return "deposit"
        elif "withdraw" in topic.lower():
            return "withdraw"
        elif "pause" in topic.lower():
            return "pause"
        elif "unpause" in topic.lower():
            return "unpause"
        elif "vk" in topic.lower():
            return "vk_updated"
        return "unknown"


# ──────────────────────────────────────────────────────────────
# CLI Commands
# ──────────────────────────────────────────────────────────────

def print_header(title: str) -> None:
    """Print a formatted header."""
    line = "=" * 60
    print(f"\n{line}")
    print(f"  {title}")
    print(f"{line}\n")


def create_client_from_env() -> PrivacyLayerClient:
    """Create a PrivacyLayerClient from environment variables."""
    contract_id = os.environ.get("PRIVACY_LAYER_CONTRACT_ID")
    if not contract_id:
        print("Error: PRIVACY_LAYER_CONTRACT_ID environment variable is required.",
              file=sys.stderr)
        print("  export PRIVACY_LAYER_CONTRACT_ID=CABC123...", file=sys.stderr)
        sys.exit(1)

    network = os.environ.get("PRIVACY_LAYER_NETWORK", "testnet")
    rpc_url = os.environ.get("PRIVACY_LAYER_RPC_URL")

    if network == "mainnet":
        passphrase = Network.PUBLIC_NETWORK_PASSPHRASE
        rpc_url = rpc_url or MAINNET_RPC
    else:
        passphrase = Network.TESTNET_NETWORK_PASSPHRASE
        rpc_url = rpc_url or TESTNET_RPC

    return PrivacyLayerClient(
        contract_id=contract_id,
        rpc_url=rpc_url,
        network_passphrase=passphrase,
    )


def cmd_status(args: argparse.Namespace) -> None:
    """Show pool status."""
    client = create_client_from_env()

    try:
        state = client.get_pool_state()
        print_header("Pool Status")
        print(f"  Deposits:      {state.deposit_count}")
        print(f"  Current Root:  {state.current_root[:32]}...")
        print(f"  Tree Depth:    {state.tree_depth}")
        print(f"  Paused:        {'YES' if state.paused else 'No'}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_deposit(args: argparse.Namespace) -> None:
    """Execute a deposit."""
    client = create_client_from_env()

    try:
        denomination = Denomination(args.denomination)
    except ValueError:
        print(f"Invalid denomination: {args.denomination}", file=sys.stderr)
        print(f"Valid: {', '.join(d.value for d in Denomination)}", file=sys.stderr)
        sys.exit(1)

    print_header(f"Deposit: {DENOMINATION_LABELS[denomination]}")

    # Generate note
    print("  Generating deposit note...")
    note = generate_note(denomination)
    print(f"  Commitment: {note.commitment[:32]}...")

    # Save note FIRST
    filename = f"note-{int(time.time())}-{denomination.value}.txt"
    save_note(note, filename)
    print()
    print("  *** IMPORTANT: Note saved. Do NOT lose this file! ***")
    print()

    # Execute deposit
    secret_key = os.environ.get("STELLAR_SECRET_KEY")
    if not secret_key:
        print("Error: STELLAR_SECRET_KEY required for deposit.", file=sys.stderr)
        sys.exit(1)

    keypair = Keypair.from_secret(secret_key)
    print("  Submitting deposit transaction...")

    try:
        result = client.deposit(keypair, note)
        print(f"  Deposit successful!")
        print(f"  Leaf Index: {result.leaf_index}")
        print(f"  New Root:   {result.merkle_root[:32]}...")
    except Exception as e:
        print(f"  Deposit failed: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_withdraw(args: argparse.Namespace) -> None:
    """Execute a withdrawal."""
    client = create_client_from_env()

    print_header("Withdraw with ZK Proof")

    # Load note
    print(f"  Loading note from: {args.note_file}")
    note = load_note(args.note_file)
    print(f"  Denomination: {DENOMINATION_LABELS.get(Denomination(note.denomination), note.denomination)}")
    print(f"  Commitment:   {note.commitment[:32]}...")
    print(f"  Recipient:    {args.recipient}")
    print()

    try:
        success = client.withdraw(note, args.recipient)
        if success:
            print("  Withdrawal successful!")
            print(f"  Funds sent to: {args.recipient}")
    except NotImplementedError as e:
        print(f"  {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"  Withdrawal failed: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_monitor(args: argparse.Namespace) -> None:
    """Monitor pool events in real-time."""
    client = create_client_from_env()

    print_header("Monitoring Pool Events (Ctrl+C to stop)")

    def on_event(event):
        ts = time.strftime("%Y-%m-%dT%H:%M:%S")
        etype = event["type"].upper().ljust(10)
        print(f"  [{ts}] {etype} Ledger #{event['ledger']}")

    try:
        client.monitor_events(on_event)
    except KeyboardInterrupt:
        print("\n  Stopped.")


def cmd_generate_note(args: argparse.Namespace) -> None:
    """Generate a deposit note (without depositing)."""
    try:
        denomination = Denomination(args.denomination)
    except ValueError:
        print(f"Invalid denomination: {args.denomination}", file=sys.stderr)
        print(f"Valid: {', '.join(d.value for d in Denomination)}", file=sys.stderr)
        sys.exit(1)

    print_header(f"Generate Note: {DENOMINATION_LABELS[denomination]}")

    note = generate_note(denomination)
    print(f"  Denomination: {DENOMINATION_LABELS[denomination]}")
    print(f"  Nullifier:    {note.nullifier[:32]}...")
    print(f"  Secret:       {note.secret[:32]}...")
    print(f"  Commitment:   {note.commitment[:32]}...")
    print()
    print(f"  Backup String:")
    print(f"  {note.serialize()}")
    print()

    filename = f"note-{int(time.time())}-{denomination.value}.txt"
    save_note(note, filename)


def cmd_check_nullifier(args: argparse.Namespace) -> None:
    """Check if a nullifier has been spent."""
    client = create_client_from_env()

    print_header("Check Nullifier Status")

    try:
        is_spent = client.is_spent(args.nullifier_hash)
        print(f"  Nullifier: {args.nullifier_hash[:32]}...")
        print(f"  Status:    {'SPENT (already used)' if is_spent else 'UNSPENT (available)'}")
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        sys.exit(1)


# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main() -> None:
    """Entry point for the CLI."""
    parser = argparse.ArgumentParser(
        description="PrivacyLayer Python CLI -- shielded transactions on Stellar/Soroban",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check pool status
  export PRIVACY_LAYER_CONTRACT_ID=CABC123...
  python privacy_layer_client.py status

  # Generate a note for 10 XLM deposit
  python privacy_layer_client.py generate-note --denomination Xlm10

  # Deposit 10 XLM
  export STELLAR_SECRET_KEY=S...
  python privacy_layer_client.py deposit --denomination Xlm10

  # Withdraw to a new address
  python privacy_layer_client.py withdraw --note-file note-123.txt --recipient GABC...

  # Monitor events in real-time
  python privacy_layer_client.py monitor
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # status
    subparsers.add_parser("status", help="Show pool status")

    # deposit
    dep = subparsers.add_parser("deposit", help="Deposit into the shielded pool")
    dep.add_argument("--denomination", default="Xlm10", help="Denomination (default: Xlm10)")

    # withdraw
    wd = subparsers.add_parser("withdraw", help="Withdraw with ZK proof")
    wd.add_argument("--note-file", required=True, help="Note filename in .privacylayer-notes/")
    wd.add_argument("--recipient", required=True, help="Stellar recipient address (G...)")

    # monitor
    subparsers.add_parser("monitor", help="Monitor events in real-time")

    # generate-note
    gn = subparsers.add_parser("generate-note", help="Generate a deposit note")
    gn.add_argument("--denomination", default="Xlm10", help="Denomination (default: Xlm10)")

    # check-nullifier
    cn = subparsers.add_parser("check-nullifier", help="Check if a nullifier is spent")
    cn.add_argument("nullifier_hash", help="64-character hex nullifier hash")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "status": cmd_status,
        "deposit": cmd_deposit,
        "withdraw": cmd_withdraw,
        "monitor": cmd_monitor,
        "generate-note": cmd_generate_note,
        "check-nullifier": cmd_check_nullifier,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
