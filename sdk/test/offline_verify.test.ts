/**
 * ZK-098: Manifest-Aware Off-Chain Verification Helper Tests
 *
 * Covers:
 *   - Successful verification when artifacts, schema, and proof are all valid
 *   - BAD_ARTIFACT: bytecode mismatch, missing circuit entry, path mismatch
 *   - BAD_SCHEMA: raw string[] inputs, manifest schema divergence
 *   - BAD_PROOF: backend returns false, backend throws
 */

/// <reference types="jest" />
import fs from 'fs';
import path from 'path';
import {
  verifyWithManifest,
  OfflineVerificationError,
  OfflineVerificationFailureCategory,
} from '../src/offline_verify';
import {
  NoirArtifacts,
  ZkArtifactManifest,
} from '../src/backends/noir';
import { VerifyingBackend } from '../src/proof';
import { WithdrawalPublicInputs } from '../src/encoding';

// ---------------------------------------------------------------------------
// Fixture setup
// ---------------------------------------------------------------------------

const artifactsDir = path.resolve(__dirname, '../../artifacts/zk');

let manifest: ZkArtifactManifest;
let withdrawArtifact: any;

beforeAll(() => {
  manifest = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'manifest.json'), 'utf8'));
  withdrawArtifact = JSON.parse(fs.readFileSync(path.join(artifactsDir, 'withdraw.json'), 'utf8'));
});

function buildArtifacts(overrides: Partial<NoirArtifacts> = {}): NoirArtifacts {
  return {
    acir: Buffer.from(withdrawArtifact.bytecode, 'utf8'),
    bytecode: withdrawArtifact.bytecode,
    abi: withdrawArtifact.abi,
    name: withdrawArtifact.name,
    ...overrides,
  };
}

// Use values that are safely below the BN254 field modulus (which starts ~0x30...).
// Padding with 00 ensures they're small positive integers.
const F0 = '00'.repeat(32);
const F1 = '00'.repeat(31) + '01';
const F2 = '00'.repeat(31) + '02';
const F3 = '00'.repeat(31) + '03';
const F4 = '00'.repeat(31) + '04';

