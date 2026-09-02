import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CommittedLine } from '../src/domain/triangle-duel/model';
import { enumerateLegalLines, isLegalLine } from '../src/geometry/legal-lines';
import {
  orientation,
  pointStrictlyInTriangle,
  segmentsIntersectOrTouch,
} from '../src/geometry/predicates';
import { claimsCompletedByLine } from '../src/geometry/scoring-triangles';
import {
  crossingField,
  interiorDotField,
  multiClaimField,
  throughDotField,
  triangleField,
} from './fixtures/dot-fields';

const line = (
  a: string,
  b: string,
  playerId: 'player-1' | 'player-2' = 'player-1',
): CommittedLine => ({ a, b, playerId, turn: 1 });

describe('exact geometry and legal lines', () => {
  it('allows shared endpoints but rejects crossings, endpoint-on-interior touches, overlaps, and passage through a third dot', () => {
    expect(isLegalLine(crossingField, [line('a', 'b')], { a: 'a', b: 'c' })).toBe(true);
    expect(isLegalLine(crossingField, [line('a', 'b')], { a: 'c', b: 'd' })).toBe(false);
    expect(isLegalLine(throughDotField, [], { a: 'a', b: 'b' })).toBe(false);
    expect(isLegalLine(throughDotField, [line('a', 'middle')], { a: 'a', b: 'b' })).toBe(false);
    expect(isLegalLine(throughDotField, [line('a', 'b')], { a: 'middle', b: 'b' })).toBe(false);
  });

  it('uses strict containment so boundary points are not interior', () => {
    const [a, b, c] = triangleField.dots;
    expect(pointStrictlyInTriangle({ id: 'p', x: 500, y: 400 }, a, b, c)).toBe(true);
    expect(pointStrictlyInTriangle({ id: 'p', x: 500, y: 200 }, a, b, c)).toBe(false);
  });

  it('keeps orientation antisymmetric and intersection symmetric', () => {
    const dots = fc.record({
      id: fc.string(),
      x: fc.integer({ min: -1000, max: 1000 }),
      y: fc.integer({ min: -1000, max: 1000 }),
    });
    fc.assert(
      fc.property(dots, dots, dots, dots, (a, b, c, d) => {
        expect(orientation(a, b, c)).toBe(-orientation(b, a, c));
        expect(segmentsIntersectOrTouch(a, b, c, d)).toBe(segmentsIntersectOrTouch(c, d, a, b));
      }),
      { seed: 20260831, numRuns: 300 },
    );
  });
});

describe('scoring triangles', () => {
  it('claims a simple three-direct-line triangle', () => {
    const lines = [line('a', 'c'), line('b', 'c'), line('a', 'b')];
    expect(claimsCompletedByLine(triangleField, lines, lines[2], [], 'player-1', 1)).toHaveLength(
      1,
    );
  });

  it('rejects a triangle containing an interior dot', () => {
    const lines = [line('a', 'c'), line('b', 'c'), line('a', 'b')];
    expect(claimsCompletedByLine(interiorDotField, lines, lines[2], [], 'player-1', 1)).toEqual([]);
  });

  it('awards every triangle in a multi-claim and deduplicates prior claims', () => {
    const lines = [
      line('a', 'c'),
      line('b', 'c'),
      line('a', 'd'),
      line('b', 'd'),
      line('a', 'b', 'player-2'),
    ];
    const claims = claimsCompletedByLine(multiClaimField, lines, lines[4], [], 'player-2', 3);
    expect(claims).toHaveLength(2);
    expect(new Set(claims.map((claim) => claim.key)).size).toBe(2);
    expect(claims.every((claim) => claim.playerId === 'player-2')).toBe(true);
    expect(claimsCompletedByLine(multiClaimField, lines, lines[4], claims, 'player-2', 3)).toEqual(
      [],
    );
  });

  it('enumerates each endpoint pair once', () => {
    expect(enumerateLegalLines(triangleField, [])).toHaveLength(3);
  });
});
