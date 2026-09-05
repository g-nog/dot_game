import { EXAMPLE_ROUTES } from '../src/maps/constellation';
import { expect, it } from 'vitest';
import fc from 'fast-check';
import { createMatch, transition } from '../src/domain/constellation/state-machine';
import {
  availableActions,
  candidates,
  reserved,
  score,
  unfinished,
} from '../src/domain/constellation/selectors';
import { isLegalLine } from '../src/geometry/legal-lines';
import { lineKey } from '../src/geometry/model';
import type { Match, StarMap } from '../src/domain/constellation/model';
const players = [
  { name: 'One', color: '#79d9e8' },
  { name: 'Two', color: '#ffbe83' },
] as const;
const base = () => createMatch(players, 0, 'A');
const lineMap: StarMap = {
  id: 'line-fixture',
  version: 1,
  width: 100,
  height: 100,
  margin: 0,
  minimumSeparation: 1,
  dots: [0, 1, 2, 3].map((i) => ({ id: `v${i}`, x: i * 20, y: 20 })),
};
const path = [0, 1, 2].map((i) => ({ id: `p${i}`, a: `v${i}`, b: `v${i + 1}`, owner: 0 as const }));
it('a forced pass scores a prepared target before blocked-board comparison', () => {
  const before: Match = {
    ...base(),
    map: lineMap,
    edges: path,
    active: 1,
    phase: { kind: 'handoff' },
  };
  const next = transition(before, { type: 'end' });
  expect(next.turns).toEqual([1, 0]);
  expect(score(next, 0)).toBe(1);
  expect(next.notice).toContain('Forced pass');
  expect(next.phase).toEqual({ kind: 'result', winner: 0, reason: 'blocked' });
});
it('a player without actions passes explicitly while the opponent has a prepared target', () => {
  const before: Match = {
    ...base(),
    map: lineMap,
    edges: path,
    active: 0,
    phase: { kind: 'handoff' },
  };
  const pass = transition(before, { type: 'end' });
  expect(pass.active).toBe(1);
  expect(pass.turns).toEqual([0, 1]);
  expect(pass.phase.kind).toBe('handoff');
  expect(pass.notice).toContain('Forced pass');
  expect(transition(pass, { type: 'draw', a: 'v0', b: 'v1' })).toBe(pass);
  const next = transition(pass, { type: 'end' });
  expect(score(next, 0)).toBe(1);
  expect(next.phase.kind).toBe('result');
});
it('a fully blocked board with no target compares totals as a draw', () => {
  const before: Match = {
    ...base(),
    map: lineMap,
    edges: path.map((e, i) => ({ ...e, owner: i === 1 ? 1 : 0 })),
    active: 0,
    phase: { kind: 'handoff' },
  };
  const next = transition(before, { type: 'end' });
  expect(next.phase).toEqual({ kind: 'result', winner: null, reason: 'blocked' });
});
it('blocked ambiguous prepared targets still require a choice', () => {
  const map: StarMap = {
    ...lineMap,
    id: 'k4',
    dots: [
      { id: 'a', x: 0, y: 0 },
      { id: 'b', x: 100, y: 0 },
      { id: 'c', x: 50, y: 100 },
      { id: 'd', x: 50, y: 30 },
    ],
  };
  const edges = map.dots.flatMap((a, i) =>
    map.dots
      .slice(i + 1)
      .map((b) => ({ id: lineKey(a.id, b.id), a: a.id, b: b.id, owner: 0 as const })),
  );
  const before: Match = { ...base(), map, edges, active: 1, phase: { kind: 'handoff' } };
  expect(availableActions(before, 0)).toEqual({ draws: [], relocations: [] });
  const next = transition(before, { type: 'end' });
  expect(next.phase.kind).toBe('selection');
  expect(next.turns).toEqual([1, 0]);
  expect(transition(next, { type: 'end' })).toBe(next);
  expect(transition(next, { type: 'claim', index: 0 }).phase.kind).toBe('result');
});
it('a prepared next target waits for the next owner turn and completed edges cannot move', () => {
  const edge = (id: string, a: string, b: string) => ({ id, a, b, owner: 0 as const });
  const before: Match = {
    ...base(),
    edges: [
      edge('a', 's1', 's2'),
      edge('b', 's2', 's3'),
      edge('c', 's3', 's9'),
      edge('d', 's13', 's14'),
      edge('e', 's14', 's20'),
      edge('f', 's20', 's19'),
      edge('g', 's19', 's13'),
    ],
  };
  let next = transition(before, { type: 'draw', a: 's23', b: 's24' });
  if (next.phase.kind === 'selection') {
    const index = next.phase.candidates.findIndex((c) => c.edgeIds.join(',') === 'a,b,c');
    next = transition(next, { type: 'claim', index });
  }
  expect(score(next, 0)).toBe(1);
  expect(candidates(next, 0)).toHaveLength(1);
  next = transition(next, { type: 'end' });
  next = transition(next, { type: 'draw', a: 's5', b: 's6' });
  next = transition(next, { type: 'end' });
  expect(transition(next, { type: 'relocate', id: 'a', a: 's7', b: 's8' })).toBe(next);
  next = transition(next, { type: 'draw', a: 's7', b: 's8' });
  expect(score(next, 0)).toBe(2);
});
it('blocking a planned edge permits recovery by relocating to a different star arrangement', () => {
  const edge = (id: string, a: string, b: string, owner: 0 | 1) => ({ id, a, b, owner });
  // Diagonals across the first four grid stars cross; use the existing boundary for recovery.
  let match: Match = {
    ...base(),
    edges: [edge('build', 's1', 's2', 0), edge('block', 's2', 's7', 1)],
  };
  expect(isLegalLine(match.map, match.edges, { a: 's1', b: 's8' })).toBe(false);
  const blocked = transition(match, { type: 'draw', a: 's1', b: 's8' });
  expect(blocked).toBe(match);
  match = transition(match, { type: 'relocate', id: 'build', a: 's8', b: 's14' });
  expect(match.phase.kind).toBe('handoff');
  expect(match.turns[0]).toBe(1);
  expect(match.edges.find((e) => e.id === 'block')).toBeDefined();
  expect(unfinished(match, 0)).toHaveLength(1);
});
it('bounded generated command sequences preserve geometry, ownership, reservations and turn limits', () => {
  fc.assert(
    fc.property(fc.array(fc.nat(), { minLength: 40, maxLength: 90 }), (choices) => {
      let match = base();
      for (const choice of choices) {
        const old = match;
        if (match.phase.kind === 'result') break;
        if (match.phase.kind === 'handoff') match = transition(match, { type: 'end' });
        else if (match.phase.kind === 'selection')
          match = transition(match, {
            type: 'claim',
            index: choice % match.phase.candidates.length,
          });
        else {
          const { draws, relocations } = availableActions(match, match.active);
          const actions = [
            ...draws.map((e) => ({ type: 'draw' as const, ...e })),
            ...relocations.map((e) => ({ type: 'relocate' as const, ...e })),
          ];
          expect(actions.length).toBeGreaterThan(0);
          match = transition(match, actions[choice % actions.length]);
        }
        for (const e of match.edges)
          expect(
            isLegalLine(
              match.map,
              match.edges.filter((x) => x.id !== e.id),
              e,
            ),
          ).toBe(true);
        expect(new Set(match.edges.map((e) => e.id)).size).toBe(match.edges.length);
        const ids = reserved(match);
        expect(ids.size).toBe(match.completions.flatMap((c) => c.edgeIds).length);
        for (const c of match.completions)
          for (const id of c.edgeIds)
            expect(match.edges.find((e) => e.id === id)?.owner).toBe(c.owner);
        for (const c of old.completions)
          for (const id of c.edgeIds)
            expect(match.edges.find((e) => e.id === id)).toEqual(
              old.edges.find((e) => e.id === id),
            );
        expect(match.turns.every((n) => n <= 20)).toBe(true);
        expect(score(match, 0) <= 3 && score(match, 1) <= 3).toBe(true);
      }
    }),
    { numRuns: 12, seed: 20260905 },
  );
});

