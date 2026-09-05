import { isLegalLine } from '../../geometry/legal-lines';
import { lineKey } from '../../geometry/model';
import { CONSTELLATION_MAP } from '../../maps/constellation';
import type { Command, Match, MatchCandidate, Player, Seat, SequenceId, StarMap } from './model';
import { candidates, canAct, score, target, unfinished } from './selectors';
const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);
const flip = (sequence: SequenceId): SequenceId => (sequence === 'A' ? 'B' : 'A');
export function createMatch(
  players: readonly [Player, Player],
  starter: Seat,
  sequence: SequenceId,
  map: StarMap = CONSTELLATION_MAP,
  cycle = 0,
  anchor = { starter, sequence },
): Match {
  const assigned = cycle % 4 === 1 || cycle % 4 === 2 ? flip(anchor.sequence) : anchor.sequence;
  const opening = cycle % 2 === 1 ? other(anchor.starter) : anchor.starter;
  return enterTurn({
    map,
    players,
    anchor,
    cycle,
    starter: opening,
    active: opening,
    sequences: [assigned, flip(assigned)],
    turns: [0, 0],
    edges: [],
    completions: [],
    nextId: 1,
    phase: { kind: 'action' },
    notice: 'Draw a connection or relocate an unfinished one.',
  });
}
export function rematch(match: Match): Match {
  return createMatch(
    match.players,
    match.anchor.starter,
    match.anchor.sequence,
    match.map,
    (match.cycle + 1) % 4,
    match.anchor,
  );
}
function result(match: Match, reason: 'three' | 'limit' | 'blocked'): Match {
  const a = score(match, 0),
    b = score(match, 1);
  return { ...match, phase: { kind: 'result', winner: a === b ? null : a > b ? 0 : 1, reason } };
}
function finishTurn(match: Match): Match {
  if (score(match, match.active) === 3) return result(match, 'three');
  if (match.turns.every((n) => n >= 20)) return result(match, 'limit');
  if (
    !canAct(match, 0) &&
    !canAct(match, 1) &&
    !candidates(match, 0).length &&
    !candidates(match, 1).length
  )
    return result(match, 'blocked');
  return { ...match, phase: { kind: 'handoff' } };
}
function claim(match: Match, candidate: MatchCandidate): Match {
  return finishTurn({
    ...match,
    completions: [
      ...match.completions,
      {
        ...candidate,
        owner: match.active,
        pattern: target(match, match.active),
        turn: match.turns[match.active],
      },
    ],
    notice: `${match.notice} Constellation completed.`,
  });
}
function resolveTurn(match: Match): Match {
  const turns: [number, number] = [...match.turns];
  turns[match.active]++;
  const next = { ...match, turns };
  const options = candidates(next, next.active);
  if (options.length === 1) return claim(next, options[0]);
  if (options.length > 1) return { ...next, phase: { kind: 'selection', candidates: options } };
  return finishTurn(next);
}
function enterTurn(match: Match): Match {
  if (!canAct(match, match.active))
    return resolveTurn({ ...match, notice: 'Forced pass: no legal draw or relocation remains.' });
  return match;
}
/** Rejection is identity-preserving: previews and invalid commands cannot consume a turn. */
export function transition(match: Match, command: Command): Match {
  if (command.type === 'end') {
    if (match.phase.kind !== 'handoff') return match;
    return enterTurn({
      ...match,
      active: other(match.active),
      phase: { kind: 'action' },
      notice: 'Draw a connection or relocate an unfinished one.',
    });
  }
  if (command.type === 'claim') {
    if (match.phase.kind !== 'selection' || !Number.isInteger(command.index)) return match;
    const option = match.phase.candidates[command.index];
    return option ? claim(match, option) : match;
  }
  if (match.phase.kind !== 'action' || match.turns[match.active] >= 20) return match;
  let edges = match.edges;
  if (command.type === 'relocate') {
    const old = unfinished(match, match.active).find((e) => e.id === command.id);
    if (!old || lineKey(old.a, old.b) === lineKey(command.a, command.b)) return match;
    edges = edges.filter((e) => e.id !== old.id);
  }
  if (!isLegalLine(match.map, edges, command)) return match;
  return resolveTurn({
    ...match,
    edges: [...edges, { id: `e${match.nextId}`, owner: match.active, a: command.a, b: command.b }],
    nextId: match.nextId + 1,
    notice: command.type === 'draw' ? 'Connection drawn.' : 'Connection relocated.',
  });
}
