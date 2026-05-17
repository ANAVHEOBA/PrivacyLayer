# PrivacyLayer Angular Integration Example

This example demonstrates how to integrate PrivacyLayer SDK into an Angular application.

## Installation

```bash
npm install @privacylayer/sdk
```

## Usage

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { PrivacyLayer, Network } from '@privacylayer/sdk';

@Component({
  selector: 'app-root',
  template: `
    <h1>PrivacyLayer Angular Example</h1>
    <p>Balance: {{ balance }} USDC</p>
    <button (click)="deposit()">Deposit 100 USDC</button>
  `
})
export class AppComponent implements OnInit {
  private client: PrivacyLayer;
  balance = 0;

  async ngOnInit() {
    this.client = new PrivacyLayer({
      network: Network.TESTNET,
      apiKey: environment.privacyApiKey
    });
    
    const bal = await this.client.getBalance();
    this.balance = bal.total;
  }

  async deposit() {
    const result = await this.client.deposit({
      amount: 100,
      asset: 'USDC'
    });
    console.log('Deposit complete:', result.noteId);
  }
}
```

## Running the Example

```bash
cd examples/angular-example
npm install
ng serve
```
