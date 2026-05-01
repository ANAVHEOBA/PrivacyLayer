/// <reference types="jest" />
// HASH_MODE: mock (ZK-106) — uses SHA-256 structural stand-ins via prepareWitness;
// testOnlyAllowMockHash: MOCK_HASH_CONTEXT is set on all generate() / generateWithdrawalProof() calls.

import { Note } from '../src/note';
import { MerkleProof, ProofGenerator, ProvingBackend, ProvingError } from '../src/proof';
import { generateWithdrawalProof } from '../src/withdraw';
import { MOCK_HASH_CONTEXT } from '../src/hash_mode';
import { DEFAULT_DENOMINATION } from '../src/zk_constants';

const RECIPIENT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const r32 = Buffer.from('03'.repeat(32), 'hex');
const s31 = (byte = '01') => Buffer.from(byte.repeat(31), 'hex');
const p20 = () => Array.from({ length: 20 }, () => Buffer.from('04'.repeat(32), 'hex'));

class MockBackend implements ProvingBackend {
  async generateProof(_witness: any): Promise<Uint8Array> {
    // Placeholder: production Groth16 payload is 256 bytes (A || B || C)
    return new Uint8Array(256).fill(0xab);
  }
}

function makeNote(): Note {
  return new Note(s31('01'), s31('02'), '03'.repeat(32), DEFAULT_DENOMINATION);
}

function makeMerkleProof(): MerkleProof {
  return { root: r32, pathElements: p20(), leafIndex: 0 };
}

describe('Proving Path Abstraction', () => {
  it('generates a proof using a mock backend (testOnlyAllowMockHash acknowledges mock-hash mode)', async () => {
    const backend = new MockBackend();
    const request = { note: makeNote(), merkleProof: makeMerkleProof(), recipient: RECIPIENT, fee: 0n };

    // HASH_MODE: mock — testOnlyAllowMockHash explicitly acknowledges SHA-256 stand-ins
    const proof = await generateWithdrawalProof(request, backend, {
      testOnlyAllowMockHash: MOCK_HASH_CONTEXT,
    });

    expect(proof).toBeDefined();
    expect(proof.length).toBe(256);
    expect(proof[0]).toBe(0xab);
  });

  it('throws MOCK_HASH_MODE when generateWithdrawalProof is called without testOnlyAllowMockHash', async () => {
    const backend = new MockBackend();
    const request = { note: makeNote(), merkleProof: makeMerkleProof(), recipient: RECIPIENT, fee: 0n };

    // No opt-in: must be rejected to prevent accidental production use of SHA-256 nullifier hashes
    await expect(generateWithdrawalProof(request, backend)).rejects.toThrow('[ZK-106]');

    let code: string | undefined;
    try {
      await generateWithdrawalProof(request, backend);
    } catch (e: any) {
      code = (e as ProvingError).code;
    }
    expect(code).toBe('MOCK_HASH_MODE');
  });

  it('throws if no backend is provided to ProofGenerator', async () => {
    const generator = new ProofGenerator();
    await expect(generator.generate({})).rejects.toThrow('Proving backend not configured');
  });

  it('mock backend is invoked and returns expected bytes when opt-in is set', async () => {
    const backend = new MockBackend();
    const witness = await ProofGenerator.prepareWitness(makeNote(), makeMerkleProof(), RECIPIENT);
    const gen = new ProofGenerator(backend);

    // HASH_MODE: mock
    const rawProof = await gen.generate(witness, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });
    expect(rawProof).toBeInstanceOf(Uint8Array);
    expect(rawProof[0]).toBe(0xab);
  });
});
