/// <reference types="jest" />
// HASH_MODE: mock (ZK-106) — uses SHA-256 structural stand-ins via prepareWitness;
// testOnlyAllowMockHash: MOCK_HASH_CONTEXT is set on all generateWithdrawalProof() calls.

import { Note } from '../src/note';
import { InMemoryProofCache, MerkleProof, ProofGenerator, ProvingBackend } from '../src/proof';
import { buildWithdrawalProofCacheKey, generateWithdrawalProof, WithdrawalRequest } from '../src/withdraw';
import { stableHash32 } from '../src/stable';
import { MOCK_HASH_CONTEXT } from '../src/hash_mode';

class CountingBackend implements ProvingBackend {
  public calls = 0;

  async generateProof(witness: any): Promise<Uint8Array> {
    this.calls += 1;
    const digest = stableHash32('proof', JSON.stringify(witness));
    const proof = new Uint8Array(256);
    proof.set(digest, 0);
    proof.set(digest, 32);
    return proof;
  }
}

function makeRequest(overrides: Partial<WithdrawalRequest> = {}): WithdrawalRequest {
  const note = new Note(
    Buffer.from('01'.repeat(31), 'hex'),
    Buffer.from('02'.repeat(31), 'hex'),
    '03'.repeat(32),
    1000n
  );

  const merkleProof: MerkleProof = {
    root: Buffer.from('04'.repeat(32), 'hex'),
    pathElements: Array.from({ length: 20 }, (_, i) => Buffer.from((5 + i).toString(16).padStart(2, '0').repeat(32), 'hex')),
    pathIndices: Array.from({ length: 20 }, () => 0),
    leafIndex: 0
  };

  return {
    note,
    merkleProof,
    recipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    fee: 0n,
    ...overrides
  };
}

describe('Withdrawal proof cache', () => {
  it('reuses proof for repeated canonical inputs (cache hit)', async () => {
    const backend = new CountingBackend();
    const cache = new InMemoryProofCache();
    const request = makeRequest();

    // HASH_MODE: mock
    const first = await generateWithdrawalProof(request, backend, { cache, testOnlyAllowMockHash: MOCK_HASH_CONTEXT });
    const second = await generateWithdrawalProof(request, backend, { cache, testOnlyAllowMockHash: MOCK_HASH_CONTEXT });

    expect(backend.calls).toBe(1);
    expect(first.equals(second)).toBe(true);
  });

  it('misses cache when no cache adapter is provided', async () => {
    const backend = new CountingBackend();
    const request = makeRequest();

    // HASH_MODE: mock
    await generateWithdrawalProof(request, backend, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });
    await generateWithdrawalProof(request, backend, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });

    expect(backend.calls).toBe(2);
  });

  it('invalidates cached proof when public inputs change', async () => {
    const backend = new CountingBackend();
    const cache = new InMemoryProofCache();

    const firstRequest = makeRequest({ recipient: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' });
    const secondRequest = makeRequest({ recipient: 'GDJ7GPYZZGBS2HRRFZF6RESX24ZSP4QUIU2ICLM74F6L74WXP742IGOZ' });

    const witnessA = await ProofGenerator.prepareWitness(
      firstRequest.note,
      firstRequest.merkleProof,
      firstRequest.recipient,
      firstRequest.relayer,
      firstRequest.fee
    );
    const witnessB = await ProofGenerator.prepareWitness(
      secondRequest.note,
      secondRequest.merkleProof,
      secondRequest.recipient,
      secondRequest.relayer,
      secondRequest.fee
    );

    const keyA = buildWithdrawalProofCacheKey(firstRequest, witnessA);
    const keyB = buildWithdrawalProofCacheKey(secondRequest, witnessB);

    expect(keyA).not.toBe(keyB);

    // HASH_MODE: mock
    await generateWithdrawalProof(firstRequest, backend, { cache, testOnlyAllowMockHash: MOCK_HASH_CONTEXT });
    await generateWithdrawalProof(secondRequest, backend, { cache, testOnlyAllowMockHash: MOCK_HASH_CONTEXT });

    expect(backend.calls).toBe(2);
  });
});
