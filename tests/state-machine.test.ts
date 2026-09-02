import { describe, expect, it } from 'vitest';
import type { DotField, Player } from '../src/domain/triangle-duel/model';
import {
  createMatch,
  matchInvariantErrors,
  transition,
} from '../src/domain/triangle-duel/state-machine';
import { triangleField } from './fixtures/dot-fields';

const players: readonly [Player, Player] = [
  { id: 'player-1', name: 'A', color: '#e76f51' },
  { id: 'player-2', name: 'B', color: '#2a9d8f' },
];
const create = (dotField: DotField = triangleField) =>
  createMatch({
    id: 'match',
    boardSeed: 7,
    size: 'quick',
    dotField,
    players,
    startingPlayerIndex: 0,
    createdAt: '2026-08-31T00:00:00.000Z',
  });

describe('Triangle Duel state machine', () => {
  it('rejects invalid phase commands and die values without mutation', () => {
    const match = create();
    expect(transition(match, { type: 'COMMIT_LINE', a: 'a', b: 'b' })).toMatchObject({
      accepted: false,
      match,
    });
    expect(transition(match, { type: 'ROLL_DIE', result: 7 })).toMatchObject({
      accepted: false,
      match,
    });
  });

  it('records exact quota progress and requires end-turn acknowledgement', () => {
    const rolled = transition(create(), { type: 'ROLL_DIE', result: 1 });
    expect(rolled.accepted).toBe(true);
    if (!rolled.accepted) return;
    const committed = transition(rolled.match, { type: 'COMMIT_LINE', a: 'a', b: 'b' });
    expect(committed.accepted && committed.match.phase).toMatchObject({
      kind: 'awaiting-end-turn',
      reason: 'quota-complete',
      quota: 1,
      committed: 1,
    });
    if (!committed.accepted) return;
    const ended = transition(committed.match, { type: 'END_TURN' });
    expect(ended.accepted && ended.match).toMatchObject({
      activePlayerIndex: 1,
      turn: 2,
      phase: { kind: 'awaiting-roll' },
    });
  });

  it('forfeits immediately when no compatible sequence can satisfy the roll', () => {
    const tiny: DotField = {
      width: 10,
      height: 10,
      margin: 0,
      minimumSeparation: 1,
      dots: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 10, y: 10 },
      ],
    };
    const outcome = transition(create(tiny), { type: 'ROLL_DIE', result: 2 });
    expect(outcome.accepted && outcome.match.phase).toMatchObject({
      kind: 'awaiting-end-turn',
      reason: 'forfeited',
      committed: 0,
      quota: 2,
    });
  });

  it('resolves claims before immediate board exhaustion and can produce a normal win', () => {
    const match = {
      ...create(),
      lines: [
        { a: 'a', b: 'c', playerId: 'player-1' as const, turn: 1 },
        { a: 'b', b: 'c', playerId: 'player-2' as const, turn: 2 },
      ],
      activePlayerIndex: 0 as const,
      turn: 3,
      phase: { kind: 'drawing-lines' as const, quota: 1, committed: 0 },
    };
    const outcome = transition(match, { type: 'COMMIT_LINE', a: 'a', b: 'b' });
    expect(outcome.accepted && outcome.match.phase).toMatchObject({
      kind: 'result',
      winnerId: 'player-1',
      exhaustedAfterLine: 3,
    });
    expect(outcome.accepted && outcome.match.claims).toHaveLength(1);
  });

  it('produces a draw at exhaustion with no claims', () => {
    const tiny: DotField = {
      width: 10,
      height: 10,
      margin: 0,
      minimumSeparation: 1,
      dots: [
        { id: 'a', x: 0, y: 0 },
        { id: 'b', x: 10, y: 10 },
      ],
    };
    const rolled = transition(create(tiny), { type: 'ROLL_DIE', result: 1 });
    if (!rolled.accepted) throw new Error('roll rejected');
    const outcome = transition(rolled.match, { type: 'COMMIT_LINE', a: 'a', b: 'b' });
    expect(outcome.accepted && outcome.match.phase).toMatchObject({
      kind: 'result',
      winnerId: undefined,
    });
  });

  it('alternates the starting player on a fresh-field rematch', () => {
    const result = { ...create(), phase: { kind: 'result' as const, exhaustedAfterLine: 0 } };
    const outcome = transition(result, {
      type: 'START_REMATCH',
      boardSeed: 8,
      dotField: triangleField,
      id: 'rematch',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    expect(outcome.accepted && outcome.match).toMatchObject({
      id: 'rematch',
      startingPlayerIndex: 1,
      activePlayerIndex: 1,
      lines: [],
      claims: [],
    });
  });

  it('preserves invariants over randomized accepted command sequences', () => {
    let match = create();
    for (let step = 0; step < 20 && match.phase.kind !== 'result'; step += 1) {
      const command =
        match.phase.kind === 'awaiting-roll'
          ? ({ type: 'ROLL_DIE', result: (step % 3) + 1 } as const)
          : match.phase.kind === 'drawing-lines'
            ? ({
                type: 'COMMIT_LINE',
                a: triangleField.dots[step % 3].id,
                b: triangleField.dots[(step + 1) % 3].id,
              } as const)
            : ({ type: 'END_TURN' } as const);
      const outcome = transition(match, command);
      if (outcome.accepted) match = outcome.match;
      expect(matchInvariantErrors(match)).toEqual([]);
    }
  });
});
