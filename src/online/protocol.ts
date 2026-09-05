import type { MatchDiagnostics } from '../domain/galaxy-duel/diagnostics';
import type { GalaxyDuelMatch, MatchSize, Player } from '../domain/galaxy-duel/model';

export const RECONNECT_GRACE_MS = 120_000;
export const HEARTBEAT_MS = 15_000;
export const CONNECTION_TIMEOUT_MS = 45_000;
export type GuestProfile = { name: string; color: string };
export type OnlineAction =
  | { type: 'ROLL_DIE' }
  | { type: 'COMMIT_LINE'; a: string; b: string }
  | { type: 'END_TURN' }
  | { type: 'REMATCH' }
  | { type: 'LEAVE' };
export type ClientMessage =
  | { type: 'hello'; token: string; create: boolean; size: MatchSize; profile: GuestProfile }
  | { type: 'ping' }
  | { type: 'action'; id: string; version: number; action: OnlineAction };
export type RoomView = {
  players: (Player | null)[];
  connected: boolean[];
  size: MatchSize;
  version: number;
  match?: GalaxyDuelMatch;
  diagnostics?: MatchDiagnostics;
  pausedAt?: number;
  closed: boolean;
  rematchVotes: number[];
};
export type ServerMessage =
  | { type: 'snapshot'; room: RoomView; seat: number; requestId?: string }
  | { type: 'error'; message: string; fatal?: boolean; requestId?: string }
  | { type: 'pong' };
