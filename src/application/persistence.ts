import type { MatchDiagnostics } from '../domain/triangle-duel/diagnostics';
import type { TriangleDuelMatch } from '../domain/triangle-duel/model';
import { PLAYER_COLORS } from '../domain/triangle-duel/model';
import { matchInvariantErrors } from '../domain/triangle-duel/state-machine';
import { isLegalLine } from '../geometry/legal-lines';
import { hasCompatibleLineSequence } from '../geometry/quota-feasibility';
import { claimsCompletedByLine } from '../geometry/scoring-triangles';
import { validateDotField } from '../generation/dot-field';

export const STORAGE_KEY = 'triangle-duel:resumable-match';

export type StoredMatchEnvelope = Readonly<{
  schemaVersion: 1;
  savedAt: string;
  match: TriangleDuelMatch;
  diagnostics: MatchDiagnostics;
}>;

export type RestoreResult =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'valid'; envelope: StoredMatchEnvelope }>
  | Readonly<{ kind: 'invalid'; reason: string }>;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function validHistogram(value: unknown): value is readonly number[] {
  return Array.isArray(value) && value.length === 6 && value.every(nonNegativeInteger);
}

function validateDiagnostics(
  value: Record<string, unknown>,
  match: TriangleDuelMatch,
): string | undefined {
  if (value.schemaVersion !== 1 || typeof value.appVersion !== 'string')
    return 'The diagnostics version is invalid.';
  if (value.boardSeed !== match.boardSeed || value.matchSize !== match.size)
    return 'The diagnostics do not match this match.';
  if (typeof value.startedAt !== 'string' || Number.isNaN(Date.parse(value.startedAt)))
    return 'The diagnostics start time is invalid.';
  if (value.startingPlayerId !== match.players[match.startingPlayerIndex].id)
    return 'The diagnostics starting player is invalid.';
  if (
    !object(value.rollHistogram) ||
    !validHistogram(value.rollHistogram['player-1']) ||
    !validHistogram(value.rollHistogram['player-2'])
  )
    return 'The roll histogram is invalid.';
  if (
    !object(value.cumulativeRollTotal) ||
    !nonNegativeInteger(value.cumulativeRollTotal['player-1']) ||
    !nonNegativeInteger(value.cumulativeRollTotal['player-2'])
  )
    return 'The cumulative roll totals are invalid.';
  const counters = ['multiClaimCount', 'forfeitedTurnCount', 'incompleteTurnCount'] as const;
  if (counters.some((key) => !nonNegativeInteger(value[key])))
    return 'A diagnostics counter is invalid.';
  if (
    value.committedLineCount !== match.lines.length ||
    value.claimedTriangleCount !== match.claims.length ||
    value.turnCount !== match.turn
  )
    return 'The diagnostics counters do not match this match.';
  if (
    typeof value.feasibilityCheckMaximumMs !== 'number' ||
    !Number.isFinite(value.feasibilityCheckMaximumMs) ||
    value.feasibilityCheckMaximumMs < 0
  )
    return 'The maximum feasibility timing is invalid.';
  if (
    !Array.isArray(value.feasibilityCheckSamplesMs) ||
    value.feasibilityCheckSamplesMs.length > 100 ||
    value.feasibilityCheckSamplesMs.some(
      (sample) => typeof sample !== 'number' || !Number.isFinite(sample) || sample < 0,
    )
  )
    return 'The feasibility timing samples are invalid.';
  if (
    value.finishedAt !== undefined ||
    value.durationMs !== undefined ||
    value.winnerId !== undefined ||
    value.draw !== undefined ||
    value.boardExhaustionPoint !== undefined
  )
    return 'Completed diagnostics cannot be attached to an unfinished match.';
  return undefined;
}

