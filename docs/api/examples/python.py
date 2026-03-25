"""
PrivacyLayer Python SDK Examples

Install: pip install privacylayer-sdk stellar-sdk pycryptodome
"""

import asyncio
import json
from typing import Optional
from dataclasses import dataclass

from stellar_sdk import (
    SorobanServer,
    Keypair,
    TransactionBuilder,
    Networks,
    xdr,
    Address,
)
from Crypto.Random import get_random_bytes

# ─────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────

CONFIG = {
    "testnet": {
        "rpc_url": "https://soroban-testnet.stellar.org:443",
        "network_passphrase": Networks.TESTNET,
        "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B",
    },
    "mainnet": {
        "rpc_url": "https://soroban-mainnet.stellar.org:443",
        "network_passphrase": Networks.PUBLIC,
        "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3B",
    },
}

ENV = "testnet"
config = CONFIG[ENV]


# ─────────────────────────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────────────────────────

@dataclass
class Note:
    """Deposit note - KEEP SECRET!"""
    nullifier: str
    secret: str
    leaf_index: int
    commitment: str
    denomination: str
    amount: int
    network: str
    created_at: int
    spent: bool = False


@dataclass
class PoolConfig:
    """Pool configuration"""
    admin: str
    token: str
    denomination_tag: str
    denomination_value: int
    paused: bool
    initialized: bool


# ─────────────────────────────────────────────────────────────────
# Client
# ─────────────────────────────────────────────────────────────────

