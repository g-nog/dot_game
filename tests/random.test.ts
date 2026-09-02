import { describe, expect, it } from 'vitest';
import { cryptoDie, cryptoSeed, seededRandom } from '../src/generation/random';

describe('randomness boundaries', () => {
  it('replays seeded board randomness deterministically', () => {
    const first = seededRandom(123);
    const second = seededRandom(123);
    expect(Array.from({ length: 10 }, first)).toEqual(Array.from({ length: 10 }, second));
  });

  it('reads a uint32 board seed from injected crypto', () => {
    const fake = {
      getRandomValues<T extends ArrayBufferView | null>(array: T): T {
        (array as Uint32Array)[0] = 987;
        return array;
      },
    };
    expect(cryptoSeed(fake)).toBe(987);
  });

  it('uses rejection sampling for unbiased die values from one through six', () => {
    const values = [0xffffffff, 0];
    const fake = {
      getRandomValues<T extends ArrayBufferView | null>(array: T): T {
        (array as Uint32Array)[0] = values.shift() ?? 0;
        return array;
      },
    };
    expect(cryptoDie(fake)).toBe(1);
  });
});