it('taking a threatened loop edge forces a one-turn delay, with legal relocation recovery', () => {
  let match = base();
  for (let turn = 0; turn < 6; turn++) {
    const [a, b] = EXAMPLE_ROUTES.A[turn];
    match = transition(match, { type: 'draw', a, b });
    match = transition(match, { type: 'end' });
    const [c, d] = turn === 5 ? ['s13', 's7'] : EXAMPLE_ROUTES.B[turn];
    match = transition(match, { type: 'draw', a: c, b: d });
    match = transition(match, { type: 'end' });
  }
  expect(score(match, 0)).toBe(1);
  // No single draw can complete the existing three-edge loop: its missing pair is owned.
  const { draws } = availableActions(match, 0);
  for (const draw of draws) expect(score(transition(match, { type: 'draw', ...draw }), 0)).toBe(1);
  const old = match.edges.find(
    (e) => e.owner === 0 && lineKey(e.a, e.b) === lineKey('s14', 's13'),
  )!;
  match = transition(match, { type: 'relocate', id: old.id, a: 's14', b: 's19' });
  expect(match.phase.kind).toBe('handoff');
  match = transition(match, { type: 'end' });
  match = transition(match, { type: 'draw', a: 's17', b: 's10' });
  match = transition(match, { type: 'end' });
  match = transition(match, { type: 'draw', a: 's19', b: 's7' });
  expect(score(match, 0)).toBe(2);
  expect(match.turns[0]).toBe(8);
});
