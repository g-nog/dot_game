export type RandomSource = () => number;

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function cryptoSeed(cryptoApi: Pick<Crypto, 'getRandomValues'> = crypto): number {
  return cryptoApi.getRandomValues(new Uint32Array(1))[0];
}

export function cryptoDie(cryptoApi: Pick<Crypto, 'getRandomValues'> = crypto): number {
  const limit = 0x100000000 - (0x100000000 % 6);
  const values = new Uint32Array(1);
  do cryptoApi.getRandomValues(values);
  while (values[0] >= limit);
  return (values[0] % 6) + 1;
}
