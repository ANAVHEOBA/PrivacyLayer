# PrivacyLayer TypeScript SDK

Foundational TypeScript SDK package for integrating applications with the PrivacyLayer shielded pool.

This package currently provides:

- Public SDK types for notes, denominations, deposits, withdrawals, proofs, and network configuration.
- Network and denomination constants aligned with the Soroban contract.
- Hex, base64, and `bytes32` encoding helpers.
- Input validation for notes, Stellar addresses, denominations, and field-sized hex values.
- Note generation helpers for application wiring and test flows.

## Install

```bash
npm install
```

## Develop

```bash
npm test
npm run build
```

## Example

```ts
import { Denomination, generateNote, validateNote } from '@privacylayer/sdk';

const note = generateNote(Denomination.XLM_100);
validateNote(note);

console.log(note.commitment);
```

## Cryptography Status

`computeCommitment()` and `computeNullifierHash()` currently use deterministic SHA-256 placeholders so the SDK package can be tested and wired into applications before the Noir/Poseidon prover bundle lands. Production deposits and withdrawals must replace these helpers with the same Poseidon2 primitive used by the circuits and Soroban contract.

## Package Layout

```text
sdk/
  src/
    constants.ts
    index.ts
    types.ts
    utils/
      crypto.ts
      encoding.ts
      validation.ts
    __tests__/
      utils.test.ts
```
