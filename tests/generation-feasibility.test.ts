import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MATCH_SIZE_DOTS, type MatchSize } from '../src/domain/triangle-duel/model';
import { isLegalLine } from '../src/geometry/legal-lines';
import { findCompatibleLineSequence } from '../src/geometry/quota-feasibility';
import { generateDotField, validateDotField } from '../src/generation/dot-field';

describe('seeded dot-field generation', () => {
  it('is deterministic and valid for every match size', () => {
    for (const size of ['quick', 'standard', 'extended'] as MatchSize[]) {
      const first = generateDotField(size, 123456);
      expect(first).toEqual(generateDotField(size, 123456));
      expect(first.dots).toHaveLength(MATCH_SIZE_DOTS[size]);
      expect(validateDotField(first, size)).toEqual({ valid: true });
    }
  });

  it('preserves count, integer coordinates, margins, spacing, and no collinear triples across seeds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.constantFrom<MatchSize>('quick', 'standard', 'extended'),
        (seed, size) => {
          const field = generateDotField(size, seed);
          expect(validateDotField(field, size)).toEqual({ valid: true });
          expect(
            field.dots.every((dot) => Number.isInteger(dot.x) && Number.isInteger(dot.y)),
          ).toBe(true);
        },
      ),
      { seed: 8312026, numRuns: 60 },
    );
  });
});

describe('quota feasibility', () => {
  it('returns a witness of the requested length that stays legal in order', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 1, max: 6 }),
        (seed, quota) => {
          const field = generateDotField('quick', seed);
          const witness = findCompatibleLineSequence(field, [], quota);
          expect(witness).toBeDefined();
          expect(witness).toHaveLength(quota);
          const committed: { a: string; b: string }[] = [];
          for (const candidate of witness ?? []) {
            expect(isLegalLine(field, committed, candidate)).toBe(true);
            committed.push(candidate);
          }
        },
      ),
      { seed: 99173, numRuns: 30 },
    );
  });
});
