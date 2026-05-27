# PrivacyLayer Private Payroll System

**Version:** 1.0  
**Status:** Design Document

---

## Overview

The Private Payroll System enables employers to pay employees privately using PrivacyLayer's privacy pool. Salaries are deposited and withdrawn without revealing payment amounts, timing, or recipient identities on-chain.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Payroll Contract                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Employee    │  │   Payment    │  │   Schedule   │          │
│  │  Registry    │  │   Processor  │  │   Manager    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Privacy Pool Integration                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Employee Registry

```rust
pub struct EmployeeRegistry {
    employees: Map<EmployeeId, Employee>,
    employer: Address,
}

pub struct Employee {
    id: EmployeeId,
    commitment: Commitment,  // Privacy-preserving identifier
    salary: EncryptedAmount,
    schedule: PaymentSchedule,
    start_date: u64,
    status: EmployeeStatus,
}

pub enum EmployeeStatus {
    Active,
    Paused,
    Terminated,
}
```

### 2. Payment Schedule

```rust
pub struct PaymentSchedule {
    frequency: PaymentFrequency,
    day_of_month: Option<u8>,  // For monthly
    day_of_week: Option<u8>,   // For weekly
    start_date: u64,
    end_date: Option<u64>,
}

pub enum PaymentFrequency {
    Weekly,
    BiWeekly,
    Monthly,
    Custom { interval_days: u64 },
}
```

### 3. Batch Payments

```rust
pub struct BatchPayment {
    employer: Address,
    payments: Vec<IndividualPayment>,
    total_amount: u128,
    asset: Asset,
    created_at: u64,
    status: BatchStatus,
}

pub struct IndividualPayment {
    employee_id: EmployeeId,
    amount: u128,
    nullifier: Nullifier,  // Prevent double-payment
}

impl PayrollContract {
    pub fn process_batch(
        &mut self,
        batch: BatchPayment,
        proof: ZKProof,
    ) {
        // Verify employer authorization
        // Verify total matches sum
        // Process each payment via privacy pool
        // Emit events (private)
    }
}
```

---

## Features

### 1. Recurring Payments

```rust
impl PayrollContract {
    pub fn setup_recurring(
        &mut self,
        employee_id: EmployeeId,
        schedule: PaymentSchedule,
    ) {
        // Register recurring payment
        // Enable automatic triggers
    }
    
    pub fn execute_scheduled(
        &mut self,
        employee_id: EmployeeId,
    ) {
        // Check schedule
        // Verify time elapsed
        // Process payment
        // Update next payment date
    }
}
```

### 2. Employer Dashboard UI

```
┌─────────────────────────────────────────────────────────────┐
│                    Payroll Dashboard                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Total Payroll This Month: $XXX,XXX (hidden on-chain)       │
│  Employees: 12 Active                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next Payment: March 31, 2026                          │ │
│  │  Amount: $XX,XXX                                       │ │
│  │  [Process Now] [View Details]                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Recent Payments                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Mar 15 │ Employee #001 │ $X,XXX │ ✓ Delivered         │ │
│  │ Mar 15 │ Employee #002 │ $X,XXX │ ✓ Delivered         │ │
│  │ Mar 15 │ Employee #003 │ $X,XXX │ ✓ Delivered         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [+ Add Employee] [Process Payroll] [Export Report]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Employee Portal UI

```
┌─────────────────────────────────────────────────────────────┐
│                    Employee Portal                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Welcome, Employee #001                                      │
│                                                              │
│  Salary: $X,XXX/month (private)                             │
│  Next Payment: March 31, 2026                               │
│                                                              │
│  Payment History                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Mar 15 │ $X,XXX │ ✓ Received                          │ │
│  │ Feb 28 │ $X,XXX │ ✓ Received                          │ │
│  │ Feb 15 │ $X,XXX │ ✓ Received                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Withdrawal Address: [Set Address]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Privacy Guarantees

### What's Hidden

| Data | Visibility |
|------|------------|
| Employee identity | Hidden (commitment) |
| Salary amount | Hidden (encrypted) |
| Payment frequency | Hidden |
| Employer identity | Hidden (optional) |

### What's Public

| Data | Visibility |
|------|------------|
| Payroll contract exists | Yes |
| Number of payments (anonymized) | Aggregate only |
| Contract state changes | Yes |

---

## Smart Contract Interface

```rust
pub trait PayrollTrait {
    // Employer functions
    fn add_employee(
        &mut self,
        commitment: Commitment,
        encrypted_salary: EncryptedData,
        schedule: PaymentSchedule,
    ) -> EmployeeId;
    
    fn update_salary(
        &mut self,
        employee_id: EmployeeId,
        new_salary: EncryptedData,
    );
    
    fn terminate_employee(
        &mut self,
        employee_id: EmployeeId,
    );
    
    // Payment functions
    fn process_payroll(
        &mut self,
        batch: Vec<EmployeeId>,
        proof: ZKProof,
    );
    
    fn process_single(
        &mut self,
        employee_id: EmployeeId,
        withdrawal_address: Address,
        proof: ZKProof,
    );
    
    // View functions (private)
    fn get_employee_schedule(
        &self,
        employee_id: EmployeeId,
    ) -> PaymentSchedule;
    
    fn get_next_payment_date(
        &self,
        employee_id: EmployeeId,
    ) -> u64;
}
```

---

## Batch Payment Flow

```
Employer                    Payroll Contract              Privacy Pool
   │                              │                           │
   │── 1. Create Batch ──────────►│                           │
   │    (employee_ids)            │                           │
   │                              │                           │
   │── 2. Fund Batch ────────────►│                           │
   │    (total + ZK proof)        │── 3. Deposit ────────────►│
   │                              │                           │
   │                              │── 4. Create commitments ──►│
   │                              │   (one per employee)      │
   │                              │                           │
   │                              │◄── 5. Merkle root ────────│
   │                              │                           │
   │                              │   Employees withdraw      │
   │                              │   via privacy pool        │
```

---

## Security Considerations

### Access Control

| Role | Permissions |
|------|-------------|
| Employer | Add/remove employees, process payroll |
| Admin | Update contract settings |
| Employee | View own data, withdraw |

### Audit Checklist

- [ ] Employer authorization on all functions
- [ ] Employee data encryption
- [ ] Batch payment integrity
- [ ] Nullifier uniqueness (no double-payment)
- [ ] Schedule enforcement
- [ ] ZK proof verification

---

## Fee Structure

| Action | Fee |
|--------|-----|
| Add employee | 0 |
| Process payroll | 0.1% |
| Withdraw | Standard privacy pool fee |

---

## Implementation Roadmap

### Phase 1: Core Contract
- Employee registry
- Single payments
- Basic scheduling

### Phase 2: Batch Processing
- Batch payment optimization
- Gas-efficient loops
- Merkle tree batching

### Phase 3: UI & Integration
- Employer dashboard
- Employee portal
- API endpoints

---

*This is a design document. Implementation pending.*