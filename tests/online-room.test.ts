import { describe, expect, it } from 'vitest';
import { applyAction, joinRoom, newRoom, profile, publicRoom, syncPresence } from '../server/room';
import { PLAYER_COLORS } from '../src/domain/galaxy-duel/model';

function playingRoom() {
  const room = newRoom('quick', Date.now());
  joinRoom(room, 'host-secret', { name: 'Host', color: PLAYER_COLORS[0] });
  joinRoom(room, 'guest-secret', { name: 'Guest', color: PLAYER_COLORS[1] });
  syncPresence(room, [true, true], Date.now());
  return room;
}
describe('online room authority', () => {
  it('waits for both connections before generating a match and does not expose seat keys', () => {
    const room = newRoom('quick', 1000);
    joinRoom(room, 'secret', profile({ name: '  Host  ', color: PLAYER_COLORS[0] }));
    syncPresence(room, [true, false], 1000);
    expect(room.match).toBeUndefined();
    expect(publicRoom(room, [true, false]).players[0]?.name).toBe('Host');
    expect(JSON.stringify(publicRoom(room, [true, false]))).not.toContain('secret');
  });
  it('reserves seats for their keys, rejects a third guest and duplicate colors', () => {
    const room = newRoom('quick', 0);
    joinRoom(room, 'one', { name: '', color: PLAYER_COLORS[0] });
    expect(() => joinRoom(room, 'two', { name: '', color: PLAYER_COLORS[0] })).toThrow('color');
    joinRoom(room, 'two', { name: '', color: PLAYER_COLORS[1] });
    expect(joinRoom(room, 'one', { name: 'Changed', color: PLAYER_COLORS[2] })).toBe(0);
    expect(room.players[0]?.name).toBe('Player 1');
    expect(() => joinRoom(room, 'three', { name: '', color: PLAYER_COLORS[2] })).toThrow(
      'two players',
    );
  });
  it('rejects actions from the other player and stale versions, with a server-generated die', () => {
    const room = playingRoom();
    const active = room.match!.activePlayerIndex;
    expect(() =>
      applyAction(room, 1 - active, room.version, { type: 'ROLL_DIE' }, [true, true], Date.now()),
    ).toThrow('your turn');
    const before = room.version;
    applyAction(room, active, before, { type: 'ROLL_DIE' }, [true, true], Date.now());
    expect(room.match?.phase.kind).not.toBe('awaiting-roll');
    expect(() =>
      applyAction(room, active, before, { type: 'ROLL_DIE' }, [true, true], Date.now()),
    ).toThrow('match changed');
    expect(room.version).toBe(before + 1);
  });
  it('pauses through disconnects without losing progress, including after the grace period', () => {
    const room = playingRoom();
    const match = room.match;
    syncPresence(room, [true, false], 10_000);
    syncPresence(room, [true, false], 20_000);
    expect(room.pausedAt).toBe(10_000);
    expect(() =>
      applyAction(
        room,
        match!.activePlayerIndex,
        room.version,
        { type: 'ROLL_DIE' },
        [true, false],
        200_000,
      ),
    ).toThrow('paused');
    syncPresence(room, [true, true], 210_000);
    expect(room.pausedAt).toBeUndefined();
    expect(room.match).toBe(match);
  });
  it('requires both rematch votes and alternates the starting player', () => {
    const room = playingRoom();
    room.match = { ...room.match!, phase: { kind: 'result', exhaustedAfterLine: 0 } };
    const old = room.match;
    applyAction(room, 0, room.version, { type: 'REMATCH' }, [true, true], Date.now());
    applyAction(room, 0, room.version, { type: 'REMATCH' }, [true, true], Date.now());
    expect(room.match).toBe(old);
    applyAction(room, 1, room.version, { type: 'REMATCH' }, [true, true], Date.now());
    expect(room.match!.id).not.toBe(old.id);
    expect(room.match!.startingPlayerIndex).toBe(1 - old.startingPlayerIndex);
    expect(room.rematchVotes).toEqual([]);
  });
  it('closes the room when a player leaves even while the opponent is disconnected', () => {
    const room = playingRoom();
    applyAction(room, 0, room.version, { type: 'LEAVE' }, [true, false], Date.now());
    expect(room.closed).toBe(true);
    expect(() => joinRoom(room, 'host-secret', { name: '', color: PLAYER_COLORS[0] })).toThrow(
      'ended',
    );
  });
});
