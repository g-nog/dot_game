import type { PlayerId, TriangleDuelMatch } from './model';

export function activePlayer(match: TriangleDuelMatch) {
  return match.players[match.activePlayerIndex];
}

export function scoreFor(match: TriangleDuelMatch, playerId: PlayerId): number {
  return match.claims.filter((claim) => claim.playerId === playerId).length;
}

export function scores(match: TriangleDuelMatch): readonly [number, number] {
  return [scoreFor(match, 'player-1'), scoreFor(match, 'player-2')];
}

export function resultLabel(match: TriangleDuelMatch): string {
  if (match.phase.kind !== 'result') return '';
  const winnerId = match.phase.winnerId;
  if (!winnerId) return 'Draw';
  return `${match.players.find((player) => player.id === winnerId)?.name ?? winnerId} wins`;
}

export function visibleStatus(match: TriangleDuelMatch): string {
  const player = activePlayer(match).name;
  switch (match.phase.kind) {
    case 'awaiting-roll':
      return `${player}, roll the die`;
    case 'drawing-lines':
      return `${player}: ${match.phase.committed} of ${match.phase.quota} lines`;
    case 'awaiting-end-turn':
      if (match.phase.reason === 'forfeited')
        return `No sequence can satisfy ${match.phase.quota}. End the forfeited turn.`;
      if (match.phase.reason === 'incomplete')
        return `No compatible continuation remains. End the incomplete turn.`;
      return `Quota complete. End the turn.`;
    case 'result': {
      const winnerId = match.phase.winnerId;
      return winnerId
        ? `${match.players.find((p) => p.id === winnerId)?.name} wins`
        : 'The match is a draw';
    }
  }
}
