import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ZK-087: Accept version parameter
const zkVersion = process.argv[2] || '1';
const artifactsDir = path.join(repoRoot, 'artifacts', 'zk', `v${zkVersion}`);
const schemaPath = path.join(artifactsDir, 'verifier_schema.json');

/**
 * ZK-087: Verifier Schema (Authoritative)
 * 
 * This schema defines the expected public input order, widths, and contract 
 * visibility for the withdrawal verifier. It serves as the single source of 
 * truth for both the TypeScript SDK and the Soroban contract.
 * 
 * Order matches circuits/withdraw/src/main.nr.
 */
const schema = {
  circuit: "withdraw",
  version: zkVersion,
  public_inputs: [
    { name: "pool_id",        bytes: 32, contract_visible: true,  description: "Unique identifier for the shielded pool" },
    { name: "root",           bytes: 32, contract_visible: true,  description: "Merkle root proving membership" },
    { name: "nullifier_hash", bytes: 32, contract_visible: true,  description: "Hash preventing double-spend" },
    { name: "recipient",      bytes: 32, contract_visible: true,  description: "Stellar address hash of recipient" },
    { name: "amount",         bytes: 32, contract_visible: true,  description: "Withdrawal amount" },
    { name: "relayer",        bytes: 32, contract_visible: true,  description: "Optional relayer address hash" },
    { name: "fee",            bytes: 32, contract_visible: true,  description: "Relayer fee" },
    { name: "denomination",   bytes: 32, contract_visible: true,  description: "Fixed denomination of the pool" }
  ]
};

function main() {
  console.log(`Generating verifier schema for version ${zkVersion}...`);

  if (!fs.existsSync(path.dirname(schemaPath))) {
    fs.mkdirSync(path.dirname(schemaPath), { recursive: true });
  }

  // Idempotent write with 2-space indentation
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');
  console.log(`✨ Verifier schema emitted at: ${path.relative(repoRoot, schemaPath)}`);
}

main();
