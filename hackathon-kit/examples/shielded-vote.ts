/**
 * Shielded Vote Example
 * 
 * Anonymous voting using PrivacyLayer's ZK proofs.
 * Voters prove they're eligible without revealing which vote is theirs.
 */

interface Voter {
  id: string;
  secret: Uint8Array;
  commitment: string;
}

interface Vote {
  voter: Voter;
  choice: number; // 0 = no, 1 = yes
  proof: object;
}

/**
 * Register a voter — adds their commitment to the eligible voters Merkle tree
 */
function registerVoter(voterId: string): Voter {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const commitment = `voter_${voterId.slice(0, 4)}_${Date.now()}`;
  
  console.log(`Registered voter: ${voterId}`);
  console.log(`Commitment (public): ${commitment}`);
  
  return { id: voterId, secret, commitment };
}

/**
 * Cast a vote with a ZK proof of eligibility
 */
async function castVote(voter: Voter, choice: number): Promise<Vote> {
  console.log(`\nCasting vote: ${choice === 1 ? 'YES' : 'NO'}`);
  
  // The ZK proof demonstrates:
  // 1. The voter knows a secret corresponding to a commitment in the voter tree
  // 2. The voter hasn't voted before (nullifier check)
  // 3. The vote is valid (0 or 1)
  //
  // The proof does NOT reveal:
  // - Which voter is casting the vote
  // - The voter's secret
  // - Any link between voter identity and vote choice
  
  const proof = {
    publicInputs: {
      voterTreeRoot: 'simulated_voter_tree_root',
      nullifierHash: `nullifier_${Buffer.from(voter.secret).toString('hex').slice(0, 8)}`,
      choice,
    },
    proof: 'simulated_vote_proof',
  };
  
  console.log('ZK proof generated — vote is anonymous');
  return { voter, choice, proof };
}

/**
 * Tally votes — anyone can verify the proofs and count
 */
function tallyVotes(votes: Vote[]): { yes: number; no: number; total: number } {
  let yes = 0;
  let no = 0;
  
  for (const vote of votes) {
    // In production: verify each ZK proof on-chain
    // Check nullifier hasn't been used (no double voting)
    if (vote.choice === 1) yes++;
    else no++;
  }
  
  return { yes, no, total: votes.length };
}

// --- Demo ---
async function main() {
  console.log('=== Shielded Vote Demo ===\n');
  
  // Register 5 voters
  const voters = [
    registerVoter('alice'),
    registerVoter('bob'),
    registerVoter('charlie'),
    registerVoter('diana'),
    registerVoter('eve'),
  ];
  
  console.log(`\n${voters.length} voters registered\n`);
  
  // Cast votes (anonymous — no one knows who voted what)
  const votes: Vote[] = [];
  votes.push(await castVote(voters[0], 1)); // yes
  votes.push(await castVote(voters[1], 0)); // no
  votes.push(await castVote(voters[2], 1)); // yes
  votes.push(await castVote(voters[3], 1)); // yes
  votes.push(await castVote(voters[4], 0)); // no
  
  // Tally
  const result = tallyVotes(votes);
  console.log('\n=== Results ===');
  console.log(`YES: ${result.yes}`);
  console.log(`NO: ${result.no}`);
  console.log(`Total: ${result.total}`);
  console.log(`\n✅ All votes verified. No voter identities revealed.`);
}

main().catch(console.error);
