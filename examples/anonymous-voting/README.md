# Example: Anonymous Voting

> Create and participate in private polls.

## Overview

This example shows how to build a private voting system using PrivacyLayer.

## Features

- Create voting proposals
- Cast votes without revealing identity
- Tally results privately
- Prove participation without doxxing

## Quick Start

```bash
cd examples/anonymous-voting
npm install
npm run dev
```

## How It Works

1. **Create Proposal:** Organizer creates a proposal with options
2. **Vote:** Users cast votes using private transactions
3. **Tally:** Votes are counted without revealing individual choices
4. **Results:** Final results are published

## Code Example

```javascript
import { PrivacyLayer } from '@privacylayer/sdk';

// Create a proposal
const proposal = await pl.createProposal({
  title: 'Should we add Feature X?',
  options: ['Yes', 'No', 'Abstain'],
  endTime: Date.now() + 86400000 // 24 hours
});

// Cast a private vote
const vote = await pl.castVote({
  proposalId: proposal.id,
  choice: 0, // Yes
  private: true
});

// Get results
const results = await pl.getResults(proposal.id);
console.log(results); // { 'Yes': 42, 'No': 10, 'Abstain': 3 }
```

## Learn More

See full documentation at [docs.privacylayer.io](https://docs.privacylayer.io)
