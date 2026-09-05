<script lang="ts">
  import type { GalaxyDuelMatch } from '../domain/galaxy-duel/model';
  export let match: GalaxyDuelMatch;
  export let scores: readonly [number, number];
  export let status: string;

  $: activePlayer = match.players[match.activePlayerIndex];
</script>

<header class="match-status">
  <div
    class="score"
    class:active={match.activePlayerIndex === 0}
    style:--player={match.players[0].color}
  >
    <div class="player-label">
      <span>{match.players[0].name}</span><small
        >{match.activePlayerIndex === 0 ? 'Your turn' : 'Up next'}</small
      >
    </div>
    <strong>{scores[0]}</strong>
  </div>
  <div class="turn-status" aria-live="polite" style:--player={activePlayer.color}>
    <span class="active-chip">Turn {match.turn}</span>
    {#if match.phase.kind === 'drawing-lines' || match.phase.kind === 'awaiting-end-turn'}
      <strong>{match.phase.committed}/{match.phase.quota}</strong><small>lines</small>
    {:else}<small class="rolling-label">Rolling…</small>{/if}
  </div>
  <div
    class="score right"
    class:active={match.activePlayerIndex === 1}
    style:--player={match.players[1].color}
  >
    <div class="player-label">
      <span>{match.players[1].name}</span><small
        >{match.activePlayerIndex === 1 ? 'Your turn' : 'Up next'}</small
      >
    </div>
    <strong>{scores[1]}</strong>
  </div>
</header>
<p class="sr-only" aria-live="polite">{status}</p>
