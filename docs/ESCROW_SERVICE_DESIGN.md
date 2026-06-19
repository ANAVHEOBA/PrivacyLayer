# PrivacyLayer Private Escrow Service

**Version:** 1.0  
**Status:** Design Document

---

## Overview

The Private Escrow Service enables two parties to transact securely without revealing their identities or the transaction details on-chain. The service uses ZK proofs to ensure fair exchange while maintaining privacy.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Escrow Contract                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Deposit    │  │  Release    │  │  Dispute    │             │
│  │  Handler    │  │  Handler    │  │  Handler    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Timelock Module                       │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Privacy Pool Integration              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Escrow Contract

```rust
// contracts/escrow/src/lib.rs

pub struct EscrowContract {
    // Escrow state
    escrows: Map<EscrowId, Escrow>,
    disputes: Map<EscrowId, Dispute>,
    
    // Privacy pool integration
    pool_contract: Address,
    
    // Configuration
    arbitrator: Address,
    timelock_duration: u64,
    dispute_fee: u128,
}

pub struct Escrow {
    id: EscrowId,
    amount: u128,
    asset: Asset,
    buyer_commitment: Commitment,
    seller_commitment: Commitment,
    arbiter: Option<Address>,
    created_at: u64,
    expires_at: u64,
    status: EscrowStatus,
}

pub enum EscrowStatus {
    Pending,
    Funded,
    Released,
    Disputed,
    Cancelled,
    Expired,
}
```

### 2. Deposit Flow

```
Buyer                          Escrow Contract               Seller
  │                                  │                          │
  │── 1. Create Escrow ─────────────►│                          │
  │    (amount, asset, expiry)       │                          │
  │                                  │                          │
  │── 2. Fund from Privacy Pool ────►│                          │
  │    (ZK proof of deposit)         │                          │
  │                                  │── 3. Notify ────────────►│
  │                                  │    (escrow_id, amount)   │
  │                                  │    [private]             │
```

### 3. Release Flow

```
Buyer                          Escrow Contract               Seller
  │                                  │                          │
  │── 1. Confirm Receipt ───────────►│                          │
  │    (escrow_id)                   │                          │
  │                                  │── 2. Release ───────────►│
  │                                  │    (ZK proof)            │
  │                                  │                          │
  │                                  │    Funds → Privacy Pool  │
  │                                  │    → Seller withdrawal   │
```

---

## Features

### Anonymous Messaging

```rust
pub struct EncryptedMessage {
    escrow_id: EscrowId,
    ciphertext: Vec<u8>,
    nonce: [u8; 24],
    timestamp: u64,
}

// Only escrow participants can decrypt
impl EscrowContract {
    pub fn send_message(&mut self, message: EncryptedMessage) {
        // Verify sender is participant
        // Store encrypted message
        // Emit event (no content revealed)
    }
}
```

### Timelock Release

```rust
impl EscrowContract {
    pub fn auto_release(&mut self, escrow_id: EscrowId) {
        let escrow = self.escrows.get(escrow_id);
        
        // Check if timelock expired
        if escrow.expires_at < env().block_timestamp() {
            // Auto-release to seller
            self.release_to_seller(escrow_id);
        }
    }
}
```

### Dispute Resolution

```rust
pub struct Dispute {
    escrow_id: EscrowId,
    initiator: Address,
    reason: EncryptedReason,
    evidence: Vec<EncryptedFile>,
    resolution: Option<Resolution>,
}

pub struct Resolution {
    winner: Party,
    split: Option<(u8, u8)>, // (buyer%, seller%)
    decided_at: u64,
    decided_by: Address,
}

impl EscrowContract {
    pub fn initiate_dispute(
        &mut self,
        escrow_id: EscrowId,
        reason: EncryptedReason,
    ) {
        // Require dispute fee
        // Lock escrow
        // Notify arbitrator
    }
    
    pub fn resolve_dispute(
        &mut self,
        escrow_id: EscrowId,
        resolution: Resolution,
    ) {
        // Verify arbitrator
        // Execute resolution
        // Distribute funds
    }
}
```

---

## Privacy Guarantees

### What's Private

| Data | Visibility |
|------|------------|
| Buyer identity | Hidden (privacy pool) |
| Seller identity | Hidden (privacy pool) |
| Transaction amount | Hidden (commitment) |
| Asset type | Hidden (optional) |
| Messages | Encrypted |

### What's Public

| Data | Visibility |
|------|------------|
| Escrow exists | Yes |
| Status changes | Yes |
| Timestamps | Yes |
| Dispute exists | Yes (not details) |

---

## UI Design

### Create Escrow Screen

```
┌─────────────────────────────────────────┐
│         Create Private Escrow           │
├─────────────────────────────────────────┤
│                                         │
│  Amount: [________] USDC                │
│                                         │
│  Seller Address: [__________]           │
│  (or use privacy note)                  │
│                                         │
│  Expiry: [7 days ▼]                     │
│                                         │
│  Arbitrator: [Default ▼]                │
│                                         │
│  ☐ Enable anonymous messaging           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Create Escrow            │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Escrow Dashboard

```
┌─────────────────────────────────────────┐
│         My Escrows                      │
├─────────────────────────────────────────┤
│                                         │
│  Active Escrows (3)                     │
│  ┌───────────────────────────────────┐  │
│  │ #1234  100 USDC  Pending          │  │
│  │ Created: 2 days ago               │  │
│  │ [Fund] [Cancel] [Message]         │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Completed Escrows (12)                 │
│  [View History]                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## Smart Contract Interface

```rust
// Soroban contract interface
pub trait EscrowTrait {
    // Create new escrow
    fn create(
        &mut self,
        amount: u128,
        asset: Asset,
        seller_note: NoteCommitment,
        expiry_blocks: u64,
    ) -> EscrowId;
    
    // Fund escrow from privacy pool
    fn fund(
        &mut self,
        escrow_id: EscrowId,
        deposit_proof: ZKProof,
    );
    
    // Release to seller
    fn release(
        &mut self,
        escrow_id: EscrowId,
        seller_withdrawal_address: Address,
    );
    
    // Cancel and refund
    fn cancel(
        &mut self,
        escrow_id: EscrowId,
    );
    
    // Dispute
    fn dispute(
        &mut self,
        escrow_id: EscrowId,
        reason: EncryptedData,
    );
    
    // Resolve dispute (arbitrator only)
    fn resolve(
        &mut self,
        escrow_id: EscrowId,
        resolution: Resolution,
    );
}
```

---

## Security Considerations

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Buyer doesn't fund | Seller doesn't ship until funded |
| Seller doesn't deliver | Timelock refund to buyer |
| Arbitrator collusion | Reputation system, multi-arb |
| Front-running | Commit-reveal scheme |
| Privacy leak | All data encrypted |

### Audit Checklist

- [ ] No private key exposure
- [ ] Proper access control
- [ ] Integer overflow checks
- [ ] Timelock edge cases
- [ ] Dispute resolution fairness
- [ ] ZK proof verification

---

## Fee Structure

| Action | Fee |
|--------|-----|
| Create Escrow | 0.1% |
| Release | 0% |
| Cancel | 0.5% |
| Dispute | 1% + arbitrator fee |

---

## Roadmap

### Phase 1: Core Contract
- Basic escrow creation
- Fund from privacy pool
- Release mechanism

### Phase 2: Advanced Features
- Timelock release
- Dispute resolution
- Anonymous messaging

### Phase 3: UI & Integration
- Web interface
- CLI support
- Mobile app

---

*This is a design document. Implementation pending.*