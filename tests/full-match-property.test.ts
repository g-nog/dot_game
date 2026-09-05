import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDiagnostics } from '../src/domain/galaxy-duel/diagnostics';
import type { MatchSize, Player, GalaxyDuelMatch } from '../src/domain/galaxy-duel/model';
import { scoreFor } from '../src/domain/galaxy-duel/selectors';
import {
  createMatch,
  matchInvariantErrors,
  transition,
} from '../src/domain/galaxy-duel/state-machine';
import { findCompatibleLineSequence } from '../src/geometry/quota-feasibility';
import { generateDotField } from '../src/generation/dot-field';

const players: readonly [Player, Player] = [
  { id: 'player-1', name: 'First name must never enter diagnostics', color: '#e76f51' },
  { id: 'player-2', name: 'Second name must never enter diagnostics', color: '#2a9d8f' },
];

function playToExhaustion(size: MatchSize, seed: number): GalaxyDuelMatch {
  let match = createMatch({
    id: `generated-${size}-${seed}`,
    boardSeed: seed,
    size,
    dotField: generateDotField(size, seed),
    players,
    startingPlayerIndex: seed % 2 === 0 ? 0 : 1,
    createdAt: '2026-08-31T00:00:00.000Z',
  });

  for (
    let commandCount = 0;
    commandCount < 1_000 && match.phase.kind !== 'result';
    commandCount += 1
  ) {
    const command = (() => {
      if (match.phase.kind === 'awaiting-roll') {
        return { type: 'ROLL_DIE' as const, result: ((match.turn - 1) % 6) + 1 };
      }
      if (match.phase.kind === 'awaiting-end-turn') return { type: 'END_TURN' as const };
      const remaining = match.phase.quota - match.phase.committed;
      const witness = findCompatibleLineSequence(match.dotField, match.lines, remaining);
      if (!witness?.[0])
        throw new Error('Drawing phase did not have its promised feasibility witness');
      return { type: 'COMMIT_LINE' as const, ...witness[0] };
    })();
    const outcome = transition(match, command);
    if (!outcome.accepted) throw new Error(outcome.reason);
    match = outcome.match;
    expect(matchInvariantErrors(match)).toEqual([]);
    expect(new Set(match.claims.map((claim) => claim.key)).size).toBe(match.claims.length);
    expect(scoreFor(match, 'player-1') + scoreFor(match, 'player-2')).toBe(match.claims.length);
  }

  expect(match.phase.kind).toBe('result');
  return match;
}

describe('complete generated matches', () => {
  it('reaches board exhaustion without invariant failures for every size across recorded seeds', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<MatchSize>('quick', 'standard', 'extended'),
        fc.integer({ min: 0, max: 0xffffffff }),
        (size, seed) => {
          const result = playToExhaustion(size, seed);
          expect(result.phase.kind).toBe('result');
        },
      ),
      { seed: 20260831, numRuns: 15 },
    );
  }, 30_000);

  it('keeps player names out of manual diagnostics data', () => {
    const match = createMatch({
      id: 'privacy',
      boardSeed: 4,
      size: 'quick',
      dotField: generateDotField('quick', 4),
      players,
      startingPlayerIndex: 0,
      createdAt: '2026-08-31T00:00:00.000Z',
    });
    const serialized = JSON.stringify(createDiagnostics(match));
    expect(serialized).not.toContain(players[0].name);
    expect(serialized).not.toContain(players[1].name);
    expect(serialized).toContain('player-1');
  });
});
