import type { GuestProfile, OnlineAction, RoomView } from '../src/online/protocol';
import type { MatchCommand, MatchSize, Player } from '../src/domain/galaxy-duel/model';
import { PLAYER_COLORS } from '../src/domain/galaxy-duel/model';
import { createMatch, transition } from '../src/domain/galaxy-duel/state-machine';
import { createDiagnostics, recordTransition } from '../src/domain/galaxy-duel/diagnostics';
import { generateDotField } from '../src/generation/dot-field';
import { cryptoDie, cryptoSeed } from '../src/generation/random';

export type RoomData = Omit<RoomView, 'connected'> & {
  tokens: (string | null)[];
  expiresAt: number;
};
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
export function profile(value: unknown): GuestProfile {
  if (!value || typeof value !== 'object') throw new Error('Choose a name and color.');
  const input = value as Record<string, unknown>;
  if (
    typeof input.name !== 'string' ||
    input.name.trim().length > 16 ||
    !PLAYER_COLORS.includes(input.color as (typeof PLAYER_COLORS)[number])
  )
    throw new Error('Use a name up to 16 characters and a listed color.');
  return { name: input.name.trim(), color: input.color as string };
}
export function newRoom(size: unknown, now: number): RoomData {
  if (!['quick', 'standard', 'extended'].includes(String(size)))
    throw new Error('Invalid match size.');
  return {
    size: size as MatchSize,
    players: [null, null],
    tokens: [null, null],
    version: 0,
    closed: false,
    rematchVotes: [],
    expiresAt: now + ROOM_TTL_MS,
  };
}
export function joinRoom(room: RoomData, token: string, guest: GuestProfile): number {
  if (room.closed) throw new Error('This room has ended. Create a new invite.');
  const existing = room.tokens.indexOf(token);
  if (existing !== -1) return existing;
  const seat = room.tokens.indexOf(null);
  if (seat === -1) throw new Error('This room already has two players.');
  if (room.players.some((player) => player?.color === guest.color))
    throw new Error('That color is taken. Choose another color.');
  room.tokens[seat] = token;
  room.players[seat] = {
    id: seat === 0 ? 'player-1' : 'player-2',
    name: guest.name || `Player ${seat + 1}`,
    color: guest.color,
  };
  return seat;
}
export function syncPresence(room: RoomData, connected: boolean[], now: number): void {
  if (room.closed) return;
  if (connected.every(Boolean) && room.players.every(Boolean)) {
    delete room.pausedAt;
    if (!room.match) {
      const boardSeed = cryptoSeed();
      room.match = createMatch({
        id: crypto.randomUUID(),
        boardSeed,
        size: room.size,
        dotField: generateDotField(room.size, boardSeed),
        players: room.players as [Player, Player],
        startingPlayerIndex: cryptoSeed() % 2 === 0 ? 0 : 1,
        createdAt: new Date(now).toISOString(),
      });
      room.diagnostics = createDiagnostics(room.match);
      room.version++;
    }
  } else if (room.match && room.pausedAt === undefined) room.pausedAt = now;
}
export function applyAction(
  room: RoomData,
  seat: number,
  version: number,
  action: OnlineAction,
  connected: boolean[],
  now: number,
): void {
  if (room.closed) throw new Error('This room has ended.');
  if (action.type === 'LEAVE') {
    room.closed = true;
    room.version++;
    return;
  }
  if (!connected.every(Boolean)) throw new Error('Play is paused until both players reconnect.');
  const match = room.match;
  if (!match || !room.diagnostics) throw new Error('Waiting for the other player.');
  if (version !== room.version)
    throw new Error('The match changed. Try again with the updated board.');
  let command: MatchCommand;
  if (action.type === 'REMATCH') {
    if (match.phase.kind !== 'result') throw new Error('Finish this match before a rematch.');
    if (!room.rematchVotes.includes(seat)) room.rematchVotes.push(seat);
    if (room.rematchVotes.length < 2) return;
    const boardSeed = cryptoSeed();
    command = {
      type: 'START_REMATCH',
      boardSeed,
      dotField: generateDotField(match.size, boardSeed),
      id: crypto.randomUUID(),
      createdAt: new Date(now).toISOString(),
    };
  } else {
    if (match.activePlayerIndex !== seat) throw new Error('Wait for your turn.');
    switch (action.type) {
      case 'ROLL_DIE':
        command = { type: 'ROLL_DIE', result: cryptoDie() };
        break;
      case 'COMMIT_LINE':
        if (
          typeof action.a !== 'string' ||
          typeof action.b !== 'string' ||
          !match.dotField.dots.some((dot) => dot.id === action.a) ||
          !match.dotField.dots.some((dot) => dot.id === action.b)
        )
          throw new Error('Choose two stars on this board.');
        command = { type: 'COMMIT_LINE', a: action.a, b: action.b };
        break;
      case 'END_TURN':
        command = { type: 'END_TURN' };
        break;
      default:
        throw new Error('Unknown action.');
    }
  }
  const outcome = transition(match, command);
  if (!outcome.accepted) throw new Error(outcome.reason);
  room.diagnostics =
    command.type === 'START_REMATCH'
      ? createDiagnostics(outcome.match)
      : recordTransition(
          room.diagnostics,
          match,
          outcome.match,
          outcome.facts,
          outcome.feasibilityDurationMs,
        );
  room.match = outcome.match;
  room.rematchVotes = [];
  room.version++;
  room.expiresAt = now + ROOM_TTL_MS;
}
export function publicRoom(room: RoomData, connected: boolean[]): RoomView {
  return {
    players: room.players,
    connected,
    size: room.size,
    version: room.version,
    match: room.match,
    diagnostics: room.diagnostics,
    pausedAt: room.pausedAt,
    closed: room.closed,
    rematchVotes: room.rematchVotes,
  };
}
