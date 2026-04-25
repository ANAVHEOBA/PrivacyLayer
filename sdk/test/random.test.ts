import { Note } from '../src/note';
import {
  secureRandomBytesForRuntime,
  SecureRandomUnavailableError,
  withSecureRandomSourceForTesting,
} from '../src/random';

describe('secure randomness boundary', () => {
  test('Note.generate uses the injectable secure randomness boundary', () => {
    let calls = 0;
    const note = withSecureRandomSourceForTesting(
      {
        randomBytes(length: number): Buffer {
          calls += 1;
          return Buffer.alloc(length, calls);
        },
      },
      () => Note.generate('11'.repeat(32), 42n)
    );

    expect(calls).toBe(2);
    expect(note.nullifier).toEqual(Buffer.alloc(31, 1));
    expect(note.secret).toEqual(Buffer.alloc(31, 2));
  });

  test('prefers browser Web Crypto getRandomValues when available', () => {
    const bytes = secureRandomBytesForRuntime(
      4,
      {
        getRandomValues(array) {
          const view = array as Uint8Array;
          view.set([9, 8, 7, 6]);
          return array;
        },
      },
      () => Buffer.alloc(4, 1)
    );

    expect(bytes).toEqual(Buffer.from([9, 8, 7, 6]));
  });

  test('falls back to Node crypto source when Web Crypto is absent', () => {
    const bytes = secureRandomBytesForRuntime(3, undefined, (length) => Buffer.alloc(length, 5));

    expect(bytes).toEqual(Buffer.from([5, 5, 5]));
  });

  test('fails clearly when no secure randomness source exists', () => {
    expect(() => secureRandomBytesForRuntime(3, undefined, undefined)).toThrow(SecureRandomUnavailableError);
  });

  test('rejects deterministic testing sources that return the wrong length', () => {
    expect(() =>
      withSecureRandomSourceForTesting(
        {
          randomBytes: () => Buffer.alloc(1),
        },
        () => Note.generate('22'.repeat(32), 1n)
      )
    ).toThrow(SecureRandomUnavailableError);
  });
});
