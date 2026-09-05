import type { DotField } from '../../geometry/model';
export type Seat = 0 | 1;
export type SequenceId = 'A' | 'B';
export type PatternId = 'thread' | 'crown' | 'halo' | 'beacon' | 'kite' | 'lantern';
export type Player = Readonly<{ name: string; color: string }>;
export type Connection = Readonly<{ id: string; owner: Seat; a: string; b: string }>;
export type MatchCandidate = Readonly<{ edgeIds: readonly string[]; vertices: readonly string[] }>;
export type Completion = MatchCandidate &
  Readonly<{ owner: Seat; pattern: PatternId; turn: number }>;
export type StarMap = DotField & Readonly<{ id: string; version: number }>;
export type Phase =
  | Readonly<{ kind: 'action' }>
  | Readonly<{ kind: 'selection'; candidates: readonly MatchCandidate[] }>
  | Readonly<{ kind: 'handoff' }>
  | Readonly<{ kind: 'result'; winner: Seat | null; reason: 'three' | 'limit' | 'blocked' }>;
export type Match = Readonly<{
  map: StarMap;
  players: readonly [Player, Player];
  anchor: Readonly<{ starter: Seat; sequence: SequenceId }>;
  cycle: number;
  starter: Seat;
  active: Seat;
  sequences: readonly [SequenceId, SequenceId];
  turns: readonly [number, number];
  edges: readonly Connection[];
  completions: readonly Completion[];
  nextId: number;
  phase: Phase;
  notice: string;
}>;
export type Command =
  | Readonly<{ type: 'draw'; a: string; b: string }>
  | Readonly<{ type: 'relocate'; id: string; a: string; b: string }>
  | Readonly<{ type: 'claim'; index: number }>
  | Readonly<{ type: 'end' }>;
