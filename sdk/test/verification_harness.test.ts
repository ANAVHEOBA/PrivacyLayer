/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import { Note } from '../src/note';
import { MerkleProof, ProofGenerator, VerifyingBackend } from '../src/proof';
import { verifyWithdrawalProof, extractPublicInputs } from '../src/withdraw';
import { WithdrawalPublicInputs, fieldToHex } from '../src/encoding';
import { WitnessValidationError } from '../src/errors';

class MockVerifyingBackend implements VerifyingBackend {
  constructor(private readonly expectedPublicInputs: string[]) {}

  async verifyProof(proof: Uint8Array, publicInputs: string[], artifacts: any): Promise<boolean> {
    if (proof[0] !== 0xab) return false;
    if (publicInputs.length !== this.expectedPublicInputs.length) return false;
    for (let i = 0; i < publicInputs.length; i++) {
      if (publicInputs[i] !== this.expectedPublicInputs[i]) return false;
    }
    return true;
  }
}

function makePublicInputs(overrides: Partial<WithdrawalPublicInputs> = {}): WithdrawalPublicInputs {
  return {
    pool_id: '01'.repeat(32),
    root: '02'.repeat(32),
    nullifier_hash: '03'.repeat(32),
    recipient: '04'.repeat(32),
    amount: fieldToHex(1000000000n), // DEFAULT_DENOMINATION
    relayer: '05'.repeat(32),
    fee: fieldToHex(0n),
    ...overrides,
  };
}

function asVerifierFieldList(publicInputs: WithdrawalPublicInputs): string[] {
  return [
    publicInputs.pool_id,
    publicInputs.root,
    publicInputs.nullifier_hash,
    publicInputs.recipient,
    publicInputs.amount,
    publicInputs.relayer,
    publicInputs.fee,
  ];
}

describe('Verification Harness', () => {
  const artifactsDir = path.resolve(__dirname, '../../artifacts/zk');
  const manifestPath = path.join(artifactsDir, 'manifest.json');
  
  let manifest: any;
  let withdrawArtifact: any;

  beforeAll(() => {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const artifactPath = path.join(artifactsDir, manifest.circuits.withdraw.path);
    withdrawArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  });

  it('should verify a valid proof successfully', async () => {
    const proof = new Uint8Array(64).fill(0xab);
    const publicInputs = makePublicInputs();
    const backend = new MockVerifyingBackend(asVerifierFieldList(publicInputs));
    const isValid = await verifyWithdrawalProof(proof, publicInputs, withdrawArtifact, backend);
    expect(isValid).toBe(true);
  });

  it('should fail verification for tampered proof bytes', async () => {
    const publicInputs = makePublicInputs();
    const backend = new MockVerifyingBackend(asVerifierFieldList(publicInputs));
    const proof = new Uint8Array(64).fill(0xff);
    const isValid = await verifyWithdrawalProof(proof, publicInputs, withdrawArtifact, backend);
    expect(isValid).toBe(false);
  });

  it.each([
    ['pool_id', 0],
    ['root', 1],
    ['nullifier_hash', 2],
    ['recipient', 3],
    ['amount', 4],
    ['relayer', 5],
    ['fee', 6],
  ])('should fail verification when %s is tampered', async (_label: string, idx: number) => {
    const proof = new Uint8Array(64).fill(0xab);
    const good = makePublicInputs();
    const backend = new MockVerifyingBackend(asVerifierFieldList(good));
    const tampered = { ...good };
    const keys: (keyof WithdrawalPublicInputs)[] = ['pool_id', 'root', 'nullifier_hash', 'recipient', 'amount', 'relayer', 'fee'];
    tampered[keys[idx]!] =
      keys[idx] === 'amount' ? fieldToHex(1000000001n)
      : keys[idx] === 'fee' ? fieldToHex(1n)
      : '09'.repeat(32);
    const isValid = await verifyWithdrawalProof(proof, tampered, withdrawArtifact, backend);
    expect(isValid).toBe(false);
  });

  it('rejects raw public-input arrays because schema order cannot be enforced', async () => {
    await expect(
      verifyWithdrawalProof(
        new Uint8Array(64).fill(0xab),
        ['pool', 'root', 'nullifier_hash', 'recipient', '100', 'relayer', '0'],
        withdrawArtifact,
        new MockVerifyingBackend([])
      )
    ).rejects.toThrow(WitnessValidationError);
  });

  it('should integrate generate and verify flow with extraction', async () => {
    // This test ensures that extractPublicInputs works with ProofGenerator.prepareWitness
    const note = new Note(
      Buffer.from('01'.repeat(31), 'hex'),
      Buffer.from('02'.repeat(31), 'hex'),
      '03'.repeat(32),
      1000000000n // DEFAULT_DENOMINATION
    );
    
    const merkleProof: MerkleProof = {
      root: Buffer.from('03'.repeat(32), 'hex'),
      pathElements: Array.from({ length: 20 }, () => Buffer.from('04'.repeat(32), 'hex')),
      leafIndex: 0
    };

    const witness = await ProofGenerator.prepareWitness(
      note,
      merkleProof,
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
    );
    const publicInputs = extractPublicInputs(witness);
    
    expect(publicInputs).toHaveLength(7);
    expect(publicInputs[0]).toBe(witness.pool_id);
    expect(publicInputs[1]).toBe(witness.root);
    expect(publicInputs[3]).toBe(witness.recipient);
  });
});
