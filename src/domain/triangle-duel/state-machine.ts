import { enumerateLegalLines, isLegalLine } from '../../geometry/legal-lines';
import { hasCompatibleLineSequence } from '../../geometry/quota-feasibility';
import { claimsCompletedByLine } from '../../geometry/scoring-triangles';
import { scoreFor } from './selectors';
import type {
  AcceptedTransition,
  MatchCommand,
  MatchFact,
  MatchTransition,
  Player,
  TriangleDuelMatch,
} from './model';

export type MatchSetup = Readonly<{
  id: string;
  boardSeed: number;
  size: TriangleDuelMatch['size'];
  dotField: TriangleDuelMatch['dotField'];
  players: readonly [Player, Player];
  startingPlayerIndex: 0 | 1;
  createdAt: string;
}>;

export function createMatch(setup: MatchSetup): TriangleDuelMatch {
  return {
    schemaVersion: 1,
    ...setup,
    activePlayerIndex: setup.startingPlayerIndex,
    lines: [],
    claims: [],
    turn: 1,
    phase: { kind: 'awaiting-roll' },
  };
}

function reject(match: TriangleDuelMatch, reason: string): MatchTransition {
  return { accepted: false, match, reason };
}

function accepted(
  match: TriangleDuelMatch,
  facts: MatchFact[],
  feasibilityDurationMs?: number,
): AcceptedTransition {
  return {
    accepted: true,
    match,
    facts,
    ...(feasibilityDurationMs === undefined ? {} : { feasibilityDurationMs }),
  };
}

function winner(match: TriangleDuelMatch) {
  const first = scoreFor(match, 'player-1');
  const second = scoreFor(match, 'player-2');
  return first === second
    ? undefined
    : first > second
      ? ('player-1' as const)
      : ('player-2' as const);
}

export function transition(match: TriangleDuelMatch, command: MatchCommand): MatchTransition {
  if (command.type === 'START_REMATCH') {
    if (match.phase.kind !== 'result')
      return reject(match, 'A rematch can start only after a result');
    const nextStart = match.startingPlayerIndex === 0 ? 1 : 0;
    const rematch = createMatch({
      id: command.id,
      boardSeed: command.boardSeed,
      size: match.size,
      dotField: command.dotField,
      players: match.players,
      startingPlayerIndex: nextStart,
      createdAt: command.createdAt,
    });
    return accepted(rematch, []);
  }

  if (command.type === 'ROLL_DIE') {
    if (match.phase.kind !== 'awaiting-roll')
      return reject(match, 'The die can be rolled only at the start of a turn');
    if (!Number.isInteger(command.result) || command.result < 1 || command.result > 6)
      return reject(match, 'Die result must be from 1 through 6');
    const started = performance.now();
    const feasible = hasCompatibleLineSequence(match.dotField, match.lines, command.result);
    const duration = performance.now() - started;
    const facts: MatchFact[] = [{ type: 'DIE_ROLLED', quota: command.result }];
    const phase = feasible
      ? { kind: 'drawing-lines' as const, quota: command.result, committed: 0 }
      : {
          kind: 'awaiting-end-turn' as const,
          quota: command.result,
          committed: 0,
          reason: 'forfeited' as const,
        };
    if (!feasible) facts.push({ type: 'TURN_FORFEITED', quota: command.result });
    return accepted({ ...match, phase }, facts, duration);
  }

  if (command.type === 'COMMIT_LINE') {
    if (match.phase.kind !== 'drawing-lines')
      return reject(match, 'Lines can be committed only while drawing');
    if (!isLegalLine(match.dotField, match.lines, command))
      return reject(match, 'That line is not legal');
    const playerId = match.players[match.activePlayerIndex].id;
    const line = { a: command.a, b: command.b, playerId, turn: match.turn };
    const lines = [...match.lines, line];
    const newClaims = claimsCompletedByLine(
      match.dotField,
      lines,
      line,
      match.claims,
      playerId,
      match.turn,
    );
    const claims = [...match.claims, ...newClaims];
    const facts: MatchFact[] = [{ type: 'LINE_COMMITTED', line }];
    if (newClaims.length > 0) facts.push({ type: 'TRIANGLES_CLAIMED', claims: newClaims });
    const committed = match.phase.committed + 1;
    const partial = { ...match, lines, claims };
    if (enumerateLegalLines(match.dotField, lines).length === 0) {
      const result = {
        ...partial,
        phase: {
          kind: 'result' as const,
          exhaustedAfterLine: lines.length,
          winnerId: winner(partial),
        },
      };
      facts.push({ type: 'MATCH_ENDED', winnerId: result.phase.winnerId });
      return accepted(result, facts);
    }
    if (committed === match.phase.quota) {
      facts.push({ type: 'QUOTA_COMPLETED', quota: match.phase.quota });
      return accepted(
        {
          ...partial,
          phase: {
            kind: 'awaiting-end-turn',
            quota: match.phase.quota,
            committed,
            reason: 'quota-complete',
          },
        },
        facts,
      );
    }
    const remaining = match.phase.quota - committed;
    const started = performance.now();
    const feasible = hasCompatibleLineSequence(match.dotField, lines, remaining);
    const duration = performance.now() - started;
    if (!feasible) {
      facts.push({ type: 'TURN_INCOMPLETE', committed, quota: match.phase.quota });
      return accepted(
        {
          ...partial,
          phase: {
            kind: 'awaiting-end-turn',
            quota: match.phase.quota,
            committed,
            reason: 'incomplete',
          },
        },
        facts,
        duration,
      );
    }
    return accepted({ ...partial, phase: { ...match.phase, committed } }, facts, duration);
  }

  if (command.type === 'END_TURN') {
    if (match.phase.kind !== 'awaiting-end-turn') return reject(match, 'The turn cannot end now');
    const activePlayerIndex: 0 | 1 = match.activePlayerIndex === 0 ? 1 : 0;
    const next = {
      ...match,
      activePlayerIndex,
      turn: match.turn + 1,
      phase: { kind: 'awaiting-roll' as const },
    };
    return accepted(next, [
      { type: 'TURN_ENDED', nextPlayerId: next.players[activePlayerIndex].id },
    ]);
  }

  return reject(match, 'Unknown command');
}

export function matchInvariantErrors(match: TriangleDuelMatch): string[] {
  const errors: string[] = [];
  const dotIds = new Set(match.dotField.dots.map((dot) => dot.id));
  const lineKeys = new Set<string>();
  for (const line of match.lines) {
    const key = [line.a, line.b].sort().join('|');
    if (!dotIds.has(line.a) || !dotIds.has(line.b)) errors.push('Line references an unknown dot');
    if (lineKeys.has(key)) errors.push('Duplicate line');
    lineKeys.add(key);
  }
  const claimKeys = new Set<string>();
  for (const claim of match.claims) {
    if (claimKeys.has(claim.key)) errors.push('Duplicate claim');
    claimKeys.add(claim.key);
    if (claim.dots.some((id) => !dotIds.has(id))) errors.push('Claim references an unknown dot');
  }
  if (match.players.length !== 2 || match.players[0].id === match.players[1].id)
    errors.push('A match needs two distinct players');
  if (match.players[0].color === match.players[1].color)
    errors.push('Player colors must be distinct');
  if (
    match.phase.kind === 'drawing-lines' &&
    (match.phase.committed >= match.phase.quota || match.phase.committed < 0)
  )
    errors.push('Invalid drawing progress');
  return errors;
}
