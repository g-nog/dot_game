import { describe, expect, it } from 'vitest';
import { PATTERNS } from '../src/domain/constellation/patterns';
import { findMatches } from '../src/domain/constellation/matching';
import { createMatch, rematch, transition } from '../src/domain/constellation/state-machine';
import { candidates, score, reserved } from '../src/domain/constellation/selectors';
import type { Connection, Match, PatternId } from '../src/domain/constellation/model';
import { CONSTELLATION_MAP, EXAMPLE_ROUTES } from '../src/maps/constellation';
import { orientation, squaredDistance } from '../src/geometry/predicates';
import { isLegalLine } from '../src/geometry/legal-lines';
const players = [
  { name: 'Vega', color: '#75dded' },
  { name: 'Nova', color: '#ffbd79' },
] as const;
const fresh = () => createMatch(players, 0, 'A');
function graph(id: PatternId): Connection[] {
  return PATTERNS[id].edges.map(([a, b], i) => ({ id: `g${i}`, a: `v${a}`, b: `v${b}`, owner: 0 }));
}
describe('non-induced constellation matching', () => {
  for (const id of Object.keys(PATTERNS) as PatternId[]) {
    it(`recognizes ${id}, independent of geometry and deduplicates symmetries`, () => {
      const edges = graph(id);
      expect(findMatches(PATTERNS[id], edges)).toHaveLength(1);
      expect(
        findMatches(PATTERNS[id], [...edges, { id: 'branch', a: 'v0', b: 'extra', owner: 0 }])
          .length,
      ).toBeGreaterThanOrEqual(1);
      expect(findMatches(PATTERNS[id], edges.slice(1))).toHaveLength(0);
    });
  }
  it('rejects vertex reuse and preserves every distinct alternative', () => {
    expect(findMatches(PATTERNS.thread, graph('kite').slice(0, 3))).toHaveLength(0);
    const edges = [...graph('thread'), { id: 'extra', a: 'v2', b: 'v4', owner: 0 as const }];
    expect(findMatches(PATTERNS.thread, edges)).toHaveLength(2);
  });
  it('excludes opponent and reserved connections', () => {
    const edges = graph('thread');
    const match = { ...fresh(), edges };
    expect(candidates(match, 0)).toHaveLength(1);
    expect(candidates({ ...match, edges: edges.map((e) => ({ ...e, owner: 1 })) }, 0)).toHaveLength(
      0,
    );
    expect(
      candidates(
        {
          ...match,
          completions: [{ owner: 1, pattern: 'thread', edgeIds: ['g0'], vertices: [], turn: 1 }],
        },
        0,
      ),
    ).toHaveLength(0);
  });
});
describe('Meridian map', () => {
  it('has safe integer coordinates, touch spacing, no collinear triples', () => {
    const dots = CONSTELLATION_MAP.dots;
    for (let i = 0; i < dots.length; i++) {
      expect(Number.isSafeInteger(dots[i].x) && Number.isSafeInteger(dots[i].y)).toBe(true);
      for (let j = i + 1; j < dots.length; j++) {
        expect(squaredDistance(dots[i], dots[j])).toBeGreaterThanOrEqual(10000);
        for (let k = j + 1; k < dots.length; k++)
          expect(orientation(dots[i], dots[j], dots[k])).not.toBe(0);
      }
    }
  });
  it('supports both whole sequences interleaved on one occupied board', () => {
    const edges: Connection[] = [];
    for (let i = 0; i < 12; i++)
      for (const seq of ['A', 'B'] as const) {
        const [a, b] = EXAMPLE_ROUTES[seq][i];
        expect(isLegalLine(CONSTELLATION_MAP, edges, { a, b }), `${seq} ${a}-${b}`).toBe(true);
        edges.push({ id: `${seq}${i}`, owner: seq === 'A' ? 0 : 1, a, b });
      }
    for (const seq of ['A', 'B'] as const) {
      const roster = seq === 'A' ? ['thread', 'crown', 'halo'] : ['beacon', 'kite', 'lantern'];
      let start = 0;
      roster.forEach((id, i) => {
        expect(
          findMatches(
            PATTERNS[id as PatternId],
            edges.filter((e) => e.id.startsWith(seq)).slice(start, start + i + 3),
          ),
        ).toHaveLength(1);
        start += i + 3;
      });
    }
  });
});
describe('constellation match', () => {
  it('requires handoff and rejects invalid commands without mutation', () => {
    const start = fresh();
    expect(transition(start, { type: 'draw', a: 's1', b: 's1' })).toBe(start);
    const next = transition(start, { type: 'draw', a: 's1', b: 's2' });
    expect(next.phase.kind).toBe('handoff');
    expect(next.turns).toEqual([1, 0]);
    expect(transition(next, { type: 'draw', a: 's2', b: 's3' })).toBe(next);
    expect(transition(next, { type: 'end' }).active).toBe(1);
  });
  it('relocates both endpoints atomically; no-ops and opponent edges are rejected', () => {
    const start = { ...fresh(), edges: [{ id: 'old', owner: 0 as const, a: 's1', b: 's2' }] };
    expect(transition(start, { type: 'relocate', id: 'old', a: 's2', b: 's1' })).toBe(start);
    expect(transition(start, { type: 'relocate', id: 'old', a: 'missing', b: 's3' })).toBe(start);
    expect(
      transition({ ...start, active: 1 }, { type: 'relocate', id: 'old', a: 's3', b: 's4' }).edges,
    ).toEqual(start.edges);
    const next = transition(start, { type: 'relocate', id: 'old', a: 's7', b: 's8' });
    expect(next.edges).toEqual([{ id: 'e1', owner: 0, a: 's7', b: 's8' }]);
    expect(next.turns).toEqual([1, 0]);
  });
  it('plays complete matches with first-to-three precedence and rotates all four matchups', () => {
    let opening = fresh();
    const seen = [];
    for (let cycle = 0; cycle < 4; cycle++) {
      seen.push([opening.sequences[0], opening.starter]);
      let match = opening;
      const positions = [0, 0];
      while (match.phase.kind !== 'result') {
        const seat = match.active,
          seq = match.sequences[seat];
        const [a, b] = EXAMPLE_ROUTES[seq][positions[seat]++];
        const next = transition(match, { type: 'draw', a, b });
        expect(next).not.toBe(match);
        match = next;
        if (match.phase.kind === 'selection')
          match = transition(match, { type: 'claim', index: 0 });
        if (match.phase.kind === 'handoff') match = transition(match, { type: 'end' });
      }
      expect(score(match, match.starter)).toBe(3);
      expect(match.phase).toEqual({ kind: 'result', winner: match.starter, reason: 'three' });
      expect(reserved(match).size).toBe(19);
      opening = rematch(match);
    }
    expect(seen).toEqual([
      ['A', 0],
      ['B', 1],
      ['B', 0],
      ['A', 1],
    ]);
    expect(opening.turns).toEqual([0, 0]);
  });
  it('resolves ambiguous selection before final-turn comparison and prevents cascades', () => {
    const edges: Connection[] = [
      { id: 'a', owner: 0, a: 's1', b: 's2' },
      { id: 'b', owner: 0, a: 's2', b: 's3' },
      { id: 'c', owner: 0, a: 's3', b: 's9' },
      { id: 'd', owner: 0, a: 's3', b: 's8' },
    ];
    const start: Match = { ...fresh(), active: 0, turns: [19, 20], edges };
    let next = transition(start, { type: 'draw', a: 's23', b: 's24' });
    expect(next.phase.kind).toBe('selection');
    expect(transition(next, { type: 'end' })).toBe(next);
    expect(transition(next, { type: 'claim', index: 99 })).toBe(next);
    next = transition(next, { type: 'claim', index: 1 });
    expect(next.phase).toEqual({ kind: 'result', winner: 0, reason: 'limit' });
    expect(score(next, 0)).toBe(1);
    expect(reserved(next).size).toBe(3);
  });
});

