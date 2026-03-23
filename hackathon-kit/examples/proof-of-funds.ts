/**
 * Proof of Funds Example
 * 
 * Prove you have at least X tokens without revealing your actual balance.
 * Useful for: KYC, credit checks, auction eligibility, airdrops.
 */

/**
 * Generate a range proof: proves balance >= threshold
 * without revealing the actual balance.
 */

/** Convert bytes to short hex string */
function toHex(bytes: Uint8Array, length = 8): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function proveMinBalance(
  actualBalance: number,
  threshold: number,
  secret: Uint8Array
): Promise<{ proof: object; publicInputs: object } | null> {
  
  if (actualBalance < threshold) {
    console.log(`❌ Cannot prove: actual balance (${actualBalance}) < threshold (${threshold})`);
    return null;
  }
  
  console.log(`Generating proof: balance >= ${threshold}`);
  console.log(`(Actual balance ${actualBalance} is hidden)`);
  
  // The Noir circuit checks:
  // 1. The prover knows a secret that corresponds to a balance commitment on-chain
  // 2. The committed balance >= threshold (range proof)
  //
  // The verifier learns ONLY that balance >= threshold
  // They do NOT learn the actual balance
  
  const proof = {
    publicInputs: {
      balanceCommitment: `commitment_${toHex(secret)}`,
      threshold,
      merkleRoot: 'simulated_state_root',
    },
    proof: 'simulated_range_proof',
  };
  
  console.log('✅ Proof generated\n');
  return proof;
}

/**
 * Verify a proof of funds (done by the verifier / smart contract)
 */
function verifyProof(proof: { proof: object; publicInputs: object }): boolean {
  // In production: the Solana program verifies the ZK proof on-chain
  console.log('Verifying proof on-chain...');
  console.log('Public inputs:', proof.publicInputs);
  console.log('✅ Proof valid — user has sufficient funds');
  return true;
}

// --- Demo ---
async function main() {
  console.log('=== Proof of Funds Demo ===\n');
  
  const userSecret = crypto.getRandomValues(new Uint8Array(32));
  const actualBalance = 50_000; // User has 50,000 tokens
  
  // Scenario 1: Prove balance >= 10,000 (should succeed)
  console.log('--- Scenario 1: Auction entry (min 10,000 tokens) ---');
  const proof1 = await proveMinBalance(actualBalance, 10_000, userSecret);
  if (proof1) verifyProof(proof1);
  
  // Scenario 2: Prove balance >= 100,000 (should fail)
  console.log('\n--- Scenario 2: VIP tier (min 100,000 tokens) ---');
  const proof2 = await proveMinBalance(actualBalance, 100_000, userSecret);
  if (proof2) verifyProof(proof2);
  else console.log('Proof generation refused — insufficient balance\n');
  
  // Scenario 3: Prove balance >= 25,000 (should succeed)
  console.log('--- Scenario 3: Governance eligibility (min 25,000 tokens) ---');
  const proof3 = await proveMinBalance(actualBalance, 25_000, userSecret);
  if (proof3) verifyProof(proof3);
  
  console.log('\n=== Summary ===');
  console.log('The verifier knows:');
  console.log('  ✅ User has >= 10,000 tokens');
  console.log('  ❌ User does NOT have >= 100,000 tokens');
  console.log('  ✅ User has >= 25,000 tokens');
  console.log('The verifier does NOT know the actual balance (50,000).');
}

main().catch(console.error);
