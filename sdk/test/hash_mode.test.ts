/**
 * ZK-106: Hash Mode Guard Tests
 *
 * Verifies that the mock-hash / live-hash boundary is explicit and enforced:
 *
 *   1. `HashMode` type and `MOCK_HASH_CONTEXT` constant are exported correctly.
 *   2. `assertNotMockHashMode` throws for mock mode without opt-in.
 *   3. `assertNotMockHashMode` passes for live mode and the opt-in bypass.
 *   4. `ProofGenerator.prepareWitness` stamps `hashMode: 'mock'` on the witness.
 *   5. `ProofGenerator.generate()` rejects a mock-hash witness without opt-in.
 *   6. `ProofGenerator.generate()` accepts a mock-hash witness with `testOnlyAllowMockHash: true`.
 *   7. The proving backend receives a canonicalized witness that does NOT contain `hashMode`.
 *
 * Wave Issue Key: ZK-106
 */

// HASH_MODE: mock (ZK-106) — all proof operations in this file use SHA-256 stand-ins;
// testOnlyAllowMockHash: true is set wherever generate() is exercised.

import { Note } from '../src/note';
import {
  MerkleProof,
  PreparedWitness,
  ProofGenerator,
  ProvingBackend,
  ProvingError,
  PREPARED_WITHDRAWAL_WITNESS_SCHEMA,
} from '../src/proof';
import {
  HashMode,
  MOCK_HASH_CONTEXT,
  assertNotMockHashMode,
} from '../src/hash_mode';
import { DEFAULT_DENOMINATION } from '../src/zk_constants';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const RECIPIENT = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
// Use 0x03...03 — safely below the BN254 field modulus (0x30...) for Merkle nodes and pool IDs
const r32 = Buffer.from('03'.repeat(32), 'hex');
const s31 = () => Buffer.from('01'.repeat(31), 'hex');
const p20 = () => Array.from({ length: 20 }, () => r32);

function makeNote(): Note {
  return new Note(s31(), s31(), '03'.repeat(32), DEFAULT_DENOMINATION);
}

function makeMerkleProof(): MerkleProof {
  return { root: r32, pathElements: p20(), leafIndex: 0 };
}

class StubBackend implements ProvingBackend {
  public receivedWitness: any = undefined;

  async generateProof(witness: any): Promise<Uint8Array> {
    this.receivedWitness = witness;
    return new Uint8Array(256).fill(0xcd);
  }
}

// ---------------------------------------------------------------------------
// HashMode type and MOCK_HASH_CONTEXT constant
// ---------------------------------------------------------------------------

describe('ZK-106: HashMode type and MOCK_HASH_CONTEXT', () => {
  it('MOCK_HASH_CONTEXT is the boolean true (used as testOnlyAllowMockHash value)', () => {
    expect(MOCK_HASH_CONTEXT).toBe(true);
  });

  it('HashMode values are the string literals mock and live', () => {
    const mock: HashMode = 'mock';
    const live: HashMode = 'live';
    expect(mock).toBe('mock');
    expect(live).toBe('live');
  });
});

// ---------------------------------------------------------------------------
// assertNotMockHashMode guard
// ---------------------------------------------------------------------------

