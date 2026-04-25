import { createDeposit } from '../src/deposit';
import { LocalMerkleTree } from '../src/merkle';
import { Note } from '../src/note';
import { PreparedWitness, ProofGenerator, ProvingBackend, VerifyingBackend } from '../src/proof';
import { extractPublicInputs, generateWithdrawalProof, verifyWithdrawalProof } from '../src/withdraw';
import { stableHash32, stableStringify } from '../src/stable';

class IntegrationProvingBackend implements ProvingBackend {
  async generateProof(witness: PreparedWitness): Promise<Uint8Array> {
    const amount = BigInt(witness.amount);
    const fee = BigInt(witness.fee);

    if (fee > amount) {
      throw new Error('invalid witness: fee exceeds amount');
    }

    if (!Array.isArray(witness.hash_path) || witness.hash_path.length === 0) {
      throw new Error('invalid witness: missing merkle path');
    }

    const digest = stableHash32('integration-proof', stableStringify(witness));
    const proof = new Uint8Array(64);
    proof.set(digest, 0);
    proof.set(digest, 32);
    proof[0] = 0xab;
    return proof;
  }
}

class IntegrationVerifyingBackend implements VerifyingBackend {
  async verifyProof(proof: Uint8Array, publicInputs: string[]): Promise<boolean> {
    if (proof.length !== 64 || proof[0] !== 0xab) {
      return false;
    }

    // publicInputs order: pool_id(0) root(1) nullifier_hash(2) recipient(3) amount(4) relayer(5) fee(6)
    const amount = BigInt(publicInputs[4]);
    const fee = BigInt(publicInputs[6]);
    return fee <= amount;
  }
}

const FIXTURES = {
  valid: {
    seed: 'zk-valid-fixture',
    poolId: '44'.repeat(32),
    amount: 1000n,
    recipient: '0xrecipient-valid',
    relayer: '0xrelayer-valid',
    fee: 5n
  },
  invalid: {
    seed: 'zk-invalid-fixture',
    poolId: '55'.repeat(32),
    amount: 500n,
    recipient: '0xrecipient-invalid',
    relayer: '0xrelayer-invalid',
    fee: 501n
  }
};

describe('SDK ZK integration flow', () => {
  it('completes note -> tree -> witness -> proof -> verify round trip', async () => {
    const fixture = FIXTURES.valid;

    const note = Note.deriveDeterministic(fixture.seed, fixture.poolId, fixture.amount);
    const deposit = createDeposit({ poolId: fixture.poolId, amount: fixture.amount, note });

    const tree = new LocalMerkleTree();
    const [leafIndex] = tree.insertBatch([deposit.commitment]);
    const merkleProof = tree.generateProof(leafIndex);

    const proof = await generateWithdrawalProof(
      {
        note,
        merkleProof,
        recipient: fixture.recipient,
        relayer: fixture.relayer,
        fee: fixture.fee
      },
      new IntegrationProvingBackend()
    );

    const witness = await ProofGenerator.prepareWitness(
      note,
      merkleProof,
      fixture.recipient,
      fixture.relayer,
      fixture.fee
    );

    const publicInputs = extractPublicInputs(witness);
    const isValid = await verifyWithdrawalProof(
      proof,
      publicInputs,
      { fixture: 'withdraw-artifact' },
      new IntegrationVerifyingBackend()
    );

    expect(isValid).toBe(true);
    expect(proof.length).toBe(64);
    expect(stableHash32('pi', stableStringify(publicInputs)).length).toBe(32);
  });

  it('fails invalid flow with the expected reason', async () => {
    const fixture = FIXTURES.invalid;

    const note = Note.deriveDeterministic(fixture.seed, fixture.poolId, fixture.amount);
    const deposit = createDeposit({ poolId: fixture.poolId, amount: fixture.amount, note });

    const tree = new LocalMerkleTree();
    tree.insert(deposit.commitment);
    const merkleProof = tree.generateProof(0);

    await expect(
      generateWithdrawalProof(
        {
          note,
          merkleProof,
          recipient: fixture.recipient,
          relayer: fixture.relayer,
          fee: fixture.fee
        },
        new IntegrationProvingBackend()
      )
    ).rejects.toThrow('fee cannot exceed amount');
  });
});
