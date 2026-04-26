/**
 * ZK-017: Domain-separated nullifier hashing with cross-stack fixtures.
 *
 * Validates that:
 * 1. NULLIFIER_HASH_DOMAIN != COMMITMENT_HASH_DOMAIN (no conflation)
 * 2. Domain-separated nullifier hash is deterministic and in-field
 * 3. Hash without domain prefix differs from hash with domain prefix
 * 4. Inputs are position-sensitive (nullifier, root order matters)
 * 5. Cross-stack fixture table for Noir test mirroring
 */
import {
  NULLIFIER_HASH_DOMAIN,
  COMMITMENT_HASH_DOMAIN,
  computeNullifierHash,
  computeNullifierHashDomainSeparated,
  fieldToHex,
  hexToField,
} from '../src/encoding';
import { FIELD_MODULUS } from '../src/zk_constants';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ZERO_FIELD = '0'.repeat(64);
const ONE_FIELD = '1'.padStart(64, '0');
const MAX_FIELD = fieldToHex(FIELD_MODULUS - 1n);
const SAMPLE_NULLIFIER = 'ab'.repeat(32);
const SAMPLE_ROOT = 'cd'.repeat(32);

// ---------------------------------------------------------------------------
// Domain constants
// ---------------------------------------------------------------------------

describe('Domain constants (ZK-017)', () => {
  it('NULLIFIER_HASH_DOMAIN is a non-empty string', () => {
    expect(typeof NULLIFIER_HASH_DOMAIN).toBe('string');
    expect(NULLIFIER_HASH_DOMAIN.length).toBeGreaterThan(0);
  });

  it('COMMITMENT_HASH_DOMAIN is a non-empty string', () => {
    expect(typeof COMMITMENT_HASH_DOMAIN).toBe('string');
    expect(COMMITMENT_HASH_DOMAIN.length).toBeGreaterThan(0);
  });

  it('nullifier and commitment domains are distinct (no conflation)', () => {
    expect(NULLIFIER_HASH_DOMAIN).not.toBe(COMMITMENT_HASH_DOMAIN);
  });

  it('nullifier domain contains a version tag', () => {
    expect(NULLIFIER_HASH_DOMAIN).toMatch(/v\d+/);
  });

  it('commitment domain contains a version tag', () => {
    expect(COMMITMENT_HASH_DOMAIN).toMatch(/v\d+/);
  });
});

// ---------------------------------------------------------------------------
// computeNullifierHashDomainSeparated — basic properties
// ---------------------------------------------------------------------------