function validateEnvelopeContents(value: unknown): RestoreResult {
  if (!object(value)) return { kind: 'invalid', reason: 'The snapshot is not an object.' };
  if (value.schemaVersion !== 1)
    return { kind: 'invalid', reason: 'This snapshot version is not supported.' };
  if (typeof value.savedAt !== 'string' || Number.isNaN(Date.parse(value.savedAt)))
    return { kind: 'invalid', reason: 'The save timestamp is invalid.' };
  if (!object(value.match) || !object(value.diagnostics))
    return { kind: 'invalid', reason: 'The snapshot is incomplete.' };
  const match = value.match as unknown as TriangleDuelMatch;
  if (match.schemaVersion !== 1 || !['quick', 'standard', 'extended'].includes(match.size))
    return { kind: 'invalid', reason: 'The match metadata is invalid.' };
  if (
    typeof match.id !== 'string' ||
    match.id.length === 0 ||
    !Number.isSafeInteger(match.boardSeed) ||
    match.boardSeed < 0 ||
    match.boardSeed > 0xffffffff ||
    typeof match.createdAt !== 'string' ||
    Number.isNaN(Date.parse(match.createdAt))
  )
    return { kind: 'invalid', reason: 'The match identity, seed, or start time is invalid.' };
  if (
    !Array.isArray(match.players) ||
    match.players.length !== 2 ||
    !Array.isArray(match.lines) ||
    !Array.isArray(match.claims)
  )
    return { kind: 'invalid', reason: 'The match collections are invalid.' };
  if (!object(match.dotField) || !Array.isArray(match.dotField.dots) || !object(match.phase))
    return { kind: 'invalid', reason: 'The dot field or phase is invalid.' };
  if (
    ![0, 1].includes(match.activePlayerIndex) ||
    ![0, 1].includes(match.startingPlayerIndex) ||
    !Number.isInteger(match.turn) ||
    match.turn < 1
  )
    return { kind: 'invalid', reason: 'The player order is invalid.' };
  if (
    match.players.some(
      (player) =>
        !object(player) ||
        !['player-1', 'player-2'].includes(player.id) ||
        typeof player.name !== 'string' ||
        player.name.trim().length === 0 ||
        player.name.length > 16 ||
        !PLAYER_COLORS.includes(player.color as (typeof PLAYER_COLORS)[number]),
    ) ||
    match.players[0].id !== 'player-1' ||
    match.players[1].id !== 'player-2'
  )
    return { kind: 'invalid', reason: 'The players are invalid.' };
  const fieldValidation = validateDotField(match.dotField, match.size);
  if (!fieldValidation.valid) return { kind: 'invalid', reason: fieldValidation.reason };
  const allowedPhases = ['awaiting-roll', 'drawing-lines', 'awaiting-end-turn', 'result'];
  if (!allowedPhases.includes(match.phase.kind) || match.phase.kind === 'result')
    return { kind: 'invalid', reason: 'Only unfinished matches can be resumed.' };
  const committed: TriangleDuelMatch['lines'][number][] = [];
  const reconstructedClaims: TriangleDuelMatch['claims'][number][] = [];
  for (const line of match.lines) {
    if (
      !object(line) ||
      typeof line.a !== 'string' ||
      typeof line.b !== 'string' ||
      !['player-1', 'player-2'].includes(String(line.playerId)) ||
      typeof line.turn !== 'number' ||
      !Number.isInteger(line.turn) ||
      line.turn < 1 ||
      line.turn > match.turn
    )
      return { kind: 'invalid', reason: 'A stored line is malformed.' };
    const validLine = line as unknown as TriangleDuelMatch['lines'][number];
    if (!isLegalLine(match.dotField, committed, validLine))
      return { kind: 'invalid', reason: 'A stored line is not legal.' };
    committed.push(validLine);
    reconstructedClaims.push(
      ...claimsCompletedByLine(
        match.dotField,
        committed,
        validLine,
        reconstructedClaims,
        validLine.playerId,
        validLine.turn,
      ),
    );
  }
  if (JSON.stringify(reconstructedClaims) !== JSON.stringify(match.claims))
    return { kind: 'invalid', reason: 'The stored claims do not match the committed lines.' };
  if (match.phase.kind === 'drawing-lines' || match.phase.kind === 'awaiting-end-turn') {
    if (
      !Number.isInteger(match.phase.quota) ||
      match.phase.quota < 1 ||
      match.phase.quota > 6 ||
      !Number.isInteger(match.phase.committed) ||
      match.phase.committed < 0 ||
      match.phase.committed > match.phase.quota
    )
      return { kind: 'invalid', reason: 'The stored quota progress is invalid.' };
    const currentTurnLines = match.lines.filter((line) => line.turn === match.turn).length;
    if (currentTurnLines !== match.phase.committed)
      return { kind: 'invalid', reason: 'The stored quota does not match this turn’s lines.' };
    if (match.phase.kind === 'drawing-lines' && match.phase.committed >= match.phase.quota)
      return { kind: 'invalid', reason: 'Drawing phase has already completed its quota.' };
    if (
      match.phase.kind === 'drawing-lines' &&
      !hasCompatibleLineSequence(
        match.dotField,
        match.lines,
        match.phase.quota - match.phase.committed,
      )
    )
      return { kind: 'invalid', reason: 'The drawing phase has no compatible continuation.' };
    if (match.phase.kind === 'awaiting-end-turn') {
      if (!['quota-complete', 'forfeited', 'incomplete'].includes(match.phase.reason))
        return { kind: 'invalid', reason: 'The end-turn reason is invalid.' };
      if (match.phase.reason === 'quota-complete' && match.phase.committed !== match.phase.quota)
        return { kind: 'invalid', reason: 'A completed quota has incorrect progress.' };
      if (match.phase.reason === 'forfeited' && match.phase.committed !== 0)
        return { kind: 'invalid', reason: 'A forfeited turn cannot contain lines.' };
      if (
        match.phase.reason === 'incomplete' &&
        (match.phase.committed === 0 || match.phase.committed >= match.phase.quota)
      )
        return { kind: 'invalid', reason: 'An incomplete turn has incorrect progress.' };
      const remaining = match.phase.quota - match.phase.committed;
      if (
        match.phase.reason === 'forfeited' &&
        hasCompatibleLineSequence(match.dotField, match.lines, match.phase.quota)
      )
        return { kind: 'invalid', reason: 'The stored turn was not actually forfeited.' };
      if (
        match.phase.reason === 'incomplete' &&
        hasCompatibleLineSequence(match.dotField, match.lines, remaining)
      )
        return { kind: 'invalid', reason: 'The stored turn still has a compatible continuation.' };
    }
  } else if (match.lines.some((line) => line.turn === match.turn))
    return { kind: 'invalid', reason: 'An awaiting-roll turn cannot already contain lines.' };
  const errors = matchInvariantErrors(match);
  if (errors.length > 0) return { kind: 'invalid', reason: errors[0] };
  const diagnosticsError = validateDiagnostics(value.diagnostics, match);
  if (diagnosticsError) return { kind: 'invalid', reason: diagnosticsError };
  return { kind: 'valid', envelope: value as unknown as StoredMatchEnvelope };
}

export function validateEnvelope(value: unknown): RestoreResult {
  try {
    return validateEnvelopeContents(value);
  } catch {
    return { kind: 'invalid', reason: 'The saved data is internally malformed.' };
  }
}

export function restoreMatch(storage: Pick<Storage, 'getItem'>): RestoreResult {
  const source = storage.getItem(STORAGE_KEY);
  if (source === null) return { kind: 'none' };
  try {
    return validateEnvelope(JSON.parse(source));
  } catch {
    return { kind: 'invalid', reason: 'The saved data is not valid JSON.' };
  }
}

export function saveMatch(
  storage: Pick<Storage, 'setItem'>,
  match: TriangleDuelMatch,
  diagnostics: MatchDiagnostics,
  now = new Date(),
): void {
  const envelope: StoredMatchEnvelope = {
    schemaVersion: 1,
    savedAt: now.toISOString(),
    match,
    diagnostics,
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

export function discardMatch(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(STORAGE_KEY);
}
