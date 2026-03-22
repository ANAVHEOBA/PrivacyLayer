# PrivacyLayer Integration Examples

> Integration examples for the PrivacyLayer shielded pool on Stellar/Soroban across popular frameworks.

These examples demonstrate how to integrate with the PrivacyLayer smart contract from different frameworks and platforms. Each example covers the complete lifecycle: note generation, deposits, ZK-proof withdrawals, and pool monitoring.

Closes #96

---

## Overview

| Example | Framework | Language | Description |
|---------|-----------|----------|-------------|
| [react-app](./react-app/) | React 18 | TypeScript | Custom hook with state management |
| [vue-app](./vue-app/) | Vue 3 | TypeScript | Composable with reactive state |
| [angular-app](./angular-app/) | Angular 18 | TypeScript | Injectable service with RxJS |
| [nodejs-cli](./nodejs-cli/) | Node.js | TypeScript | Full CLI for terminal operations |
| [python-script](./python-script/) | Python 3 | Python | CLI client with stellar-sdk |
| [shared](./shared/) | — | TypeScript | Shared SDK client used by all TS examples |

---

## Prerequisites

Before running any example, you need:

1. **Stellar account** with funds on testnet
   ```bash
   # Generate a new keypair
   stellar keys generate --network testnet my-account

   # Fund it on testnet
   curl "https://friendbot.stellar.org/?addr=G..."
   ```

2. **PrivacyLayer contract deployed** on testnet
   ```bash
   # The contract ID will look like: CABC123...
   export PRIVACY_LAYER_CONTRACT_ID=<your-contract-id>
   ```

3. **Node.js 18+** (for TypeScript examples)
   ```bash
   node --version  # v18.0.0 or higher
   ```

4. **Python 3.10+** (for Python example)
   ```bash
   python3 --version  # 3.10 or higher
   ```

---

## Shared Client Library

All TypeScript examples use the shared client in [`shared/privacy-layer-client.ts`](./shared/privacy-layer-client.ts). This module provides:

- **`PrivacyLayerClient`** — Main client class for contract interactions
- **`generateNote()`** — Generates a deposit note with random nullifier and secret
- **`serializeNote()` / `deserializeNote()`** — Note backup and restoration
- **Type definitions** — `Note`, `PoolState`, `PoolConfig`, `Denomination`, etc.
- **Error classes** — `PrivacyLayerError`, `NetworkError`, `ProofGenerationError`
- **Event monitoring** — `subscribeToEvents()` with polling

### Important Notes on Cryptography

The shared client includes a **placeholder** Poseidon2 hash implementation using SHA-256. In production, you **must** replace this with the actual Poseidon2 WASM module compiled from the PrivacyLayer Noir circuits. Using the wrong hash function will produce commitments that the on-chain contract will reject.

```typescript
// PLACEHOLDER — replace with actual Poseidon2 WASM in production:
import { poseidon2 } from '@privacylayer/poseidon2-wasm';
```

Similarly, the ZK proof generation is not yet implemented — it requires the Noir WASM prover that compiles the withdrawal circuit into a browser/Node.js-compatible module.

---

## React Example

A React 18 application with a custom `usePrivacyLayer` hook.

```bash
cd examples/react-app
npm install
npm run dev
```

### Key Files

| File | Description |
|------|-------------|
| [`src/App.tsx`](./react-app/src/App.tsx) | Main UI with deposit, withdraw, and monitoring panels |
| [`src/hooks/usePrivacyLayer.ts`](./react-app/src/hooks/usePrivacyLayer.ts) | Custom hook wrapping the PrivacyLayer client |

### Integration Pattern

```tsx
import { usePrivacyLayer } from './hooks/usePrivacyLayer';
import { Denomination } from '../shared/privacy-layer-client';

function MyComponent() {
  const {
    poolState,       // Current pool state (reactive)
    events,          // Contract events array
    loading,         // Operation in progress
    error,           // Last error message
    createNote,      // Generate deposit note
    deposit,         // Execute deposit
    withdraw,        // Execute withdrawal
    refreshState,    // Manual state refresh
    backupNote,      // Serialize note for backup
    restoreNote,     // Restore note from string
  } = usePrivacyLayer({
    contractId: "CABC123...",
    network: "testnet",
    pollInterval: 10000,  // Auto-poll every 10s
  });

  const handleDeposit = async () => {
    const note = await createNote(Denomination.Xlm10);
    const backup = backupNote(note);
    // SAVE THE BACKUP STRING SECURELY
    const result = await deposit(note);
  };

  return <div>...</div>;
}
```

