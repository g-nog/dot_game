import type { DotId, DotField } from '../../geometry/model';
export type { DotId, Dot, DotField } from '../../geometry/model';
export { lineKey } from '../../geometry/model';
export type PlayerId = 'player-1' | 'player-2';
export type MatchSize = 'quick' | 'standard' | 'extended';

export type Player = Readonly<{ id: PlayerId; name: string; color: string }>;
export type CommittedLine = Readonly<{
  a: DotId;
  b: DotId;
  playerId: PlayerId;
  turn: number;
}>;
export type ClaimedTriangle = Readonly<{
  key: string;
  dots: readonly [DotId, DotId, DotId];
  playerId: PlayerId;
  turn: number;
}>;

export type EndTurnReason = 'quota-complete' | 'forfeited' | 'incomplete';
export type MatchPhase =
  | Readonly<{ kind: 'awaiting-roll' }>
  | Readonly<{ kind: 'drawing-lines'; quota: number; committed: number }>
  | Readonly<{
      kind: 'awaiting-end-turn';
      quota: number;
      committed: number;
      reason: EndTurnReason;
    }>
  | Readonly<{ kind: 'result'; exhaustedAfterLine: number; winnerId?: PlayerId }>;

export type TriangleDuelMatch = Readonly<{
  schemaVersion: 1;
  id: string;
  boardSeed: number;
  size: MatchSize;
  dotField: DotField;
  players: readonly [Player, Player];
  startingPlayerIndex: 0 | 1;
  activePlayerIndex: 0 | 1;
  lines: readonly CommittedLine[];
  claims: readonly ClaimedTriangle[];
  turn: number;
  createdAt: string;
  phase: MatchPhase;
}>;

export type MatchCommand =
  | Readonly<{ type: 'ROLL_DIE'; result: number }>
  | Readonly<{ type: 'COMMIT_LINE'; a: DotId; b: DotId }>
  | Readonly<{ type: 'END_TURN' }>
  | Readonly<{
      type: 'START_REMATCH';
      boardSeed: number;
      dotField: DotField;
      id: string;
      createdAt: string;
    }>;

export type MatchFact =
  | Readonly<{ type: 'DIE_ROLLED'; quota: number }>
  | Readonly<{ type: 'TURN_FORFEITED'; quota: number }>
  | Readonly<{ type: 'LINE_COMMITTED'; line: CommittedLine }>
  | Readonly<{ type: 'TRIANGLES_CLAIMED'; claims: readonly ClaimedTriangle[] }>
  | Readonly<{ type: 'TURN_INCOMPLETE'; committed: number; quota: number }>
  | Readonly<{ type: 'QUOTA_COMPLETED'; quota: number }>
  | Readonly<{ type: 'TURN_ENDED'; nextPlayerId: PlayerId }>
  | Readonly<{ type: 'MATCH_ENDED'; winnerId?: PlayerId }>;

export type AcceptedTransition = Readonly<{
  accepted: true;
  match: TriangleDuelMatch;
  facts: readonly MatchFact[];
  feasibilityDurationMs?: number;
}>;
export type RejectedTransition = Readonly<{
  accepted: false;
  match: TriangleDuelMatch;
  reason: string;
}>;
export type MatchTransition = AcceptedTransition | RejectedTransition;

export const MATCH_SIZE_DOTS: Readonly<Record<MatchSize, number>> = {
  quick: 20,
  standard: 30,
  extended: 40,
};

export const PLAYER_COLORS = ['#e76f51', '#2a9d8f', '#7c6ee6', '#e9c46a'] as const;

export function triangleKey(ids: readonly DotId[]): string {
  return [...ids].sort().join('|');
}
