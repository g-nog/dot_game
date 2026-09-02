import { bench, describe } from 'vitest';
import { enumerateLegalLines } from '../../src/geometry/legal-lines';
import { hasCompatibleLineSequence } from '../../src/geometry/quota-feasibility';
import { generateDotField } from '../../src/generation/dot-field';

describe('Extended-field quota search', () => {
  const field = generateDotField('extended', 20260831);
  const committed: { a: string; b: string }[] = [];
  for (let index = 0; index < 30; index += 1) {
    const next = enumerateLegalLines(field, committed)[0];
    if (!next) break;
    committed.push(next);
  }
  bench(
    'representative mid-match quota six',
    () => {
      hasCompatibleLineSequence(field, committed, 6);
    },
    { iterations: 50 },
  );
});