it('first-to-three takes precedence when the winning action is also the final allowed turn', () => {
  let match = fresh();
  for (let i = 0; i < 11; i++) {
    for (const seq of ['A', 'B'] as const) {
      const [a, b] = EXAMPLE_ROUTES[seq][i];
      match = transition(match, { type: 'draw', a, b });
      if (match.phase.kind === 'selection') match = transition(match, { type: 'claim', index: 0 });
      match = transition(match, { type: 'end' });
    }
  }
  match = { ...match, turns: [19, 20] };
  const [a, b] = EXAMPLE_ROUTES.A[11];
  match = transition(match, { type: 'draw', a, b });
  expect(match.phase).toEqual({ kind: 'result', reason: 'three', winner: 0 });
});

it('completed loops can enclose playable stars and connect through shared boundary stars', () => {
  const dots = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 100, y: 0 },
    { id: 'c', x: 100, y: 100 },
    { id: 'd', x: 0, y: 100 },
    { id: 'inside', x: 40, y: 50 },
    { id: 'outside', x: 140, y: 150 },
  ];
  const map = { ...CONSTELLATION_MAP, dots };
  const edges = [
    ['a', 'b'],
    ['b', 'c'],
    ['c', 'd'],
    ['d', 'a'],
  ].map(([a, b], i) => ({ a, b, id: `loop${i}`, owner: 0 as const }));
  expect(findMatches(PATTERNS.crown, edges)).toHaveLength(1);
  expect(isLegalLine(map, edges, { a: 'inside', b: 'outside' })).toBe(false);
  expect(isLegalLine(map, edges, { a: 'inside', b: 'c' })).toBe(true);
  expect(isLegalLine(map, edges, { a: 'c', b: 'outside' })).toBe(true);
  expect(isLegalLine(map, edges, { a: 'inside', b: 'a' })).toBe(true);
});
