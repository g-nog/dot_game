import { beforeEach, describe, expect, it, vi } from 'vitest';

const { feasibility } = vi.hoisted(() => ({
  feasibility: vi.fn<(field: unknown, lines: unknown[], required: number) => boolean>(),
}));
vi.mock('../src/geometry/quota-feasibility', () => ({ hasCompatibleLineSequence: feasibility }));

import type { Player } from '../src/domain/galaxy-duel/model';
import { createMatch, transition } from '../src/domain/galaxy-duel/state-machine';
import { triangleField } from './fixtures/dot-fields';

const players: readonly [Player, Player] = [
  { id: 'player-1', name: 'A', color: '#e76f51' },
  { id: 'player-2', name: 'B', color: '#2a9d8f' },
];

describe('incomplete turn transition', () => {
  beforeEach(() => feasibility.mockReset());

  it('retains committed lines and requires acknowledgment when no compatible continuation remains', () => {
    feasibility.mockReturnValueOnce(true).mockReturnValueOnce(false);
    const initial = createMatch({
      id: 'm',
      boardSeed: 1,
      size: 'quick',
      dotField: triangleField,
      players,
      startingPlayerIndex: 0,
      createdAt: '2026-08-31T00:00:00.000Z',
    });
    const rolled = transition(initial, { type: 'ROLL_DIE', result: 2 });
    if (!rolled.accepted) throw new Error('roll rejected');
    const outcome = transition(rolled.match, { type: 'COMMIT_LINE', a: 'a', b: 'b' });
    expect(outcome.accepted && outcome.match.phase).toMatchObject({
      kind: 'awaiting-end-turn',
      reason: 'incomplete',
      quota: 2,
      committed: 1,
    });
    expect(outcome.accepted && outcome.match.lines).toHaveLength(1);
    expect(outcome.accepted && outcome.facts).toContainEqual({
      type: 'TURN_INCOMPLETE',
      committed: 1,
      quota: 2,
    });
  });
});