describe('ZK-106: assertNotMockHashMode guard', () => {
  it('throws for mock mode without opt-in', () => {
    expect(() => assertNotMockHashMode('mock', 'test-location')).toThrow('[ZK-106]');
  });

  it('error message names the callsite location', () => {
    expect(() => assertNotMockHashMode('mock', 'ProofGenerator.generate'))
      .toThrow('ProofGenerator.generate');
  });

  it('error message mentions structural stand-in and opt-in flag', () => {
    expect(() => assertNotMockHashMode('mock', 'x'))
      .toThrow('testOnlyAllowMockHash: true');
  });

  it('does not throw for live mode', () => {
    expect(() => assertNotMockHashMode('live', 'test-location')).not.toThrow();
  });

  it('does not throw when mode is undefined (legacy witness)', () => {
    expect(() => assertNotMockHashMode(undefined, 'test-location')).not.toThrow();
  });

  it('does not throw for mock mode when allowed=true', () => {
    expect(() => assertNotMockHashMode('mock', 'test-location', true)).not.toThrow();
  });

  it('MOCK_HASH_CONTEXT bypasses the guard as testOnlyAllowMockHash', () => {
    expect(() => assertNotMockHashMode('mock', 'test', MOCK_HASH_CONTEXT)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// prepareWitness stamps hashMode: 'mock'
// ---------------------------------------------------------------------------

describe('ZK-106: ProofGenerator.prepareWitness stamps hashMode', () => {
  it("stamps hashMode: 'mock' on the returned PreparedWitness", async () => {
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );
    expect(witness.hashMode).toBe('mock');
  });

  it('hashMode is not in PREPARED_WITHDRAWAL_WITNESS_SCHEMA (circuit-facing schema is unchanged)', () => {
    expect(PREPARED_WITHDRAWAL_WITNESS_SCHEMA).not.toContain('hashMode');
  });

  it('circuit-facing fields are all present alongside hashMode', async () => {
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );
    const circuitFields = Object.keys(witness).filter((k) => k !== 'hashMode');
    expect(circuitFields.sort()).toEqual([...PREPARED_WITHDRAWAL_WITNESS_SCHEMA].sort());
  });
});

// ---------------------------------------------------------------------------
// generate() rejects mock-hash witnesses without opt-in
// ---------------------------------------------------------------------------

describe('ZK-106: ProofGenerator.generate() mock-hash guard', () => {
  it('throws ProvingError with code MOCK_HASH_MODE for a mock-hash witness', async () => {
    const backend = new StubBackend();
    const gen = new ProofGenerator(backend);
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );

    // Without opt-in: must throw
    await expect(gen.generate(witness)).rejects.toThrow(ProvingError);

    let caughtCode: string | undefined;
    try {
      await gen.generate(witness);
    } catch (e: any) {
      caughtCode = (e as ProvingError).code;
    }
    expect(caughtCode).toBe('MOCK_HASH_MODE');
  });

  it('error message identifies mock-hash mode and mentions opt-in flag', async () => {
    const gen = new ProofGenerator(new StubBackend());
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );

    await expect(gen.generate(witness)).rejects.toThrow('ZK-106');
    await expect(gen.generate(witness)).rejects.toThrow('testOnlyAllowMockHash');
  });

  it('backend is never invoked when mock-hash guard fires', async () => {
    const backend = new StubBackend();
    const gen = new ProofGenerator(backend);
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );

    await gen.generate(witness, { testOnlyAllowMockHash: true }).catch(() => {});
    const callsWithGuardFiring = 0; // guard fires = 0 invocations
    const backendReceived = backend.receivedWitness;

    // With guard bypassed, backend IS invoked
    await gen.generate(witness, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });
    expect(backend.receivedWitness).toBeDefined();

    // With guard active (no opt-in), backend is NOT invoked after a second gen
    const backend2 = new StubBackend();
    const gen2 = new ProofGenerator(backend2);
    await gen2.generate(witness).catch(() => {});
    expect(backend2.receivedWitness).toBeUndefined();
  });

  it('accepts mock-hash witness with testOnlyAllowMockHash: true', async () => {
    const backend = new StubBackend();
    const gen = new ProofGenerator(backend);
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );

    const proof = await gen.generate(witness, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });
    expect(proof).toBeInstanceOf(Uint8Array);
    expect(proof.length).toBe(256);
  });

  it('accepts a witness with no hashMode (legacy, undefined) without guard', async () => {
    const backend = new StubBackend();
    const gen = new ProofGenerator(backend);

    // Build a legacy witness manually (no hashMode field)
    const base = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );
    const { hashMode: _removed, ...legacyWitness } = base;

    // Legacy witness (hashMode=undefined) must NOT trigger the guard
    const proof = await gen.generate(legacyWitness);
    expect(proof).toBeInstanceOf(Uint8Array);
  });
});

// ---------------------------------------------------------------------------
// Backend receives canonicalized witness without hashMode
// ---------------------------------------------------------------------------

describe('ZK-106: canonicalized witness sent to backend has no hashMode', () => {
  it('backend receives only circuit-facing fields (hashMode is stripped)', async () => {
    const backend = new StubBackend();
    const gen = new ProofGenerator(backend);
    const witness = await ProofGenerator.prepareWitness(
      makeNote(),
      makeMerkleProof(),
      RECIPIENT,
    );

    await gen.generate(witness, { testOnlyAllowMockHash: MOCK_HASH_CONTEXT });

    expect(backend.receivedWitness).toBeDefined();
    expect(backend.receivedWitness).not.toHaveProperty('hashMode');
    const backendKeys = Object.keys(backend.receivedWitness).sort();
    expect(backendKeys).toEqual([...PREPARED_WITHDRAWAL_WITNESS_SCHEMA].sort());
  });
});
