import { describe, expect, it } from 'vitest';
import { createDiagnostics, recordTransition } from '../src/domain/triangle-duel/diagnostics';
import type { Player } from '../src/domain/triangle-duel/model';
import { createMatch, transition } from '../src/domain/triangle-duel/state-machine';
import {
  discardMatch,
  restoreMatch,
  saveMatch,
  STORAGE_KEY,
  validateEnvelope,
} from '../src/application/persistence';
import { generateDotField } from '../src/generation/dot-field';
import { findCompatibleLineSequence } from '../src/geometry/quota-feasibility';

class MemoryStorage {
  value: string | null = null;
  getItem() {
    return this.value;
  }
  setItem(_key: string, value: string) {
    this.value = value;
  }
  removeItem() {
    this.value = null;
  }
}
const players: readonly [Player, Player] = [
  { id: 'player-1', name: 'A', color: '#e76f51' },
  { id: 'player-2', name: 'B', color: '#2a9d8f' },
];
function active() {
  const field = generateDotField('quick', 42);
  return createMatch({
    id: 'match',
    boardSeed: 42,
    size: 'quick',
    dotField: field,
    players,
    startingPlayerIndex: 0,
    createdAt: '2026-08-31T00:00:00.000Z',
  });
}

describe('resumable match persistence', () => {
  it('round-trips after die reveal, every committed line, and end-turn acknowledgment', () => {
    const storage = new MemoryStorage();
    let match = active();
    let diagnostics = createDiagnostics(match);
    const applyAndRestore = (command: Parameters<typeof transition>[1]) => {
      const before = match;
      const outcome = transition(match, command);
      expect(outcome.accepted).toBe(true);
      if (!outcome.accepted) throw new Error(outcome.reason);
      match = outcome.match;
      diagnostics = recordTransition(
        diagnostics,
        before,
        match,
        outcome.facts,
        outcome.feasibilityDurationMs,
      );
      saveMatch(
        storage as unknown as Storage,
        match,
        diagnostics,
        new Date('2026-08-31T12:00:00.000Z'),
      );
      expect(restoreMatch(storage as unknown as Storage)).toMatchObject({
        kind: 'valid',
        envelope: { match },
      });
    };

    applyAndRestore({ type: 'ROLL_DIE', result: 3 });
    for (let committed = 1; committed <= 3; committed += 1) {
      if (match.phase.kind !== 'drawing-lines') throw new Error('Expected drawing phase');
      const witness = findCompatibleLineSequence(
        match.dotField,
        match.lines,
        match.phase.quota - match.phase.committed,
      );
      if (!witness?.[0]) throw new Error('Expected a compatible line');
      applyAndRestore({ type: 'COMMIT_LINE', ...witness[0] });
      expect(match.lines).toHaveLength(committed);
    }
    applyAndRestore({ type: 'END_TURN' });
    discardMatch(storage as unknown as Storage);
    expect(storage.value).toBeNull();
  });

  it('rejects corrupt, unsupported, and internally inconsistent snapshots', () => {
    const storage = new MemoryStorage();
    storage.value = '{';
    expect(restoreMatch(storage as unknown as Storage)).toMatchObject({ kind: 'invalid' });
    expect(validateEnvelope({ schemaVersion: 2 })).toMatchObject({
      kind: 'invalid',
      reason: expect.stringContaining('version'),
    });
    const match = active();
    const envelope = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      match,
      diagnostics: createDiagnostics(match),
    };
    const inconsistent = {
      ...envelope,
      match: {
        ...match,
        lines: [
          ...match.lines,
          { a: 'missing', b: 'dot-01', playerId: 'player-1' as const, turn: 1 },
        ],
      },
      diagnostics: { ...envelope.diagnostics, committedLineCount: 1 },
    };
    expect(validateEnvelope(inconsistent)).toMatchObject({ kind: 'invalid' });

    const brokenDiagnostics = {
      ...envelope,
      diagnostics: { ...envelope.diagnostics, rollHistogram: { 'player-1': null } },
    };
    expect(validateEnvelope(brokenDiagnostics)).toMatchObject({
      kind: 'invalid',
      reason: expect.stringContaining('histogram'),
    });

    const malformedField = {
      ...envelope,
      match: { ...match, dotField: { ...match.dotField, dots: [null] } },
    };
    expect(() => validateEnvelope(malformedField)).not.toThrow();
    expect(validateEnvelope(malformedField)).toMatchObject({ kind: 'invalid' });
  });

  it('uses one namespaced storage key', () =>
    expect(STORAGE_KEY).toBe('triangle-duel:resumable-match'));
});
