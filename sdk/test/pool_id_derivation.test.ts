/// <reference types="jest" />
import { deriveCanonicalPoolId } from '../src/encoding';

const NETWORK_DOMAIN = '11'.repeat(32);

describe('Canonical pool id derivation (ZK-121)', () => {
  it('derives expected XLM-native fixture id', () => {
    const poolId = deriveCanonicalPoolId(
      { kind: 'native', assetCode: 'XLM' },
      1_000_000_000n,
      NETWORK_DOMAIN
    );
    expect(poolId).toBe('00a772bf8f03f5a995327dd2ee5d43f469cbc26a1fffd09d5bd922e416df4617');
  });

  it('derives expected token-contract fixture id', () => {
    const poolId = deriveCanonicalPoolId(
      {
        kind: 'contract',
        contractId: 'CB7F6F5F7F6F8F7F9F7FAF7FBF7FCF7FDF7FEF7FFF7F0F7F1F7F2F7F3F7F4F',
      },
      100_000_000n,
      NETWORK_DOMAIN
    );
    expect(poolId).toBe('007bb135ca6e5efd406a998ac67ffa4fce7fc65dc74b640955b951ad1cef2a99');
  });
});
