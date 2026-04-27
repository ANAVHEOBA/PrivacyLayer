#!/usr/bin/env node
/**
 * ZK Proof Smoke Test
 *
 * - Runs same witness multiple times
 * - Verifies:
 *   - proof verifies
 *   - public inputs are stable
 *   - structure is consistent
 * - Detects backend nondeterminism safely
 */

import assert from "assert";

// 🔁 Replace with real imports when wiring
// import { generateProof, verifyProof } from "../src/backends/noir";
// import { buildWithdrawWitness } from "../src/withdraw";

// ===============================
// CONFIG
// ===============================
const RUNS = 3;

// ===============================
// MOCK HOOKS (REPLACE THESE)
// ===============================
async function buildWithdrawWitness() {
  return {
    recipient: "0xabc",
    amount: 100,
    nullifier: "0x123",
    root: "0x456",
  };
}

async function generateProof(witness) {
  // ⚠️ Simulate nondeterminism in proof bytes
  return {
    proof: "proof_" + Math.random().toString(36).slice(2),
    publicInputs: [witness.nullifier, witness.root],
  };
}

async function verifyProof(proof, publicInputs) {
  // Simulate always valid proof
  return true;
}

// ===============================
// HELPERS
// ===============================
function assertSameShape(a, b) {
  assert.deepStrictEqual(
    Object.keys(a).sort(),
    Object.keys(b).sort(),
    "Proof shape mismatch"
  );
}

function assertArrayEqual(a, b, label) {
  assert.strictEqual(a.length, b.length, `${label} length mismatch`);

  for (let i = 0; i < a.length; i++) {
    assert.strictEqual(
      a[i],
      b[i],
      `${label} mismatch at index ${i}: ${a[i]} !== ${b[i]}`
    );
  }
}

// ===============================
// MAIN TEST
// ===============================
async function main() {
  console.log("🧪 Running ZK proof smoke tests...\n");

  const witness = await buildWithdrawWitness();

  const results = [];

  for (let i = 0; i < RUNS; i++) {
    console.log(`▶ Run ${i + 1}`);

    const { proof, publicInputs } = await generateProof(witness);

    // --- VERIFY PROOF ---
    const isValid = await verifyProof(proof, publicInputs);
    assert.strictEqual(isValid, true, "Proof verification failed");

    results.push({ proof, publicInputs });
  }

  // ===============================
  // CONSISTENCY CHECKS
  // ===============================
  console.log("\n🔍 Checking consistency...");

  const base = results[0];

  for (let i = 1; i < results.length; i++) {
    const current = results[i];

    // --- PUBLIC INPUTS MUST MATCH ---
    assertArrayEqual(
      base.publicInputs,
      current.publicInputs,
      "Public inputs"
    );

    // --- STRUCTURE MUST MATCH ---
    assertSameShape(base, current);
  }

  // ===============================
  // NON-DETERMINISM DETECTION
  // ===============================
  const uniqueProofs = new Set(results.map((r) => r.proof));

  if (uniqueProofs.size > 1) {
    console.log("ℹ️ Proofs are NON-deterministic (expected in many ZK systems)");
  } else {
    console.log("ℹ️ Proofs are deterministic");
  }

  console.log("\n✅ Smoke tests passed.");
}

// ===============================
main().catch((err) => {
  console.error("\n❌ Smoke test failed:");
  console.error(err);
  process.exit(1);
});