class PrivacyPoolClient:
    """PrivacyLayer Python Client"""
    
    def __init__(self, secret_key: Optional[str] = None):
        self.server = SorobanServer(config["rpc_url"])
        self.contract_id = config["contract_id"]
        self.keypair = Keypair.from_secret(secret_key) if secret_key else None
    
    # ──────────────────────────────────────────────────────────────
    # Initialization
    # ──────────────────────────────────────────────────────────────
    
    async def initialize_pool(
        self,
        admin: str,
        token: str,
        denomination_tag: str,
        denomination_value: int,
        verifying_key: dict,
    ) -> dict:
        """Initialize the privacy pool (admin only)"""
        
        account = await self.server.load_account(self.keypair.public_key)
        
        # Build denomination SCVal
        denom_scval = xdr.ScVal(
            type=xdr.ScValType.SCV_MAP,
            map=xdr.ScMap(
                [
                    xdr.ScMapEntry(
                        key=xdr.ScVal(type=xdr.ScValType.SCV_SYMBOL, sym="tag"),
                        val=xdr.ScVal(type=xdr.ScValType.SCV_SYMBOL, sym=denomination_tag),
                    ),
                    xdr.ScMapEntry(
                        key=xdr.ScVal(type=xdr.ScValType.SCV_SYMBOL, sym="value"),
                        val=xdr.ScVal(
                            type=xdr.ScValType.SCV_INT128,
                            i128=xdr.Int128Parts(lo=denomination_value, hi=0),
                        ),
                    ),
                ]
            ),
        )
        
        tx = (
            TransactionBuilder(
                account,
                config["network_passphrase"],
                base_fee=100,
            )
            .add_operation(
                xdr.Operation(
                    body=xdr.OperationBody.INVOKE_HOST_FUNCTION,
                    invoke_host_function=xdr.InvokeHostFunctionOp(
                        host_function=xdr.HostFunction(
                            type=xdr.HostFunctionType.HOST_FUNCTION_TYPE_INVOKE_CONTRACT,
                            invoke_contract=xdr.InvokeContractArgs(
                                contract_address=Address(self.contract_id).to_xdr_sc_address(),
                                function_name="initialize",
                                args=[
                                    Address(admin).to_scval(),
                                    Address(token).to_scval(),
                                    denom_scval,
                                    self._verifying_key_to_scval(verifying_key),
                                ],
                            ),
                        ),
                    ),
                )
            )
            .set_timeout(30)
            .build()
        )
        
        tx.sign(self.keypair)
        result = await self.server.send_transaction(tx)
        return result
    
    # ──────────────────────────────────────────────────────────────
    # Deposit
    # ──────────────────────────────────────────────────────────────
    
    async def deposit(self) -> Note:
        """Deposit into the shielded pool"""
        
        # 1. Generate note
        nullifier = get_random_bytes(31)
        secret = get_random_bytes(31)
        
        # 2. Compute commitment
        commitment = await self._poseidon2_hash(nullifier, secret)
        
        # 3. Build transaction
        account = await self.server.load_account(self.keypair.public_key)
        
        tx = (
            TransactionBuilder(
                account,
                config["network_passphrase"],
                base_fee=100,
            )
            .add_operation(
                xdr.Operation(
                    body=xdr.OperationBody.INVOKE_HOST_FUNCTION,
                    invoke_host_function=xdr.InvokeHostFunctionOp(
                        host_function=xdr.HostFunction(
                            type=xdr.HostFunctionType.HOST_FUNCTION_TYPE_INVOKE_CONTRACT,
                            invoke_contract=xdr.InvokeContractArgs(
                                contract_address=Address(self.contract_id).to_xdr_sc_address(),
                                function_name="deposit",
                                args=[
                                    Address(self.keypair.public_key).to_scval(),
                                    self._bytes32_to_scval(commitment),
                                ],
                            ),
                        ),
                    ),
                )
            )
            .set_timeout(30)
            .build()
        )
        
        tx.sign(self.keypair)
        result = await self.server.send_transaction(tx)
        
        # 4. Extract leaf index
        leaf_index = self._parse_leaf_index(result)
        
        # 5. Create and store note
        note = Note(
            nullifier=nullifier.hex(),
            secret=secret.hex(),
            leaf_index=leaf_index,
            commitment=commitment.hex(),
            denomination="USDC",
            amount=100,
            network=ENV,
            created_at=int(asyncio.get_event_loop().time()),
        )
        
        self._save_note(note)
        
        print(f"Deposit successful! Leaf index: {leaf_index}")
        print("Note (KEEP SECRET):", note)
        
        return note
    
    # ──────────────────────────────────────────────────────────────
    # Withdraw
    # ──────────────────────────────────────────────────────────────
    
    async def withdraw(self, note: Note, recipient: str) -> dict:
        """Withdraw from the shielded pool"""
        
        # 1. Sync Merkle tree
        leaves = await self._fetch_all_leaves()
        tree = self._build_merkle_tree(leaves)
        
        # 2. Get Merkle proof
        merkle_proof = tree.get_proof(note.leaf_index)
        root = tree.root()
        
        # 3. Generate ZK proof
        zk_proof = await self._generate_zk_proof(
            nullifier=bytes.fromhex(note.nullifier),
            secret=bytes.fromhex(note.secret),
            merkle_proof=merkle_proof,
            root=root,
            recipient=recipient,
        )
        
        # 4. Build transaction
        account = await self.server.load_account(self.keypair.public_key)
        
        tx = (
            TransactionBuilder(
                account,
                config["network_passphrase"],
                base_fee=200,
            )
            .add_operation(
                xdr.Operation(
                    body=xdr.OperationBody.INVOKE_HOST_FUNCTION,
                    invoke_host_function=xdr.InvokeHostFunctionOp(
                        host_function=xdr.HostFunction(
                            type=xdr.HostFunctionType.HOST_FUNCTION_TYPE_INVOKE_CONTRACT,
                            invoke_contract=xdr.InvokeContractArgs(
                                contract_address=Address(self.contract_id).to_xdr_sc_address(),
                                function_name="withdraw",
                                args=[
                                    self._proof_to_scval(zk_proof.proof),
                                    self._public_inputs_to_scval({
                                        "root": root,
                                        "nullifier_hash": zk_proof.nullifier_hash,
                                        "recipient": recipient,
                                    }),
                                ],
                            ),
                        ),
                    ),
                )
            )
            .set_timeout(30)
            .build()
        )
        
        tx.sign(self.keypair)
        result = await self.server.send_transaction(tx)
        
        # 5. Mark note as spent
        note.spent = True
        self._update_note(note)
        
        print(f"Withdrawal successful! Recipient: {recipient}")
        return result
    
    # ──────────────────────────────────────────────────────────────
    # View Functions
    # ──────────────────────────────────────────────────────────────
    
    async def get_root(self) -> str:
        """Get current Merkle root"""
        result = await self.server.simulate_transaction(
            self._build_view_call("get_root", [])
        )
        return self._parse_bytes32(result)
    
    async def get_deposit_count(self) -> int:
        """Get total deposit count"""
        result = await self.server.simulate_transaction(
            self._build_view_call("deposit_count", [])
        )
        return self._parse_u32(result)
    
    async def get_config(self) -> PoolConfig:
        """Get pool configuration"""
        result = await self.server.simulate_transaction(
            self._build_view_call("get_config", [])
        )
        return self._parse_pool_config(result)
    
    async def is_known_root(self, root: str) -> bool:
        """Check if root is in history"""
        result = await self.server.simulate_transaction(
            self._build_view_call("is_known_root", [self._bytes32_to_scval(root)])
        )
        return self._parse_bool(result)
    
    async def is_spent(self, nullifier_hash: str) -> bool:
        """Check if nullifier is spent"""
        result = await self.server.simulate_transaction(
            self._build_view_call("is_spent", [self._bytes32_to_scval(nullifier_hash)])
        )
        return self._parse_bool(result)
    
    async def check_note_status(self, note: Note) -> dict:
        """Check if note can be withdrawn"""
        nullifier_hash = await self._compute_nullifier_hash(note.nullifier)
        spent = await self.is_spent(nullifier_hash)
        
        leaves = await self._fetch_all_leaves()
        in_tree = note.commitment in leaves
        
        return {
            "is_spent": spent,
            "in_tree": in_tree,
            "can_withdraw": not spent and in_tree,
        }
    
    # ──────────────────────────────────────────────────────────────
    # Helper Methods
    # ──────────────────────────────────────────────────────────────
    
    async def _poseidon2_hash(self, a: bytes, b: bytes) -> bytes:
        """Compute Poseidon2 hash"""
        # Placeholder - use actual implementation
        from privacylayer.crypto import poseidon2
        return poseidon2(a, b)
    
    async def _generate_zk_proof(self, **inputs) -> dict:
        """Generate Groth16 proof using Noir"""
        # Placeholder - use actual prover
        from privacylayer.prover import generate_proof
        return generate_proof(inputs)
    
    def _build_merkle_tree(self, leaves: list) -> object:
        """Build Merkle tree"""
        from privacylayer.merkle import MerkleTree
        return MerkleTree(20, leaves)
    
    async def _fetch_all_leaves(self) -> list:
        """Fetch all deposit commitments"""
        events = await self.server.get_events({
            "filters": [{
                "type": "contract",
                "contractIds": [self.contract_id],
                "topics": [["deposit"]],
            }],
            "startLedger": 1,
        })
        return [e["value"]["commitment"] for e in events]
    
    def _save_note(self, note: Note):
        """Save note to storage"""
        notes = json.loads(localStorage.get("privacylayer_notes", "[]"))
        notes.append(note.__dict__)
        localStorage.set("privacylayer_notes", json.dumps(notes))
    
    def _update_note(self, note: Note):
        """Update note in storage"""
        notes = json.loads(localStorage.get("privacylayer_notes", "[]"))
        for i, n in enumerate(notes):
            if n["commitment"] == note.commitment:
                notes[i] = note.__dict__
                break
        localStorage.set("privacylayer_notes", json.dumps(notes))
    
    # SCVal helpers...
    def _bytes32_to_scval(self, b: str) -> xdr.ScVal:
        return xdr.ScVal(
            type=xdr.ScValType.SCV_BYTES,
            bytes=bytes.fromhex(b.replace("0x", "")),
        )
    
    def _build_view_call(self, fn: str, args: list) -> xdr.Transaction:
        # Build simulation transaction
        pass
    
    # Parse helpers...
    def _parse_bytes32(self, result) -> str:
        pass
    
    def _parse_u32(self, result) -> int:
        pass
    
    def _parse_bool(self, result) -> bool:
        pass
    
    def _parse_pool_config(self, result) -> PoolConfig:
        pass


# ─────────────────────────────────────────────────────────────────
# Usage Example
# ─────────────────────────────────────────────────────────────────

async def main():
    # Initialize client with secret key
    client = PrivacyPoolClient(secret_key="S...")
    
    # Query pool state
    root = await client.get_root()
    count = await client.get_deposit_count()
    config = await client.get_config()
    
    print(f"Pool State:")
    print(f"  Root: {root}")
    print(f"  Deposits: {count}")
    print(f"  Token: {config.token}")
    print(f"  Paused: {config.paused}")
    
    # Deposit
    note = await client.deposit()
    
    # Check note status
    status = await client.check_note_status(note)
    print(f"Note Status: {status}")
    
    # Withdraw
    if status["can_withdraw"]:
        recipient = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
        await client.withdraw(note, recipient)


if __name__ == "__main__":
    asyncio.run(main())