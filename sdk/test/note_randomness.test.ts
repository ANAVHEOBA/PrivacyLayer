/// <reference types="jest" />
import {
  Note,
  RandomnessSource,
  RuntimeRandomnessSource,
  resetDefaultRandomnessSource,
  setDefaultRandomnessSource
} from '../src/note';

class FixedRandomnessSource implements RandomnessSource {
  constructor(private readonly byte: number) {}

  randomBytes(length: number): Uint8Array {
    return new Uint8Array(length).fill(this.byte);
  }
}

describe('Note randomness boundary', () => {
  const poolId = '11'.repeat(32);

  afterEach(() => {
    resetDefaultRandomnessSource();
  });

  it('supports runtime crypto selection in browser-like environments', () => {
    const browserLikeCrypto = {
      getRandomValues<T extends ArrayBufferView | null>(array: T): T {
        if (!array) {
          return array;
        }
        const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        bytes.fill(0xaa);
        return array;
      }
    };

    const source = new RuntimeRandomnessSource({
      runtime: { crypto: browserLikeCrypto },
      enableNodeFallback: false
    });

    const out = source.randomBytes(8);
    expect(Buffer.from(out).toString('hex')).toBe('aa'.repeat(8));
  });

  it('fails clearly when secure randomness is unavailable', () => {
    const source = new RuntimeRandomnessSource({
      runtime: {},
      enableNodeFallback: false
    });

    expect(() => source.randomBytes(31)).toThrow('Secure randomness unavailable');
  });

  it('uses injected production randomness source in note generation', () => {
    const source = new FixedRandomnessSource(0x7b);
    setDefaultRandomnessSource(source);

    const note = Note.generate(poolId, 42n);

    expect(note.nullifier.equals(Buffer.alloc(31, 0x7b))).toBe(true);
    expect(note.secret.equals(Buffer.alloc(31, 0x7b))).toBe(true);
  });

  it('keeps deterministic derivation isolated and stable for fixtures', () => {
    const a = Note.deriveDeterministic('fixture-seed', poolId, 42n);
    const b = Note.deriveDeterministic('fixture-seed', poolId, 42n);
    const c = Note.deriveDeterministic('other-seed', poolId, 42n);

    expect(a.serialize()).toBe(b.serialize());
    expect(a.serialize()).not.toBe(c.serialize());
  });
});