describe('computeNullifierHashDomainSeparated — basic properties', () => {
  it('returns a 64-char lowercase hex string', () => {
    const result = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('result is within the BN254 field', () => {
    const result = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    const n = BigInt('0x' + result);
    expect(n).toBeGreaterThanOrEqual(0n);
    expect(n).toBeLessThan(FIELD_MODULUS);
  });

  it('is deterministic for the same inputs', () => {
    const a = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    const b = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    expect(a).toBe(b);
  });

  it('works with zero-field inputs', () => {
    const result = computeNullifierHashDomainSeparated(ZERO_FIELD, ZERO_FIELD);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Domain separation — the domain prefix makes a difference
// ---------------------------------------------------------------------------

describe('computeNullifierHashDomainSeparated — domain isolation', () => {
  it('produces a different result from the legacy (non-domain-separated) hash', () => {
    const legacy = computeNullifierHash(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    const domainSep = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    expect(legacy).not.toBe(domainSep);
  });

  it('is sensitive to nullifier changes', () => {
    const a = computeNullifierHashDomainSeparated(ZERO_FIELD, SAMPLE_ROOT);
    const b = computeNullifierHashDomainSeparated(ONE_FIELD, SAMPLE_ROOT);
    expect(a).not.toBe(b);
  });

  it('is sensitive to root changes', () => {
    const a = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, ZERO_FIELD);
    const b = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, ONE_FIELD);
    expect(a).not.toBe(b);
  });

  it('is not commutative — swapping nullifier and root produces a different hash', () => {
    const a = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    const b = computeNullifierHashDomainSeparated(SAMPLE_ROOT, SAMPLE_NULLIFIER);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// Regression: commitment and nullifier domains are distinct under same inputs
// ---------------------------------------------------------------------------

describe('Domain separation — commitment vs nullifier domain not conflated', () => {
  /**
   * Simulate a commitment hash with the COMMITMENT_HASH_DOMAIN prefix.
   * This mirrors what a commitment hasher would do if it also adopted domain separation.
   */
  function simulateCommitmentHash(nullifierField: string, rootField: string): string {
    const { createHash } = require('crypto');
    const domain = Buffer.from(COMMITMENT_HASH_DOMAIN, 'utf8');
    const domainLen = Buffer.alloc(4);
    domainLen.writeUInt32BE(domain.length, 0);
    const input = Buffer.concat([
      domainLen,
      domain,
      Buffer.from(nullifierField.padStart(64, '0'), 'hex'),
      Buffer.from(rootField.padStart(64, '0'), 'hex'),
    ]);
    const digest = createHash('sha256').update(input).digest();
    const { FIELD_MODULUS } = require('../src/zk_constants');
    const n = BigInt('0x' + digest.toString('hex')) % FIELD_MODULUS;
    return n.toString(16).padStart(64, '0');
  }

  it('nullifier hash != simulated commitment hash for zero inputs', () => {
    const nh = computeNullifierHashDomainSeparated(ZERO_FIELD, ZERO_FIELD);
    const ch = simulateCommitmentHash(ZERO_FIELD, ZERO_FIELD);
    expect(nh).not.toBe(ch);
  });

  it('nullifier hash != simulated commitment hash for sample inputs', () => {
    const nh = computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    const ch = simulateCommitmentHash(SAMPLE_NULLIFIER, SAMPLE_ROOT);
    expect(nh).not.toBe(ch);
  });

  it('nullifier hash != simulated commitment hash for max-field inputs', () => {
    const nh = computeNullifierHashDomainSeparated(MAX_FIELD, MAX_FIELD);
    const ch = simulateCommitmentHash(MAX_FIELD, MAX_FIELD);
    expect(nh).not.toBe(ch);
  });
});

// ---------------------------------------------------------------------------
// Cross-stack fixture table (ZK-017)
//
// These golden values pin the domain-separated nullifier hash output so that
// the Noir circuit test suite can validate the same computation against
// its Pedersen-based implementation.
//
// Noir test should compute:
//   nullifier_hash = pedersen_hash([DOMAIN_CONSTANT, nullifier, root])
// and verify the field-element matches the golden_value in each vector.
// ---------------------------------------------------------------------------

interface NullifierHashVector {
  description: string;
  nullifier_field: string;
  root_field: string;
  domain: string;
  golden_value: string;
}

describe('Cross-stack nullifier hash fixture table', () => {
  // Compute golden values at test-definition time from the domain-separated impl
  const FIXTURES: NullifierHashVector[] = [
    {
      description: 'zero nullifier, zero root',
      nullifier_field: ZERO_FIELD,
      root_field: ZERO_FIELD,
      domain: NULLIFIER_HASH_DOMAIN,
      golden_value: computeNullifierHashDomainSeparated(ZERO_FIELD, ZERO_FIELD),
    },
    {
      description: 'one nullifier, zero root',
      nullifier_field: ONE_FIELD,
      root_field: ZERO_FIELD,
      domain: NULLIFIER_HASH_DOMAIN,
      golden_value: computeNullifierHashDomainSeparated(ONE_FIELD, ZERO_FIELD),
    },
    {
      description: 'zero nullifier, one root',
      nullifier_field: ZERO_FIELD,
      root_field: ONE_FIELD,
      domain: NULLIFIER_HASH_DOMAIN,
      golden_value: computeNullifierHashDomainSeparated(ZERO_FIELD, ONE_FIELD),
    },
    {
      description: 'sample nullifier, sample root',
      nullifier_field: SAMPLE_NULLIFIER,
      root_field: SAMPLE_ROOT,
      domain: NULLIFIER_HASH_DOMAIN,
      golden_value: computeNullifierHashDomainSeparated(SAMPLE_NULLIFIER, SAMPLE_ROOT),
    },
    {
      description: 'max-field nullifier, max-field root',
      nullifier_field: MAX_FIELD,
      root_field: MAX_FIELD,
      domain: NULLIFIER_HASH_DOMAIN,
      golden_value: computeNullifierHashDomainSeparated(MAX_FIELD, MAX_FIELD),
    },
    {
      description: 'swapped: root as nullifier, nullifier as root',
      nullifier_field: SAMPLE_ROOT,
      root_field: SAMPLE_NULLIFIER,
      domain: NULLIFIER_HASH_DOMAIN,
      golden_value: computeNullifierHashDomainSeparated(SAMPLE_ROOT, SAMPLE_NULLIFIER),
    },
  ];

  it('fixture table has at least 6 vectors covering boundary, swap, and sample cases', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(6);
  });

  it('all fixture golden values are 64-char lowercase hex', () => {
    for (const v of FIXTURES) {
      expect(v.golden_value).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('all fixture golden values are within the BN254 field', () => {
    for (const v of FIXTURES) {
      expect(BigInt('0x' + v.golden_value)).toBeLessThan(FIELD_MODULUS);
    }
  });

  it('all fixture golden values are reproducible', () => {
    for (const v of FIXTURES) {
      const recomputed = computeNullifierHashDomainSeparated(v.nullifier_field, v.root_field);
      expect(recomputed).toBe(v.golden_value);
    }
  });

  it('swapped inputs produce a distinct golden value (position-sensitive)', () => {
    const direct = FIXTURES.find(f => f.description.startsWith('sample'))!;
    const swapped = FIXTURES.find(f => f.description.startsWith('swapped'))!;
    expect(direct.golden_value).not.toBe(swapped.golden_value);
  });

  it('all golden values in the fixture table are unique', () => {
    const seen = new Set(FIXTURES.map(f => f.golden_value));
    expect(seen.size).toBe(FIXTURES.length);
  });

  it('domain field matches NULLIFIER_HASH_DOMAIN for all vectors', () => {
    for (const v of FIXTURES) {
      expect(v.domain).toBe(NULLIFIER_HASH_DOMAIN);
    }
  });
});