function makePublicInputs(overrides: Partial<WithdrawalPublicInputs> = {}): WithdrawalPublicInputs {
  return {
    pool_id: F1,
    root: F2,
    nullifier_hash: F3,
    recipient: F4,
    amount: '0000000000000000000000000000000000000000000000000000000000000064',
    relayer: F0,
    fee: F0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock backends
// ---------------------------------------------------------------------------

class AcceptingBackend implements VerifyingBackend {
  async verifyProof(_proof: Uint8Array, _publicInputs: string[], _artifacts: any): Promise<boolean> {
    return true;
  }
}

class RejectingBackend implements VerifyingBackend {
  async verifyProof(_proof: Uint8Array, _publicInputs: string[], _artifacts: any): Promise<boolean> {
    return false;
  }
}

class ThrowingBackend implements VerifyingBackend {
  constructor(private readonly message: string = 'backend exploded') {}
  async verifyProof(_proof: Uint8Array, _publicInputs: string[], _artifacts: any): Promise<boolean> {
    throw new Error(this.message);
  }
}

const VALID_PROOF = new Uint8Array(64).fill(0xab);
const CIRCUIT_NAME = 'withdraw';
const ARTIFACT_PATH = 'withdraw.json';

// ---------------------------------------------------------------------------
// Helper: assert OfflineVerificationError with expected category
// ---------------------------------------------------------------------------
async function expectCategory(
  promise: Promise<unknown>,
  category: OfflineVerificationFailureCategory,
): Promise<void> {
  let caught: unknown;
  try {
    await promise;
    throw new Error('Expected OfflineVerificationError but none was thrown');
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(OfflineVerificationError);
  expect((caught as OfflineVerificationError).category).toBe(category);
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('ZK-098: verifyWithManifest — success path', () => {
  it('resolves true when artifacts, schema, and proof are all valid', async () => {
    const result = await verifyWithManifest(
      VALID_PROOF,
      makePublicInputs(),
      buildArtifacts(),
      manifest,
      CIRCUIT_NAME,
      new AcceptingBackend(),
      { artifactPath: ARTIFACT_PATH },
    );
    expect(result).toBe(true);
  });

  it('succeeds without an explicit artifactPath option', async () => {
    const result = await verifyWithManifest(
      VALID_PROOF,
      makePublicInputs(),
      buildArtifacts(),
      manifest,
      CIRCUIT_NAME,
      new AcceptingBackend(),
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('ZK-098: verifyWithManifest — BAD_ARTIFACT', () => {
  it('rejects when the circuit name is absent from the manifest', async () => {
    const badManifest: ZkArtifactManifest = {
      ...manifest,
      circuits: { commitment: manifest.circuits.commitment },
    };
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        badManifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      ),
      'BAD_ARTIFACT',
    );
  });

  it('rejects on bytecode hash mismatch', async () => {
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts({ bytecode: withdrawArtifact.bytecode + '\n' }),
        manifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      ),
      'BAD_ARTIFACT',
    );
  });

  it('rejects on ABI hash mismatch', async () => {
    const tamperedAbi = { ...withdrawArtifact.abi, _tampered: true };
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts({ abi: tamperedAbi }),
        manifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      ),
      'BAD_ARTIFACT',
    );
  });

  it('rejects on artifact path mismatch', async () => {
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        manifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
        { artifactPath: 'unexpected_path.json' },
      ),
      'BAD_ARTIFACT',
    );
  });

  it('surfaces the original ArtifactManifestError cause', async () => {
    const badManifest: ZkArtifactManifest = {
      ...manifest,
      circuits: {},
    };
    let caught: unknown;
    try {
      await verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        badManifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(OfflineVerificationError);
    const err = caught as OfflineVerificationError;
    expect(err.category).toBe('BAD_ARTIFACT');
    expect(err.cause).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe('ZK-098: verifyWithManifest — BAD_SCHEMA', () => {
  it('rejects a raw string[] instead of named public inputs', async () => {
    // Cast through unknown to simulate a caller passing the wrong type
    const rawArray = ['pool_id', 'root', 'nullifier_hash', 'recipient', 'amount', 'relayer', 'fee'] as unknown as WithdrawalPublicInputs;
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        rawArray,
        buildArtifacts(),
        manifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      ),
      'BAD_SCHEMA',
    );
  });

  it('rejects when the manifest declares a schema that diverges from the SDK schema', async () => {
    const badManifest: ZkArtifactManifest = {
      ...manifest,
      circuits: {
        ...manifest.circuits,
        [CIRCUIT_NAME]: {
          ...manifest.circuits[CIRCUIT_NAME]!,
          public_input_schema: [
            'root',      // wrong order — root before pool_id
            'pool_id',
            'nullifier_hash',
            'recipient',
            'amount',
            'relayer',
            'fee',
          ],
        },
      },
    };

    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        badManifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      ),
      'BAD_SCHEMA',
    );
  });

  it('rejects when the manifest schema has fewer fields than the SDK schema', async () => {
    const badManifest: ZkArtifactManifest = {
      ...manifest,
      circuits: {
        ...manifest.circuits,
        [CIRCUIT_NAME]: {
          ...manifest.circuits[CIRCUIT_NAME]!,
          public_input_schema: ['pool_id', 'root', 'nullifier_hash'],
        },
      },
    };

    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        badManifest,
        CIRCUIT_NAME,
        new AcceptingBackend(),
      ),
      'BAD_SCHEMA',
    );
  });

  it('skips schema check when manifest circuit has no public_input_schema', async () => {
    const manifestWithoutSchema: ZkArtifactManifest = {
      ...manifest,
      circuits: {
        ...manifest.circuits,
        [CIRCUIT_NAME]: {
          ...manifest.circuits[CIRCUIT_NAME]!,
          public_input_schema: undefined,
        },
      },
    };

    const result = await verifyWithManifest(
      VALID_PROOF,
      makePublicInputs(),
      buildArtifacts(),
      manifestWithoutSchema,
      CIRCUIT_NAME,
      new AcceptingBackend(),
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('ZK-098: verifyWithManifest — BAD_PROOF', () => {
  it('throws BAD_PROOF when the backend returns false', async () => {
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        manifest,
        CIRCUIT_NAME,
        new RejectingBackend(),
      ),
      'BAD_PROOF',
    );
  });

  it('throws BAD_PROOF when the backend throws an error', async () => {
    await expectCategory(
      verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        manifest,
        CIRCUIT_NAME,
        new ThrowingBackend('groth16 failure'),
      ),
      'BAD_PROOF',
    );
  });

  it('preserves the backend error as the cause', async () => {
    let caught: unknown;
    try {
      await verifyWithManifest(
        VALID_PROOF,
        makePublicInputs(),
        buildArtifacts(),
        manifest,
        CIRCUIT_NAME,
        new ThrowingBackend('inner error'),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(OfflineVerificationError);
    const err = caught as OfflineVerificationError;
    expect(err.category).toBe('BAD_PROOF');
    expect((err.cause as Error).message).toBe('inner error');
  });
});

// ---------------------------------------------------------------------------

describe('ZK-098: OfflineVerificationError — class invariants', () => {
  it('has name OfflineVerificationError', () => {
    const err = new OfflineVerificationError('msg', 'BAD_PROOF');
    expect(err.name).toBe('OfflineVerificationError');
  });

  it('exposes category on the instance', () => {
    const categories: OfflineVerificationFailureCategory[] = ['BAD_ARTIFACT', 'BAD_SCHEMA', 'BAD_PROOF'];
    for (const cat of categories) {
      const err = new OfflineVerificationError('test', cat);
      expect(err.category).toBe(cat);
    }
  });

  it('is an instance of Error', () => {
    const err = new OfflineVerificationError('test', 'BAD_SCHEMA');
    expect(err).toBeInstanceOf(Error);
  });
});
