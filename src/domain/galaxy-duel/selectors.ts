import type { PlayerId, GalaxyDuelMatch } from './model';

export function activePlayer(match: GalaxyDuelMatch) {
  return match.players[match.activePlayerIndex];
}

export function scoreFor(match: GalaxyDuelMatch, playerId: PlayerId): number {
  return match.claims.filter((claim) => claim.playerId === playerId).length;
}

export function scores(match: GalaxyDuelMatch): readonly [number, number] {
  return [scoreFor(match, 'player-1'), scoreFor(match, 'player-2')];
}

export function resultLabel(match: GalaxyDuelMatch): string {
  if (match.phase.kind !== 'result') return '';
  const winnerId = match.phase.winnerId;
  if (!winnerId) return 'Draw';
  return `${match.players.find((player) => player.id === winnerId)?.name ?? winnerId} wins`;
}

export function visibleStatus(match: GalaxyDuelMatch): string {
  const player = activePlayer(match).name;
  switch (match.phase.kind) {
    case 'awaiting-roll':
      return `${player}, rolling…`;
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
