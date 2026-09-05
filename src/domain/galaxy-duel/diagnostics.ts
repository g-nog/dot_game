import type { MatchFact, MatchSize, PlayerId, GalaxyDuelMatch } from './model';

export type MatchDiagnostics = Readonly<{
  schemaVersion: 1;
  appVersion: string;
  boardSeed: number;
  matchSize: MatchSize;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  startingPlayerId: PlayerId;
  winnerId?: PlayerId;
  draw?: boolean;
  rollHistogram: Readonly<Record<PlayerId, readonly number[]>>;
  cumulativeRollTotal: Readonly<Record<PlayerId, number>>;
  committedLineCount: number;
  claimedTriangleCount: number;
  multiClaimCount: number;
  forfeitedTurnCount: number;
  incompleteTurnCount: number;
  turnCount: number;
  boardExhaustionPoint?: number;
  feasibilityCheckMaximumMs: number;
  feasibilityCheckSamplesMs: readonly number[];
}>;

export function createDiagnostics(match: GalaxyDuelMatch): MatchDiagnostics {
  return {
    schemaVersion: 1,
    appVersion: '1.0.0',
    boardSeed: match.boardSeed,
    matchSize: match.size,
    startedAt: match.createdAt,
    startingPlayerId: match.players[match.startingPlayerIndex].id,
    rollHistogram: { 'player-1': [0, 0, 0, 0, 0, 0], 'player-2': [0, 0, 0, 0, 0, 0] },
    cumulativeRollTotal: { 'player-1': 0, 'player-2': 0 },
    committedLineCount: 0,
    claimedTriangleCount: 0,
    multiClaimCount: 0,
    forfeitedTurnCount: 0,
    incompleteTurnCount: 0,
    turnCount: 1,
    feasibilityCheckMaximumMs: 0,
    feasibilityCheckSamplesMs: [],
  };
}

export function recordTransition(
  diagnostics: MatchDiagnostics,
  before: GalaxyDuelMatch,
  after: GalaxyDuelMatch,
  facts: readonly MatchFact[],
  feasibilityDurationMs?: number,
  now = new Date(),
): MatchDiagnostics {
  const playerId = before.players[before.activePlayerIndex].id;
  const histogram = {
    'player-1': [...diagnostics.rollHistogram['player-1']],
    'player-2': [...diagnostics.rollHistogram['player-2']],
  };
  const totals = { ...diagnostics.cumulativeRollTotal };
  const roll = facts.find((fact) => fact.type === 'DIE_ROLLED');
  if (roll?.type === 'DIE_ROLLED') {
    histogram[playerId][roll.quota - 1] += 1;
    totals[playerId] += roll.quota;
  }
  const claims = facts.find((fact) => fact.type === 'TRIANGLES_CLAIMED');
  const ended = after.phase.kind === 'result';
  const samples =
    feasibilityDurationMs === undefined
      ? diagnostics.feasibilityCheckSamplesMs
      : [...diagnostics.feasibilityCheckSamplesMs, Number(feasibilityDurationMs.toFixed(3))].slice(
          -100,
        );
  return {
    ...diagnostics,
    rollHistogram: histogram,
    cumulativeRollTotal: totals,
    committedLineCount: after.lines.length,
    claimedTriangleCount: after.claims.length,
    multiClaimCount:
      diagnostics.multiClaimCount +
      (claims?.type === 'TRIANGLES_CLAIMED' && claims.claims.length > 1 ? 1 : 0),
    forfeitedTurnCount:
      diagnostics.forfeitedTurnCount +
      (facts.some((fact) => fact.type === 'TURN_FORFEITED') ? 1 : 0),
    incompleteTurnCount:
      diagnostics.incompleteTurnCount +
      (facts.some((fact) => fact.type === 'TURN_INCOMPLETE') ? 1 : 0),
    turnCount: after.turn,
    feasibilityCheckMaximumMs: Math.max(
      diagnostics.feasibilityCheckMaximumMs,
      feasibilityDurationMs ?? 0,
    ),
    feasibilityCheckSamplesMs: samples,
    ...(ended
      ? {
          finishedAt: now.toISOString(),
          durationMs: Math.max(0, now.getTime() - new Date(diagnostics.startedAt).getTime()),
          winnerId: after.phase.kind === 'result' ? after.phase.winnerId : undefined,
          draw: after.phase.kind === 'result' && after.phase.winnerId === undefined,
          boardExhaustionPoint: after.lines.length,
        }
      : {}),
  };
}