### Wallet Integration (Freighter)

The React example is designed to work with the [Freighter](https://www.freighter.app/) browser wallet:

```tsx
import freighter from "@stellar/freighter-api";

// In the deposit flow:
const { publicKey } = await freighter.getAddress();
const signedTx = await freighter.signTransaction(tx.toXDR(), {
  networkPassphrase: Networks.TESTNET,
});
```

---

## Vue 3 Example

A Vue 3 application using the Composition API with a `usePrivacyLayer` composable.

```bash
cd examples/vue-app
npm install
npm run dev
```

### Key Files

| File | Description |
|------|-------------|
| [`src/App.vue`](./vue-app/src/App.vue) | Main SFC with template, script setup, and scoped styles |
| [`src/composables/usePrivacyLayer.ts`](./vue-app/src/composables/usePrivacyLayer.ts) | Composable with `ref()` and `computed()` reactivity |

### Integration Pattern

```vue
<script setup lang="ts">
import { usePrivacyLayer } from './composables/usePrivacyLayer';
import { Denomination } from '../shared/privacy-layer-client';

const {
  poolState,         // Ref<PoolState | null>
  events,            // Ref<PrivacyLayerEvent[]>
  loading,           // Ref<boolean>
  error,             // Ref<string | null>
  isPoolPaused,      // ComputedRef<boolean>
  depositCount,      // ComputedRef<number>
  denominationLabel, // ComputedRef<string>
  createNote,
  deposit,
  withdraw,
} = usePrivacyLayer({
  contractId: "CABC123...",
  network: "testnet",
  pollInterval: 10000,
});
</script>

<template>
  <div v-if="poolState">
    <p>Deposits: {{ depositCount }}</p>
    <p>Paused: {{ isPoolPaused }}</p>
  </div>
</template>
```

---

## Angular Example

An Angular 18 application with an injectable `PrivacyLayerService` using RxJS.

```bash
cd examples/angular-app
npm install
npm start
```

### Key Files

| File | Description |
|------|-------------|
| [`src/app.component.ts`](./angular-app/src/app.component.ts) | Standalone component with inline template |
| [`src/privacy-layer.service.ts`](./angular-app/src/privacy-layer.service.ts) | Injectable service with BehaviorSubjects and Observables |

### Integration Pattern

```typescript
import { Component, OnInit } from '@angular/core';
import { PrivacyLayerService } from './privacy-layer.service';
import { Denomination } from '../shared/privacy-layer-client';

@Component({
  selector: 'app-root',
  template: `
    <div *ngIf="poolState$ | async as state">
      <p>Deposits: {{ state.depositCount }}</p>
    </div>
  `
})
export class AppComponent implements OnInit {
  poolState$ = this.plService.poolState$;
  events$ = this.plService.events$;
  operationState$ = this.plService.operationState$;

  constructor(private plService: PrivacyLayerService) {}

  ngOnInit() {
    this.plService.initialize({
      contractId: 'CABC123...',
      network: 'testnet',
      pollIntervalMs: 10000,
    });
  }

  deposit() {
    this.plService.createNote(Denomination.Xlm10).subscribe(note => {
      const backup = this.plService.backupNote(note);
      // Save backup securely
      this.plService.deposit(note).subscribe(result => {
        console.log('Deposited at leaf:', result.leafIndex);
      });
    });
  }
}
```

---

## Node.js CLI Example

A command-line interface for all PrivacyLayer operations.

```bash
cd examples/nodejs-cli
npm install

# Set required environment variables
export PRIVACY_LAYER_CONTRACT_ID=CABC123...
export STELLAR_SECRET_KEY=S...  # Only needed for deposit

# Available commands
npx tsx src/cli.ts --help
npx tsx src/cli.ts status
npx tsx src/cli.ts generate-note Xlm10
npx tsx src/cli.ts deposit Xlm10
npx tsx src/cli.ts withdraw note-123456-Xlm10.txt GABC...
npx tsx src/cli.ts monitor
npx tsx src/cli.ts check-nullifier <64-char-hex>
```

### Key Features

- **Note file management** — Notes are saved to `.privacylayer-notes/` with restrictive permissions (0600)
- **Colored output** — Structured status display with formatted headers
- **Error diagnostics** — Detailed error messages with suggested fixes for each contract error code
- **Real-time monitoring** — Live event stream with Ctrl+C to stop

### Key Files

| File | Description |
|------|-------------|
| [`src/cli.ts`](./nodejs-cli/src/cli.ts) | Full CLI with all commands |

---

## Python Script Example

A Python client and CLI using the `stellar-sdk` package.

```bash
cd examples/python-script
pip install -r requirements.txt

# Set required environment variables
export PRIVACY_LAYER_CONTRACT_ID=CABC123...
export STELLAR_SECRET_KEY=S...  # Only needed for deposit

# Available commands
python privacy_layer_client.py --help
python privacy_layer_client.py status
python privacy_layer_client.py generate-note --denomination Xlm10
python privacy_layer_client.py deposit --denomination Xlm10
python privacy_layer_client.py withdraw --note-file note-123.txt --recipient GABC...
python privacy_layer_client.py monitor
python privacy_layer_client.py check-nullifier <64-char-hex>
```

### Key Features

- **Dataclass-based types** — `Note`, `PoolState`, `DepositResult` with serialization
- **Argparse CLI** — Full command-line interface with subcommands
- **Note management** — File-based note storage with secure permissions
- **Same backup format** — Notes use the same `privacylayer-note-v1:...` format as TypeScript

### Key Files

| File | Description |
|------|-------------|
| [`privacy_layer_client.py`](./python-script/privacy_layer_client.py) | Complete client and CLI |
| [`requirements.txt`](./python-script/requirements.txt) | Python dependencies |

### Using as a Library

```python
from privacy_layer_client import (
    PrivacyLayerClient,
    generate_note,
    Denomination,
    DENOMINATION_LABELS,
)

# Create client
client = PrivacyLayerClient(
    contract_id="CABC123...",
    rpc_url="https://soroban-testnet.stellar.org",
    network_passphrase=Network.TESTNET_NETWORK_PASSPHRASE,
)

# Check pool status
state = client.get_pool_state()
print(f"Pool has {state.deposit_count} deposits")

# Generate a note
note = generate_note(Denomination.Xlm10)
print(f"Backup: {note.serialize()}")
```

---

## Security Considerations

1. **Note Safety**: The deposit note (nullifier + secret) is the ONLY way to withdraw funds. If lost, the deposit is permanently locked. Always create a backup BEFORE submitting the deposit transaction.

2. **Poseidon2 Hash**: The examples use a SHA-256 placeholder for the Poseidon2 hash. In production, use the WASM module compiled from the PrivacyLayer Noir circuits to ensure hash compatibility with the on-chain contract.

3. **ZK Proof Generation**: Withdrawal requires a Groth16 proof generated by the Noir WASM prover. This is not yet included in these examples — it will be available when the SDK module is published.

4. **Secret Key Handling**: Never hardcode secret keys. Use environment variables or a secure key management service.

5. **File Permissions**: Note files are created with mode 0600 (owner read/write only). Keep the `.privacylayer-notes/` directory backed up and encrypted.

---

## Architecture

```
examples/
├── shared/                          # Shared TypeScript SDK client
│   ├── privacy-layer-client.ts      # Client, types, crypto utilities
│   └── tsconfig.json                # TypeScript configuration
├── react-app/                       # React 18 example
│   ├── package.json
│   └── src/
│       ├── App.tsx                  # Main application
│       └── hooks/
│           └── usePrivacyLayer.ts   # Custom React hook
├── vue-app/                         # Vue 3 example
│   ├── package.json
│   └── src/
│       ├── App.vue                  # Main SFC
│       └── composables/
│           └── usePrivacyLayer.ts   # Vue composable
├── angular-app/                     # Angular 18 example
│   ├── package.json
│   └── src/
│       ├── app.component.ts         # Main component
│       └── privacy-layer.service.ts # Injectable service
├── nodejs-cli/                      # Node.js CLI example
│   ├── package.json
│   └── src/
│       └── cli.ts                   # CLI with all commands
├── python-script/                   # Python example
│   ├── requirements.txt
│   └── privacy_layer_client.py      # Client and CLI
└── README.md                        # This file
```

---

## Contributing

These examples are part of the PrivacyLayer project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes and add tests
4. Submit a PR referencing the relevant issue

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT — see [LICENSE](../LICENSE)
